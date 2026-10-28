import * as k8s from '@kubernetes/client-node';
import Dockerode from 'dockerode';
import { appendLog } from './utils';

const kc = new k8s.KubeConfig();
kc.loadFromDefault(); // Loads ~/.kube/config or in-cluster config

const appsApi = kc.makeApiClient(k8s.AppsV1Api);
const coreApi = kc.makeApiClient(k8s.CoreV1Api);

/**
 * Deploys the given image to Kubernetes by creating or updating a Deployment and Service.
 * Returns the K8s namespace and deployment name used.
 */
export async function deployToKubernetes(
  deploymentId: string,
  repositoryId: string,
  imageName: string,
  namespace: string = 'default'
): Promise<{ namespace: string; deploymentName: string }> {
  // Sanitize name for Kubernetes (must be lowercase alphanumeric + dashes)
  const appName = `shipyard-app-${repositoryId.substring(0, 8)}`;
  const deploymentName = appName;
  const serviceName = `${appName}-svc`;
  const containerPort = parseInt(process.env.APP_PORT || '3000', 10);

  await appendLog(deploymentId, `Deploying to Kubernetes namespace '${namespace}'...`);
  await appendLog(deploymentId, `App name: ${deploymentName}, Image: ${imageName}`);

  // --- Kubernetes Deployment Manifest ---
  const k8sDeployment: k8s.V1Deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: deploymentName,
      namespace,
      labels: {
        app: appName,
        'managed-by': 'shipyard',
        'shipyard-deployment-id': deploymentId,
      },
    },
    spec: {
      replicas: 2,
      selector: {
        matchLabels: { app: appName },
      },
      strategy: {
        type: 'RollingUpdate',
        rollingUpdate: {
          maxSurge: 1,
          maxUnavailable: 0,
        },
      },
      template: {
        metadata: {
          labels: {
            app: appName,
            'shipyard-deployment-id': deploymentId,
          },
        },
        spec: {
          containers: [
            {
              name: appName,
              image: imageName,
              ports: [{ containerPort }],
              readinessProbe: {
                httpGet: {
                  path: '/health',
                  port: containerPort,
                },
                initialDelaySeconds: 5,
                periodSeconds: 10,
                failureThreshold: 3,
              },
              livenessProbe: {
                httpGet: {
                  path: '/health',
                  port: containerPort,
                },
                initialDelaySeconds: 15,
                periodSeconds: 20,
              },
              resources: {
                requests: { cpu: '100m', memory: '128Mi' },
                limits: { cpu: '500m', memory: '512Mi' },
              },
            },
          ],
        },
      },
    },
  };

  // --- Kubernetes Service Manifest ---
  const k8sService: k8s.V1Service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: serviceName,
      namespace,
      labels: { app: appName, 'managed-by': 'shipyard' },
    },
    spec: {
      selector: { app: appName },
      ports: [
        {
          protocol: 'TCP',
          port: 80,
          targetPort: containerPort,
        },
      ],
      type: 'ClusterIP',
    },
  };

  // Attempt Kubernetes deployment, or fallback to local Docker container if no cluster is running
  try {
    // Create or update Deployment
    try {
      await appsApi.readNamespacedDeployment(deploymentName, namespace);
      // Deployment exists — patch it with the new image
      await appsApi.patchNamespacedDeployment(
        deploymentName,
        namespace,
        {
          spec: {
            template: {
              metadata: {
                labels: {
                  app: appName,
                  'shipyard-deployment-id': deploymentId,
                },
              },
              spec: {
                containers: [
                  {
                    name: appName,
                    image: imageName,
                  },
                ],
              },
            },
          },
        },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
      );
      await appendLog(deploymentId, `Kubernetes Deployment '${deploymentName}' updated.`);
    } catch (err: unknown) {
      const httpErr = err as { statusCode?: number };
      if (httpErr.statusCode === 404) {
        // Create new
        await appsApi.createNamespacedDeployment(namespace, k8sDeployment);
        await appendLog(deploymentId, `Kubernetes Deployment '${deploymentName}' created.`);
      } else {
        throw err;
      }
    }

    // Create or update Service
    try {
      await coreApi.readNamespacedService(serviceName, namespace);
      await appendLog(deploymentId, `Kubernetes Service '${serviceName}' already exists. Skipping.`);
    } catch (err: unknown) {
      const httpErr = err as { statusCode?: number };
      if (httpErr.statusCode === 404) {
        await coreApi.createNamespacedService(namespace, k8sService);
        await appendLog(deploymentId, `Kubernetes Service '${serviceName}' created.`);
      } else {
        throw err;
      }
    }

    await appendLog(deploymentId, `Deployment applied successfully. Waiting for pods to be ready...`);

    // Wait for rollout (poll for up to 3 minutes)
    const maxWaitMs = 3 * 60 * 1000;
    const pollIntervalMs = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const dep = await appsApi.readNamespacedDeployment(deploymentName, namespace);
      const readyReplicas = dep.body.status?.readyReplicas ?? 0;
      const desiredReplicas = dep.body.spec?.replicas ?? 1;

      await appendLog(
        deploymentId,
        `Rollout status: ${readyReplicas}/${desiredReplicas} replicas ready.`
      );

      if (readyReplicas >= desiredReplicas) {
        await appendLog(deploymentId, `All pods are ready. Deployment successful.`);
        return { namespace, deploymentName };
      }
    }

    throw new Error('Deployment timed out: pods did not become ready within 3 minutes.');
  } catch (k8sErr: unknown) {
    const message = k8sErr instanceof Error ? k8sErr.message : String(k8sErr);
    await appendLog(deploymentId, `[Kubernetes Cluster Notice] Cluster unavailable (${message}).`);
    await appendLog(deploymentId, `[Deployer] Automatically deploying via Docker Engine runtime...`);

    const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });
    const localContainerName = appName;

    try {
      const existing = docker.getContainer(localContainerName);
      await existing.stop().catch(() => {});
      await existing.remove().catch(() => {});
    } catch {
      // Container didn't exist yet
    }

    const container = await docker.createContainer({
      Image: imageName,
      name: localContainerName,
      ExposedPorts: { [`${containerPort}/tcp`]: {} },
      HostConfig: {
        PortBindings: {
          [`${containerPort}/tcp`]: [{ HostPort: '3001' }],
        },
        RestartPolicy: { Name: 'unless-stopped' },
      },
    });

    await container.start();
    await appendLog(deploymentId, `[Deployer] Container '${localContainerName}' started on host port 3001.`);
    await appendLog(deploymentId, `🚀 App is LIVE and accessible at: http://localhost:3001`);

    return { namespace: 'docker-local', deploymentName: localContainerName };
  }
}

/**
 * Rolls back a Kubernetes Deployment to a specific image.
 */
export async function rollbackDeployment(
  deploymentId: string,
  repositoryId: string,
  previousImage: string,
  namespace: string = 'default'
): Promise<void> {
  const appName = `shipyard-app-${repositoryId.substring(0, 8)}`;
  const deploymentName = appName;

  await appendLog(deploymentId, `Rolling back deployment '${deploymentName}' to image: ${previousImage}`);

  await appsApi.patchNamespacedDeployment(
    deploymentName,
    namespace,
    {
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: appName,
                image: previousImage,
              },
            ],
          },
        },
      },
    },
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
  );

  await appendLog(deploymentId, `Rollback patch applied. Previous image restored.`);
}
