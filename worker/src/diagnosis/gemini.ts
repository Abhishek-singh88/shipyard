import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma';
import { appendLog } from '../pipeline/utils';
import type { DiagnosisEvidence } from './collector';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Calls the Gemini API with collected evidence and saves the diagnosis.
 */
export async function diagnoseWithGemini(
  incidentId: string,
  deploymentId: string,
  deployment: { commitSha: string; commitMessage: string; image: string; repository: { name: string; githubUrl: string } },
  evidence: DiagnosisEvidence
): Promise<void> {
  if (!GEMINI_API_KEY) {
    await appendLog(deploymentId, `[Diagnosis] GEMINI_API_KEY not configured. Skipping AI diagnosis.`);

    await prisma.diagnosis.create({
      data: {
        incidentId,
        aiOutput: 'AI diagnosis is not available because GEMINI_API_KEY is not configured.',
        evidence: formatEvidence(evidence),
      },
    });
    return;
  }

  await appendLog(deploymentId, `[Diagnosis] Calling Gemini AI for incident analysis...`);

  const prompt = buildPrompt(deployment, evidence);

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const aiOutput = response.text();

    await prisma.diagnosis.create({
      data: {
        incidentId,
        aiOutput,
        evidence: formatEvidence(evidence),
      },
    });

    await appendLog(deploymentId, `[Diagnosis] AI diagnosis generated and saved.`);
    await appendLog(deploymentId, `[Diagnosis] Summary: ${aiOutput.substring(0, 200)}...`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await appendLog(deploymentId, `[Diagnosis] AI diagnosis failed: ${message}`);

    await prisma.diagnosis.create({
      data: {
        incidentId,
        aiOutput: `AI diagnosis failed: ${message}`,
        evidence: formatEvidence(evidence),
      },
    });
  }
}

function buildPrompt(
  deployment: { commitSha: string; commitMessage: string; image: string; repository: { name: string; githubUrl: string } },
  evidence: DiagnosisEvidence
): string {
  return `You are an expert Site Reliability Engineer (SRE) and DevOps specialist. 
A deployment has been automatically rolled back due to a verification failure. 
Your task is to analyze the provided evidence and produce a clear, concise incident report.

--- DEPLOYMENT CONTEXT ---
Repository: ${deployment.repository.name} (${deployment.repository.githubUrl})
Commit: ${deployment.commitSha.substring(0, 7)}
Commit Message: ${deployment.commitMessage}
Docker Image: ${deployment.image}

--- FAILURE REASON ---
${evidence.reason}

--- POD LOGS (last 100 lines) ---
${evidence.podLogs}

--- KUBERNETES EVENTS ---
${evidence.recentEvents}

--- PROMETHEUS METRICS ---
${evidence.metrics}

--- YOUR TASK ---
Based on the evidence above, provide a structured incident report with the following sections:

1. **Root Cause Summary** (2-3 sentences): What most likely caused this failure?
2. **Key Evidence**: List the specific log lines, events, or metrics that confirm your diagnosis.
3. **Impact**: What was the impact on end users during the window before rollback?
4. **Recommended Fix**: What specific code or configuration change should the developer make?
5. **Prevention**: What monitoring or testing changes would prevent this in future?

Be specific and technical. Reference actual values from the logs and metrics. Do not use emojis.`;
}

function formatEvidence(evidence: DiagnosisEvidence): string {
  return JSON.stringify(
    {
      reason: evidence.reason,
      podLogs: evidence.podLogs.substring(0, 5000), // Limit storage size
      recentEvents: evidence.recentEvents,
      metrics: evidence.metrics,
    },
    null,
    2
  );
}
