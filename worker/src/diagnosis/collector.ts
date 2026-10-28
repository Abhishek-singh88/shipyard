import * as k8s from '@kubernetes/client-node';
import axios from 'axios';
import prisma from '../lib/prisma';
import { appendLog } from '../pipeline/utils';

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

export interface DiagnosisEvidence {
  podLogs: string;
  recentEvents: string;
  metrics: string;
  reason: string;
}

/**
 * Collects evidence for a failed deployment:
 * - Pod logs (last 100 lines)
 * - Kubernetes events
 * - Relevant Prometheus metrics
 */
export async function collectEvidence(
  deploymentId: string,
  repositoryId: string,
  namespace: string,
  reason: string
): Promise<DiagnosisEvidence> {
  const appName = `shipyard-app-${repositoryId.substring(0, 8)}`;

  await appendLog(deploymentId, `[Diagnosis] Collecting evidence from namespace '${namespace}'...`);

  // --- Collect pod logs ---
  let podLogs = 'Could not retrieve pod logs.';
  try {
    const podList = await coreApi.listNamespacedPod(
      namespace,
      undefined, undefined, undefined, undefined,
      `app=${appName}`
    );

    const pods = podList.body.items;
    if (pods.length > 0) {
      const podName = pods[0].metadata?.name || '';
      const logResponse = await coreApi.readNamespacedPodLog(
        podName,
        namespace,
        undefined, // container name
        undefined, // follow
        undefined, // insecureSkipTLSVerifyBackend
        undefined, // limitBytes
        undefined, // pretty
        undefined, // previous
        undefined, // sinceSeconds
        100        // tailLines
      );
      podLogs = typeof logResponse.body === 'string' ? logResponse.body : JSON.stringify(logResponse.body);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    podLogs = `Failed to retrieve pod logs: ${message}`;
  }

  // --- Collect Kubernetes events ---
  let recentEvents = 'Could not retrieve Kubernetes events.';
  try {
    const eventList = await coreApi.listNamespacedEvent(
      namespace,
      undefined, undefined, undefined,
      `involvedObject.name=${appName}`
    );

    const events = eventList.body.items
      .slice(-20)
      .map((e) => `[${e.type}] ${e.reason}: ${e.message}`)
      .join('\n');
    recentEvents = events || 'No recent events found.';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recentEvents = `Failed to retrieve events: ${message}`;
  }

  // --- Collect Prometheus metrics ---
  let metrics = 'Could not retrieve metrics.';
  try {
    const queries = [
      `rate(http_requests_total{status=~"5.."}[5m])`,
      `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`,
      `container_memory_usage_bytes{namespace="${namespace}"}`,
      `rate(container_cpu_usage_seconds_total{namespace="${namespace}"}[5m])`,
    ];

    const results: string[] = [];
    for (const query of queries) {
      try {
        const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
          params: { query },
          timeout: 5000,
        });
        const resultData = response.data?.data?.result ?? [];
        if (resultData.length > 0) {
          results.push(`Query: ${query}\nResult: ${JSON.stringify(resultData.slice(0, 3))}`);
        }
      } catch {
        // Skip individual query failures
      }
    }

    metrics = results.length > 0 ? results.join('\n\n') : 'No metric data available.';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    metrics = `Failed to retrieve metrics: ${message}`;
  }

  await appendLog(deploymentId, `[Diagnosis] Evidence collected successfully.`);

  return { podLogs, recentEvents, metrics, reason };
}

/**
 * Orchestrates evidence collection and AI diagnosis, then saves the Diagnosis record.
 */
export async function createIncidentAndDiagnose(
  incidentId: string,
  deploymentId: string,
  reason: string
): Promise<void> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { repository: true },
  });

  if (!deployment) {
    console.error(`[Diagnosis] Deployment ${deploymentId} not found.`);
    return;
  }

  const evidence = await collectEvidence(
    deploymentId,
    deployment.repositoryId,
    deployment.namespace,
    reason
  );

  // Import here to avoid circular deps
  const { diagnoseWithGemini } = await import('./gemini');
  await diagnoseWithGemini(incidentId, deploymentId, deployment, evidence);
}
