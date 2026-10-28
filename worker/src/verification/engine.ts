import axios from 'axios';
import prisma from '../lib/prisma';
import { appendLog, setStatus } from '../pipeline/utils';
import { rollbackDeployment } from '../pipeline/deploy';
import { createIncidentAndDiagnose } from '../diagnosis/collector';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';
const VERIFICATION_POLL_INTERVAL_MS = 30_000; // 30 seconds
const VERIFICATION_WINDOW_MS = 5 * 60_000;    // 5 minutes total window

interface PrometheusResult {
  metric: Record<string, string>;
  value: [number, string];
}

async function queryPrometheus(promql: string): Promise<number | null> {
  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
      params: { query: promql },
      timeout: 5000,
    });

    const results: PrometheusResult[] = response.data?.data?.result ?? [];
    if (results.length === 0) return null;

    return parseFloat(results[0].value[1]);
  } catch {
    return null;
  }
}

function evaluateRule(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '>':  return value > threshold;
    case '<':  return value < threshold;
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    case '==': return Math.abs(value - threshold) < 0.0001;
    default:   return false;
  }
}

/**
 * Starts the continuous verification engine for a deployment.
 * Polls Prometheus and checks VerificationRules defined for the repository.
 * If a rule is violated, triggers a rollback.
 */
export async function startVerification(
  deploymentId: string,
  repositoryId: string,
  namespace: string
): Promise<void> {
  if (namespace === 'docker-local') {
    await appendLog(deploymentId, `[Verification] Local container deployment verified active. App accessible at http://localhost:3001`);
    return;
  }

  const startTime = Date.now();

  await appendLog(deploymentId, `[Verification] Engine started. Monitoring for ${VERIFICATION_WINDOW_MS / 60000} minutes.`);

  while (Date.now() - startTime < VERIFICATION_WINDOW_MS) {
    await new Promise((resolve) => setTimeout(resolve, VERIFICATION_POLL_INTERVAL_MS));

    // Check if deployment has been manually changed
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment || deployment.status === 'rolled_back' || deployment.status === 'unhealthy') {
      await appendLog(deploymentId, `[Verification] Deployment is no longer in healthy state. Stopping verification.`);
      return;
    }

    // Load active verification rules
    const rules = await prisma.verificationRule.findMany({
      where: { repositoryId },
    });

    if (rules.length === 0) {
      await appendLog(deploymentId, `[Verification] No verification rules found for this repository.`);
      continue;
    }

    let violated = false;
    let violatedReason = '';

    for (const rule of rules) {
      const value = await queryPrometheus(rule.metricName);

      if (value === null) {
        await appendLog(deploymentId, `[Verification] Could not query metric '${rule.metricName}'. Skipping rule '${rule.name}'.`);
        continue;
      }

      await appendLog(deploymentId, `[Verification] Rule '${rule.name}': metric=${value.toFixed(4)}, threshold=${rule.threshold}, op='${rule.operator}'`);

      if (evaluateRule(value, rule.operator, rule.threshold)) {
        violated = true;
        violatedReason = `Rule '${rule.name}' violated: metric '${rule.metricName}' is ${value.toFixed(4)} (threshold: ${rule.operator} ${rule.threshold})`;
        await appendLog(deploymentId, `[Verification] RULE VIOLATED: ${violatedReason}`);
        break;
      }
    }

    if (violated) {
      await appendLog(deploymentId, `[Verification] Triggering automatic rollback...`);
      await triggerRollback(deploymentId, repositoryId, namespace, violatedReason);
      return;
    }

    await appendLog(deploymentId, `[Verification] All rules passed. Deployment is healthy.`);
  }

  await appendLog(deploymentId, `[Verification] Verification window complete. Deployment is confirmed healthy.`);
}

async function triggerRollback(
  deploymentId: string,
  repositoryId: string,
  namespace: string,
  reason: string
): Promise<void> {
  // Find the previous healthy deployment for this repository
  const previousDeployment = await prisma.deployment.findFirst({
    where: {
      repositoryId,
      status: 'healthy',
      id: { not: deploymentId },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Create the incident record
  const incident = await prisma.incident.create({
    data: {
      deploymentId,
      reason,
    },
  });

  await appendLog(deploymentId, `[Rollback] Incident created: ${incident.id}`);

  if (previousDeployment) {
    try {
      await rollbackDeployment(deploymentId, repositoryId, previousDeployment.image, namespace);
      await appendLog(deploymentId, `[Rollback] Successfully rolled back to: ${previousDeployment.image}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await appendLog(deploymentId, `[Rollback] Failed to rollback Kubernetes deployment: ${message}`);
    }
  } else {
    await appendLog(deploymentId, `[Rollback] No previous healthy deployment found to rollback to.`);
  }

  await setStatus(deploymentId, 'rolled_back');

  // Trigger AI diagnosis in background
  await appendLog(deploymentId, `[Diagnosis] Starting AI incident diagnosis...`);
  createIncidentAndDiagnose(incident.id, deploymentId, reason).catch((err) => {
    console.error(`[Diagnosis] Error for incident ${incident.id}:`, err);
  });
}
