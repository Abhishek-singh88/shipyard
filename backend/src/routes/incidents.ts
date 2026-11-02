import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /: list all incidents for repos owned by req.userId, ordered by createdAt desc
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const incidents = await prisma.incident.findMany({
      where: {
        deployment: {
          repository: {
            userId: req.userId,
          },
        },
      },
      include: {
        deployment: {
          include: {
            repository: true,
          },
        },
        diagnoses: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(incidents);
  } catch (err) {
    console.error('[Incidents] Error fetching incidents:', err);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// GET /:id: get single incident with full diagnosis
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const incident = await prisma.incident.findFirst({
      where: {
        id: req.params.id,
        deployment: {
          repository: {
            userId: req.userId,
          },
        },
      },
      include: {
        deployment: {
          include: {
            repository: true,
          },
        },
        diagnoses: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.status(200).json(incident);
  } catch (err) {
    console.error(`[Incidents] Error fetching incident ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

// POST /simulate: simulate a production incident with autonomous Gemini AI diagnosis
interface IncidentScenario {
  title: string;
  commitMessage: string;
  reason: string;
  podLogs: string;
  telemetry: string;
  evidence: {
    reason: string;
    podLogs: string;
    recentEvents: string;
    metrics: string;
  };
  fallbackOutput: string;
}

const INCIDENT_SCENARIOS: IncidentScenario[] = [
  {
    title: 'Database Connection Pool Exhaustion',
    commitMessage: 'feat(db): optimize batch record lookups and connection reuse',
    reason: "Rule 'P95 Latency < 500ms' violated: measured latency is 1420ms (threshold: < 500ms) with elevated HTTP 500 error rate (8.4%)",
    podLogs: `[ERROR] 2026-10-29T21:40:12Z connection pool exhausted: maximum 10 clients reached
[ERROR] 2026-10-29T21:40:15Z unhandled promise rejection: connect ETIMEDOUT 10.96.0.1:5432
[WARN] 2026-10-29T21:40:22Z Readiness probe failed: HTTP 503 Service Unavailable (response time 1850ms)`,
    telemetry: `- http_request_duration_p95: 1.42s (Threshold: 0.5s)
- http_requests_error_rate: 8.4% (Threshold: 5.0%)
- db_connection_pool_saturation: 100% (10/10 active connections)`,
    evidence: {
      reason: "Rule 'P95 Latency < 500ms' violated: measured latency is 1420ms (threshold: < 500ms) with elevated HTTP 500 error rate (8.4%)",
      podLogs: "[ERROR] connection pool exhausted: maximum 10 clients reached\n[ERROR] connect ETIMEDOUT 10.96.0.1:5432\n[WARN] Readiness probe failed: HTTP 503 Service Unavailable",
      recentEvents: "[Warning] Unhealthy: Readiness probe failed\n[Warning] BackOff: restarting container",
      metrics: "P95 Latency: 1.42s\nHTTP Error Rate: 8.4%\nDB Connections: 10/10 (100% saturation)",
    },
    fallbackOutput: `### Root Cause Summary
Database connection pool exhaustion caused incoming queries to queue and time out. As pending queries waited for free sockets, latency spiked to 1.42s and HTTP 500 errors surged to 8.4%.

### Key Evidence
- Pod Log: \`connection pool exhausted: maximum 10 clients reached\`
- Metrics: Latency P95 spiked to 1.42s (SLO limit: 0.5s) with 10/10 pool sockets occupied.

### Recommended Fix
Increase the pool limit in your database connection string (e.g. \`?connection_limit=30\`) and wrap all Prisma/PostgreSQL queries in \`try/finally\` blocks to guarantee connection release.`,
  },
  {
    title: 'Memory Leak & Heap Exhaustion (OOMKilled)',
    commitMessage: 'feat(cache): implement in-memory static page and response caching',
    reason: "Rule 'Container Memory < 80%' violated: memory footprint reached 508MiB (99.2% limit) triggering OOM crash",
    podLogs: `[WARN] 2026-10-29T22:12:04Z Garbage collector struggling: GC pause duration 640ms
[FATAL] 2026-10-29T22:12:11Z <--- Last few GCs ---> [1:0x5608] 1420 ms: Mark-Compact 502.4 MB -> 501.9 MB
[FATAL] 2026-10-29T22:12:12Z JavaScript heap out of memory (Allocation failed - process killed by SIGKILL exit 137)`,
    telemetry: `- container_memory_usage_bytes: 508MiB / 512MiB (99.2% Limit reached)
- http_request_duration_p95: 2.15s (Threshold: 0.5s)
- container_restarts_total: 4 restarts within 90 seconds`,
    evidence: {
      reason: "Rule 'Container Memory < 80%' violated: memory footprint reached 508MiB (99.2% limit) triggering OOM crash",
      podLogs: "[WARN] GC pause duration 640ms\n[FATAL] JavaScript heap out of memory - process killed by SIGKILL exit 137",
      recentEvents: "[Warning] OOMKilled: Container terminated by kernel out-of-memory killer\n[Warning] CrashLoopBackOff: back-off 40s restarting failed container",
      metrics: "Memory: 508MiB / 512MiB (99.2%)\nP95 Latency: 2.15s\nContainer Restarts: 4",
    },
    fallbackOutput: `### Root Cause Summary
An unbounded in-memory cache accumulated cached responses in V8 heap memory without an eviction policy (TTL/LRU), triggering an Out-Of-Memory (OOM) SIGKILL 137 kernel crash.

### Key Evidence
- Pod Log: \`JavaScript heap out of memory (Allocation failed - process killed by SIGKILL exit 137)\`
- Telemetry: Memory consumption pinned at 508MiB / 512MiB (99.2%).

### Recommended Fix
Replace the raw Javascript object cache with a bounded LRU cache (e.g., \`lru-cache\` with \`max: 500\`) or offload to Redis. Increase pod memory limits to 1GiB.`,
  },
  {
    title: 'Upstream Microservice Timeout & Cascading 504 Failure',
    commitMessage: 'feat(billing): integrate external checkout and verification API',
    reason: "Rule 'HTTP Error Rate < 5.0%' violated: 5xx error rate elevated to 24.8% due to upstream timeout",
    podLogs: `[ERROR] 2026-10-29T22:25:30Z AxiosError: timeout of 5000ms exceeded calling https://api.billing-upstream.net/v2/verify
[ERROR] 2026-10-29T22:25:34Z HTTP 504 Gateway Timeout returned to client
[WARN] 2026-10-29T22:25:40Z High request queue backlog: 142 requests waiting for external dependency`,
    telemetry: `- http_requests_error_rate: 24.8% (Threshold: 5.0%)
- http_request_duration_p95: 5.20s (Threshold: 0.5s)
- external_service_availability: 0% (Circuit open)`,
    evidence: {
      reason: "Rule 'HTTP Error Rate < 5.0%' violated: 5xx error rate elevated to 24.8% due to upstream timeout",
      podLogs: "[ERROR] timeout of 5000ms exceeded calling https://api.billing-upstream.net/v2/verify\n[ERROR] HTTP 504 Gateway Timeout returned to client",
      recentEvents: "[Warning] HighErrorRate: Error rate exceeded 20% threshold\n[Normal] TrafficReroute: Rerouting traffic back to baseline",
      metrics: "HTTP Error Rate: 24.8%\nP95 Latency: 5.20s\nUpstream Timeouts: 142 reqs",
    },
    fallbackOutput: `### Root Cause Summary
The new release introduced a synchronous blocking HTTP call to an external payment/billing provider without a circuit breaker or timeout fallback. When the third-party API hung, incoming user requests queued and failed with HTTP 504 Gateway Timeouts.

### Key Evidence
- Pod Log: \`AxiosError: timeout of 5000ms exceeded calling https://api.billing-upstream.net/v2/verify\`
- Telemetry: HTTP Error rate spiked to 24.8% and P95 latency jumped to 5.2s.

### Recommended Fix
Implement the Circuit Breaker pattern (e.g. using \`opossum\`), set tight timeouts (1500ms max) with cached fallback responses, and process non-critical billing verification asynchronously via background Bull queues.`,
  },
  {
    title: 'CPU Saturation & ReDoS (Regular Expression Denial of Service)',
    commitMessage: 'refactor(validation): add nested regex parsing for complex payloads',
    reason: "Rule 'CPU Throttling < 10%' violated: container throttled at 91.5% with Event Loop lag > 2800ms",
    podLogs: `[WARN] 2026-10-29T22:38:15Z Node.js Event Loop Lag: 2840ms (Normal: < 20ms)
[WARN] 2026-10-29T22:38:19Z Health check probe timeout: HTTP 500 Internal Server Error (did not respond in 2000ms)
[ERROR] 2026-10-29T22:38:22Z Request processing starved: CPU quota exceeded (1000m / 1000m CPU limit)`,
    telemetry: `- container_cpu_cfs_throttled_ratio: 91.5% (Threshold: 10.0%)
- nodejs_eventloop_lag_seconds: 2.84s (Threshold: 0.05s)
- http_request_duration_p95: 3.12s (Threshold: 0.5s)`,
    evidence: {
      reason: "Rule 'CPU Throttling < 10%' violated: container throttled at 91.5% with Event Loop lag > 2800ms",
      podLogs: "[WARN] Node.js Event Loop Lag: 2840ms\n[WARN] Health check probe timeout: HTTP 500\n[ERROR] CPU quota exceeded (1000m / 1000m CPU limit)",
      recentEvents: "[Warning] Unhealthy: Liveness probe failed: HTTP 500\n[Warning] NodeThrottling: CFS bandwidth quota limit hit",
      metrics: "CPU Throttling: 91.5%\nEvent Loop Lag: 2.84s\nP95 Latency: 3.12s",
    },
    fallbackOutput: `### Root Cause Summary
A catastrophic backtracking regular expression (ReDoS) executed on incoming payload validation completely blocked the single-threaded Node.js event loop, driving CPU utilization to 100% and delaying event processing by 2.8 seconds.

### Key Evidence
- Pod Log: \`Node.js Event Loop Lag: 2840ms (Normal: < 20ms)\`
- Telemetry: CPU throttling peaked at 91.5% and health probes timed out.

### Recommended Fix
Audit and simplify regex patterns (eliminate nested quantifiers like \`(a+)+\`), use linear-time regex engines (e.g. \`re2\`), or validate input lengths prior to pattern matching.`,
  },
];

// POST /simulate: simulate a production incident with autonomous Gemini AI diagnosis
router.post('/simulate', async (req: Request, res: Response): Promise<void> => {
  try {
    const latestDeployment = await prisma.deployment.findFirst({
      where: {
        repository: {
          userId: req.userId,
        },
      },
      include: {
        repository: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestDeployment) {
      res.status(400).json({ error: 'No deployment found. Please deploy a repository first.' });
      return;
    }

    // Count existing incidents to cycle through diverse scenarios on each click
    const existingIncidentsCount = await prisma.incident.count({
      where: {
        deployment: {
          repository: {
            userId: req.userId,
          },
        },
      },
    });

    const scenario = INCIDENT_SCENARIOS[existingIncidentsCount % INCIDENT_SCENARIOS.length];

    const crypto = await import('crypto');
    const randomHex = crypto.randomBytes(3).toString('hex');
    const simCommit = `${randomHex}b7c`;
    const simVersion = `v-${randomHex}`;
    const repoSlug = latestDeployment.repository.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const simImage = `shipyard/${repoSlug}:${randomHex}`;
    const simLogs = `[INFO] Canary rollout triggered for commit ${simCommit}: ${scenario.commitMessage}
[INFO] Multi-stage build completed. Container image tagged as ${simImage}
[INFO] Traffic shifted to release candidate ${simVersion} (100% canary traffic)
[INFO] Commencing 5-minute automated SLO telemetry verification...
${scenario.podLogs}
[CRITICAL] Continuous Verification FAILED: ${scenario.reason}
[WARN] Autonomous safety rollback engaged!
[INFO] Traffic immediately reverted to stable healthy version (${latestDeployment.version}).
[SUCCESS] Zero-downtime rollback completed. Generating AI SRE Incident Report...`;

    const simDeployment = await prisma.deployment.create({
      data: {
        repositoryId: latestDeployment.repositoryId,
        version: simVersion,
        commitSha: simCommit,
        commitMessage: scenario.commitMessage,
        branch: latestDeployment.branch || 'main',
        status: 'rolled_back',
        image: simImage,
        namespace: 'docker-local',
        logs: simLogs,
      },
      include: {
        repository: true,
      },
    });

    const incident = await prisma.incident.create({
      data: {
        deploymentId: simDeployment.id,
        reason: scenario.reason,
      },
    });

    const prompt = `You are an expert Site Reliability Engineer (SRE).
A production deployment incident has occurred and triggered an automatic rollback.
Repository: ${simDeployment.repository.name} (${simDeployment.repository.githubUrl})
Commit: ${simDeployment.commitSha} (${scenario.commitMessage})
Image: ${simDeployment.image}
Incident Scenario: ${scenario.title}
Trigger Violation: ${scenario.reason}

--- POD ERROR LOGS ---
${scenario.podLogs}

--- TELEMETRY METRICS ---
${scenario.telemetry}

Provide a structured, highly professional SRE incident report:
1. **Root Cause Summary**: Explain what caused the crash and metrics degradation.
2. **Key Evidence**: Point out specific lines from the logs and metrics.
3. **Impact**: Impact on users prior to the automatic rollback.
4. **Recommended Fix**: Concrete code and config suggestions to resolve this.
5. **Prevention**: Prevention strategy for future releases.`;

    let aiOutput = '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );
        clearTimeout(timeoutId);
        const data: any = await geminiRes.json();
        aiOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (geminiErr) {
        console.error('[Incidents] Gemini call error:', geminiErr);
      }
    }

    if (!aiOutput || aiOutput.trim().length < 50) {
      aiOutput = scenario.fallbackOutput;
    }

    await prisma.diagnosis.create({
      data: {
        incidentId: incident.id,
        aiOutput,
        evidence: JSON.stringify(scenario.evidence, null, 2),
      },
    });

    const fullIncident = await prisma.incident.findUnique({
      where: { id: incident.id },
      include: {
        deployment: { include: { repository: true } },
        diagnoses: true,
      },
    });

    res.status(201).json(fullIncident);
  } catch (err) {
    console.error('[Incidents] Error simulating incident:', err);
    res.status(500).json({ error: 'Failed to simulate incident' });
  }
});

export default router;
