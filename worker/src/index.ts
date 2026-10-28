import dotenv from 'dotenv';
dotenv.config();

import Bull from 'bull';
import { runPipeline } from './pipeline/run';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const deploymentQueue = new Bull('deployment-queue', REDIS_URL);

console.log('[Worker] Shipyard Pipeline Worker starting...');
console.log('[Worker] Connecting to Redis:', REDIS_URL);

deploymentQueue.process(async (job) => {
  const { deploymentId, repositoryId, commitSha, commitMessage, branch, githubUrl, githubToken, image } = job.data;

  console.log(`[Worker] Processing deployment job: ${deploymentId}`);

  try {
    await runPipeline({
      deploymentId,
      repositoryId,
      commitSha,
      commitMessage,
      branch,
      githubUrl,
      githubToken,
      image,
    });
  } catch (err) {
    console.error(`[Worker] Pipeline failed for deployment ${deploymentId}:`, err);
    throw err; // Bull will mark the job as failed
  }
});

deploymentQueue.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
});

deploymentQueue.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed:`, err.message);
});

console.log('[Worker] Listening for deployment jobs...');
