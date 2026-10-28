import prisma from '../lib/prisma';
import { cloneRepository, cleanupClone } from './clone';
import { buildAndPushImage } from './build';
import { deployToKubernetes } from './deploy';
import { setStatus, appendLog } from './utils';
import { startVerification } from '../verification/engine';

export interface PipelineInput {
  deploymentId: string;
  repositoryId: string;
  commitSha: string;
  commitMessage: string;
  branch: string;
  githubUrl: string;
  githubToken?: string;
  image: string;
}

/**
 * Orchestrates the full deployment pipeline:
 * 1. Clone repository
 * 2. Build Docker image
 * 3. Push image
 * 4. Deploy to Kubernetes
 * 5. Start post-deployment verification
 */
export async function runPipeline(input: PipelineInput): Promise<void> {
  const { deploymentId, repositoryId, commitSha, commitMessage, githubUrl, githubToken, image } = input;

  let cloneDir: string | null = null;

  try {
    // --- Step 1: Clone ---
    await setStatus(deploymentId, 'building');
    await appendLog(deploymentId, '=== SHIPYARD PIPELINE STARTED ===');
    await appendLog(deploymentId, `Deployment ID: ${deploymentId}`);
    await appendLog(deploymentId, `Commit: ${commitSha.substring(0, 7)} — ${commitMessage}`);

    cloneDir = await cloneRepository(deploymentId, githubUrl, commitSha, githubToken);

    // --- Step 2 & 3: Build and Push ---
    const imageTag = commitSha.substring(0, 7);
    const rawImage = image || `shipyard/${repositoryId.substring(0, 8)}`;
    const baseImageName = rawImage.includes(':') ? rawImage.split(':')[0] : rawImage;
    const fullImage = await buildAndPushImage(deploymentId, cloneDir, baseImageName, imageTag);

    // Update deployment with image name
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { image: fullImage },
    });

    // --- Step 4: Deploy to Kubernetes ---
    await setStatus(deploymentId, 'deploying');
    const { namespace } = await deployToKubernetes(deploymentId, repositoryId, fullImage);

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { namespace },
    });

    // --- Mark as healthy initially ---
    await setStatus(deploymentId, 'healthy');
    await appendLog(deploymentId, '=== PIPELINE COMPLETED SUCCESSFULLY ===');

    // --- Step 5: Start post-deployment verification ---
    await appendLog(deploymentId, 'Starting continuous verification engine...');
    startVerification(deploymentId, repositoryId, namespace).catch((err) => {
      console.error(`[Verification] Error for deployment ${deploymentId}:`, err);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await appendLog(deploymentId, `=== PIPELINE FAILED: ${message} ===`);
    await setStatus(deploymentId, 'unhealthy');
    throw err;
  } finally {
    if (cloneDir) {
      cleanupClone(cloneDir);
    }
  }
}
