import * as fs from 'fs';
import * as path from 'path';
import simpleGit from 'simple-git';
import { appendLog } from './utils';

/**
 * Clones a GitHub repository at a specific commit SHA into a temp directory.
 * Returns the path to the cloned directory.
 */
export async function cloneRepository(
  deploymentId: string,
  githubUrl: string,
  commitSha: string,
  githubToken?: string
): Promise<string> {
  const cloneDir = path.join('/tmp', `shipyard-${deploymentId}`);

  // Clean up any previous clone
  if (fs.existsSync(cloneDir)) {
    fs.rmSync(cloneDir, { recursive: true, force: true });
  }
  fs.mkdirSync(cloneDir, { recursive: true });

  // Build the authenticated clone URL
  let cloneUrl = githubUrl;
  if (githubToken && githubUrl.startsWith('https://')) {
    // Insert token into URL: https://token@github.com/user/repo.git
    cloneUrl = githubUrl.replace('https://', `https://${githubToken}@`);
  }

  await appendLog(deploymentId, `Cloning repository from ${githubUrl}...`);

  const git = simpleGit();

  try {
    await git.clone(cloneUrl, cloneDir, ['--depth', '50']);
    const clonedGit = simpleGit(cloneDir);

    if (/^[0-9a-f]{7,40}$/i.test(commitSha) && !commitSha.startsWith('manual-')) {
      await clonedGit.checkout(commitSha);
      await appendLog(deploymentId, `Checked out commit ${commitSha.substring(0, 7)}.`);
    } else {
      const log = await clonedGit.log(['-n', '1']);
      const currentSha = log.latest?.hash || 'HEAD';
      await appendLog(deploymentId, `Checked out latest commit ${currentSha.substring(0, 7)}.`);
    }

    await appendLog(deploymentId, `Repository cloned successfully.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await appendLog(deploymentId, `ERROR: Failed to clone repository. ${message}`);
    throw new Error(`Clone failed: ${message}`);
  }

  return cloneDir;
}

/**
 * Cleans up the cloned repository directory.
 */
export function cleanupClone(cloneDir: string): void {
  if (fs.existsSync(cloneDir)) {
    fs.rmSync(cloneDir, { recursive: true, force: true });
  }
}
