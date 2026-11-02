import Bull from 'bull';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export interface DeploymentJobData {
  deploymentId: string;
  repositoryId: string;
  commitSha: string;
  commitMessage: string;
  branch: string;
  githubUrl: string;
  githubToken?: string;
  image: string;
}

export const deploymentQueue = new Bull<DeploymentJobData>('deployment-queue', REDIS_URL);
