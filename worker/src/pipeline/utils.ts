import prisma from '../lib/prisma';

/**
 * Appends a log line to a deployment's logs field.
 * Uses raw SQL for efficient string concatenation without a full read.
 */
export async function appendLog(deploymentId: string, message: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  console.log(`[Pipeline/${deploymentId.substring(0, 8)}] ${message}`);

  try {
    await prisma.$executeRaw`
      UPDATE "Deployment"
      SET logs = logs || ${logLine}
      WHERE id = ${deploymentId}
    `;
  } catch (err) {
    // Non-fatal: log to console but don't throw
    console.error(`[appendLog] Failed to write log for ${deploymentId}:`, err);
  }
}

/**
 * Updates the status field of a deployment.
 */
export async function setStatus(deploymentId: string, status: string): Promise<void> {
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status, updatedAt: new Date() },
  });
  console.log(`[Status] Deployment ${deploymentId.substring(0, 8)} -> ${status}`);
}
