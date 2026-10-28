import Dockerode from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import { appendLog } from './utils';

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

/**
 * Auto-detects project type (Next.js, Node.js, static HTML) and creates a Dockerfile if missing
 */
async function ensureDockerfile(cloneDir: string, deploymentId: string): Promise<void> {
  const dockerfilePath = path.join(cloneDir, 'Dockerfile');
  if (fs.existsSync(dockerfilePath)) {
    await appendLog(deploymentId, '[BuildPack] Existing Dockerfile detected in repository.');
    return;
  }

  await appendLog(deploymentId, '[BuildPack] No Dockerfile found. Auto-detecting project type...');

  const packageJsonPath = path.join(cloneDir, 'package.json');
  let dockerfileContent = '';

  if (fs.existsSync(packageJsonPath)) {
    let pkg: Record<string, any> = {};
    try {
      pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch {
      pkg = {};
    }

    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    if (allDeps.next) {
      await appendLog(deploymentId, '[BuildPack] Detected Next.js project. Generating optimized Next.js Dockerfile...');
      dockerfileContent = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
`;
    } else {
      await appendLog(deploymentId, '[BuildPack] Detected Node.js project. Generating Node.js Dockerfile...');
      const startCmd = pkg.scripts?.start ? 'npm start' : 'node index.js';
      dockerfileContent = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
EXPOSE 3000
CMD [${startCmd.split(' ').map((s: string) => `"${s}"`).join(', ')}]
`;
    }
  } else if (fs.existsSync(path.join(cloneDir, 'index.html'))) {
    await appendLog(deploymentId, '[BuildPack] Detected static HTML project. Generating Nginx Dockerfile...');
    dockerfileContent = `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
  } else {
    await appendLog(deploymentId, '[BuildPack] Using default Node.js container...');
    dockerfileContent = `FROM node:20-alpine
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
`;
  }

  fs.writeFileSync(dockerfilePath, dockerfileContent, 'utf8');
  await appendLog(deploymentId, '[BuildPack] Auto-generated Dockerfile successfully.');

  // Create .dockerignore if missing
  const dockerignorePath = path.join(cloneDir, '.dockerignore');
  if (!fs.existsSync(dockerignorePath)) {
    fs.writeFileSync(dockerignorePath, 'node_modules\n.next\n.git\n', 'utf8');
  }
}

/**
 * Builds a Docker image from the given directory and pushes it to the registry.
 * Returns the full image tag.
 */
export async function buildAndPushImage(
  deploymentId: string,
  cloneDir: string,
  imageName: string,
  imageTag: string
): Promise<string> {
  // Prevent duplicate tags if imageName already has a tag
  const fullImageName = imageName.includes(':') ? imageName : `${imageName}:${imageTag}`;

  // Automatically generate Dockerfile if repository doesn't have one
  await ensureDockerfile(cloneDir, deploymentId);

  await appendLog(deploymentId, `Building Docker image: ${fullImageName}...`);

  // Build the image
  const buildStream = await docker.buildImage(
    { context: cloneDir, src: ['.'] },
    { t: fullImageName }
  );

  // Stream build logs to deployment logs
  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(
      buildStream,
      (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
      (event: { stream?: string; error?: string }) => {
        if (event.stream) {
          const line = event.stream.trim();
          if (line) {
            appendLog(deploymentId, `[Docker Build] ${line}`).catch(() => {});
          }
        }
        if (event.error) {
          appendLog(deploymentId, `[Docker Build ERROR] ${event.error}`).catch(() => {});
        }
      }
    );
  });

  await appendLog(deploymentId, `Image built successfully: ${fullImageName}`);

  // Push the image to the registry
  const registryUrl = process.env.REGISTRY_URL || '';
  const registryUser = process.env.REGISTRY_USER || '';
  const registryPassword = process.env.REGISTRY_PASSWORD || '';

  if (registryUrl && registryUser && registryPassword) {
    await appendLog(deploymentId, `Pushing image to registry: ${registryUrl}...`);

    const image = docker.getImage(fullImageName);
    const pushStream = await image.push({
      authconfig: {
        username: registryUser,
        password: registryPassword,
        serveraddress: registryUrl,
      },
    });

    await new Promise<void>((resolve, reject) => {
      docker.modem.followProgress(
        pushStream,
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
        (event: { status?: string; error?: string }) => {
          if (event.status) {
            appendLog(deploymentId, `[Push] ${event.status}`).catch(() => {});
          }
        }
      );
    });

    await appendLog(deploymentId, `Image pushed successfully.`);
  } else {
    await appendLog(deploymentId, `No registry configured. Skipping push. Image is available locally.`);
  }

  return fullImageName;
}
