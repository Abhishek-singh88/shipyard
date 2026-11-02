import express, { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { deploymentQueue } from '../lib/queue';

const router = Router();

// POST /github: Receives GitHub push webhook
router.post(
  '/github',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // 1. Obtain raw body buffer
      let rawBodyBuffer: Buffer;
      if (Buffer.isBuffer(req.body)) {
        rawBodyBuffer = req.body;
      } else if ((req as Request & { rawBody?: Buffer }).rawBody) {
        rawBodyBuffer = (req as Request & { rawBody?: Buffer }).rawBody!;
      } else if (typeof req.body === 'string') {
        rawBodyBuffer = Buffer.from(req.body, 'utf8');
      } else {
        rawBodyBuffer = Buffer.from(JSON.stringify(req.body || {}), 'utf8');
      }

      // 2. Parse JSON payload
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(rawBodyBuffer.toString('utf8'));
      } catch (parseErr) {
        res.status(400).json({ error: 'Invalid JSON payload' });
        return;
      }

      // Handle ping event from GitHub webhook configuration
      if (payload.zen && !payload.repository) {
        res.status(200).json({ message: 'GitHub ping event received successfully' });
        return;
      }

      const repoPayload = payload.repository as Record<string, unknown> | undefined;
      if (!repoPayload) {
        res.status(400).json({ error: 'Missing repository information in payload' });
        return;
      }

      // 3. Match repository by URL candidates
      const candidateUrls: string[] = [];
      if (typeof repoPayload.clone_url === 'string') candidateUrls.push(repoPayload.clone_url);
      if (typeof repoPayload.html_url === 'string') candidateUrls.push(repoPayload.html_url);
      if (typeof repoPayload.git_url === 'string') candidateUrls.push(repoPayload.git_url);
      if (typeof repoPayload.url === 'string') candidateUrls.push(repoPayload.url);
      if (typeof repoPayload.full_name === 'string') {
        candidateUrls.push(`https://github.com/${repoPayload.full_name}`);
        candidateUrls.push(`https://github.com/${repoPayload.full_name}.git`);
      }

      const normalizedSet = new Set<string>();
      for (const rawUrl of candidateUrls) {
        const trimmed = rawUrl.trim();
        normalizedSet.add(trimmed);
        const noSlash = trimmed.replace(/\/+$/, '');
        normalizedSet.add(noSlash);
        const noGit = noSlash.replace(/\.git$/, '');
        normalizedSet.add(noGit);
        normalizedSet.add(`${noGit}.git`);
      }
      const lookupUrls = Array.from(normalizedSet);

      const repository = await prisma.repository.findFirst({
        where: {
          githubUrl: {
            in: lookupUrls,
          },
        },
      });

      if (!repository) {
        res.status(404).json({ error: 'Matching repository not found' });
        return;
      }

      // 4. Verify HMAC-SHA256 signature if webhookSecret is configured
      if (repository.webhookSecret) {
        const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;

        if (!signatureHeader) {
          res.status(401).json({ error: 'Missing X-Hub-Signature-256 signature header' });
          return;
        }

        const hmac = crypto.createHmac('sha256', repository.webhookSecret);
        const calculatedDigest = `sha256=${hmac.update(rawBodyBuffer).digest('hex')}`;

        const sigBuffer = Buffer.from(signatureHeader, 'utf8');
        const digestBuffer = Buffer.from(calculatedDigest, 'utf8');

        if (sigBuffer.length !== digestBuffer.length || !crypto.timingSafeEqual(sigBuffer, digestBuffer)) {
          res.status(401).json({ error: 'Invalid HMAC signature' });
          return;
        }
      }

      // 5. Extract commitSha, commitMessage, and branch
      const headCommit = payload.head_commit as Record<string, unknown> | undefined;
      const commitSha = (headCommit?.id as string) || (payload.after as string) || 'unknown';
      const commitMessage = (headCommit?.message as string) || 'Webhook push deployment';

      let branch = repository.branch || 'main';
      if (typeof payload.ref === 'string') {
        branch = payload.ref.replace(/^refs\/heads\//, '');
      }

      // 6. Create a new Deployment record with status 'pending'
      const shortSha = commitSha.substring(0, 7);
      const version = `v-${shortSha}`;
      const sanitizedRepoName = repository.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const image = `shipyard/${sanitizedRepoName}:${shortSha}`;

      const deployment = await prisma.deployment.create({
        data: {
          version,
          image,
          commitSha,
          commitMessage,
          branch,
          status: 'pending',
          logs: '',
          namespace: 'default',
          repositoryId: repository.id,
        },
      });

      // 7. Enqueue a Bull job into deployment-queue
      await deploymentQueue.add({
        deploymentId: deployment.id,
        repositoryId: repository.id,
        commitSha,
        commitMessage,
        branch,
        githubUrl: repository.githubUrl,
        githubToken: repository.githubToken ?? undefined,
        image: deployment.image,
      });

      // 8. Return 200 OK
      res.status(200).json({
        message: 'Deployment triggered successfully',
        deploymentId: deployment.id,
        status: deployment.status,
      });
    } catch (err) {
      console.error('[Webhook] Error handling GitHub webhook:', err);
      res.status(500).json({ error: 'Failed to process GitHub webhook' });
    }
  }
);

export default router;
