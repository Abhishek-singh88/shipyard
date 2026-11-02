import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { deploymentQueue } from '../lib/queue';

const router = Router();

const createRepoValidation = [
  body('name').trim().notEmpty().withMessage('Repository name is required'),
  body('githubUrl').trim().notEmpty().withMessage('GitHub repository URL is required'),
  body('branch').optional().trim().notEmpty().withMessage('Branch cannot be empty'),
  body('githubToken').optional({ nullable: true }).isString(),
  body('webhookSecret').optional({ nullable: true }).isString(),
];

// GET /: list all repos for req.userId, include latest deployment for each
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const repositories = await prisma.repository.findMany({
      where: {
        userId: req.userId,
      },
      include: {
        deployments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        verificationRules: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(repositories);
  } catch (err) {
    console.error('[Repositories] Error fetching repositories:', err);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// POST /: create new repo and default VerificationRules (error rate and latency)
router.post('/', createRepoValidation, async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg });
    return;
  }

  const { name, githubUrl, branch, githubToken, webhookSecret } = req.body;

  try {
    const repository = await prisma.repository.create({
      data: {
        name,
        githubUrl,
        branch: branch && branch.trim().length > 0 ? branch.trim() : 'main',
        githubToken: githubToken || null,
        webhookSecret: webhookSecret || null,
        userId: req.userId,
        verificationRules: {
          create: [
            {
              name: 'Error Rate < 5%',
              metricName: 'http_requests_error_rate',
              operator: '<',
              threshold: 5.0,
              duration: 60,
            },
            {
              name: 'P95 Latency < 500ms',
              metricName: 'http_request_duration_p95',
              operator: '<',
              threshold: 500.0,
              duration: 60,
            },
          ],
        },
      },
      include: {
        verificationRules: true,
        deployments: true,
      },
    });

    res.status(201).json(repository);
  } catch (err) {
    console.error('[Repositories] Error creating repository:', err);
    res.status(500).json({ error: 'Failed to create repository' });
  }
});

// GET /:id: get single repo (must belong to user), include all deployments ordered by createdAt desc
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        deployments: {
          orderBy: { createdAt: 'desc' },
          include: {
            incidents: {
              include: {
                diagnoses: true,
              },
            },
          },
        },
        verificationRules: true,
      },
    });

    if (!repository) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    res.status(200).json(repository);
  } catch (err) {
    console.error(`[Repositories] Error fetching repository ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to fetch repository' });
  }
});

// DELETE /:id: delete repo and cascade
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    await prisma.repository.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({ message: 'Repository deleted successfully' });
  } catch (err) {
    console.error(`[Repositories] Error deleting repository ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to delete repository' });
  }
});

// POST /:id/deploy: manually trigger deployment for a repository
router.post('/:id/deploy', async (req: Request, res: Response): Promise<void> => {
  try {
    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!repository) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    const version = `v1.0.${Date.now().toString().slice(-4)}`;
    const commitSha = 'manual-' + Date.now().toString(16).slice(-7);
    const image = `shipyard/${repository.id.substring(0, 8)}:${commitSha}`;

    const deployment = await prisma.deployment.create({
      data: {
        version,
        image,
        status: 'pending',
        logs: '',
        namespace: 'default',
        repositoryId: repository.id,
        commitSha,
        commitMessage: 'Manual deployment triggered from dashboard',
        branch: repository.branch || 'main',
      },
    });

    await deploymentQueue.add({
      deploymentId: deployment.id,
      repositoryId: repository.id,
      commitSha,
      commitMessage: deployment.commitMessage || 'Manual deployment',
      branch: deployment.branch || 'main',
      githubUrl: repository.githubUrl,
      githubToken: repository.githubToken || undefined,
      image: `shipyard/${repository.id.substring(0, 8)}`,
    });

    res.status(201).json(deployment);
  } catch (err) {
    console.error(`[Repositories] Error triggering deployment for repo ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to trigger deployment' });
  }
});

export default router;
