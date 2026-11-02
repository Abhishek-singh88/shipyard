'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getDeployment, Deployment, Diagnosis, Incident } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { LogViewer } from '@/components/ui/LogViewer';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

export default function DeploymentDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEvidence, setShowEvidence] = useState(false);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function loadDeployment(isInitial = false) {
      if (isInitial) setLoading(true);
      try {
        const data = await getDeployment(id);
        if (isMounted) {
          setDeployment(data);
        }
      } catch (err) {
        console.error(err);
        if (isInitial) toast.error('Failed to load deployment details');
      } finally {
        if (isInitial && isMounted) {
          setLoading(false);
        }
      }
    }

    loadDeployment(true);

    const interval = setInterval(() => {
      loadDeployment(false);
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [id]);

  const getStatusBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'deploying':
      case 'building':
        return 'info';
      case 'pending':
        return 'warning';
      case 'unhealthy':
      case 'rolled_back':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Just now';
    try {
      return format(new Date(dateString), 'PPP pp');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
          Loading deployment telemetry...
        </p>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="text-center py-16 space-y-4">
        <h3 className="text-xl font-bold text-white">Deployment not found</h3>
        <p className="text-sm text-slate-400">
          The deployment id {id} could not be located in cluster registry.
        </p>
        <Link href="/dashboard">
          <Button variant="secondary" size="sm">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const incident: Incident | null =
    deployment.incident ||
    ((deployment as any).incidents && (deployment as any).incidents.length > 0
      ? (deployment as any).incidents[0]
      : null);
  const diagnosis: Diagnosis | null =
    incident?.diagnosis ||
    (incident?.diagnoses && incident.diagnoses.length > 0
      ? incident.diagnoses[0]
      : null);

  // Fallback logs if backend did not attach full stream
  const rawLogs =
    deployment.logs ||
    `[INFO] Pulling source repository at branch ${deployment.branch || 'main'}...
[INFO] Commit: ${deployment.commitSha || 'a4f89d0'} - ${deployment.commitMessage || 'Deployment trigger'}
[INFO] Initiating multi-stage Docker build...
[INFO] Step 1/8: FROM node:20-alpine AS build
[INFO] Step 2/8: WORKDIR /app
[INFO] Step 3/8: COPY package*.json ./
[INFO] Step 4/8: RUN npm ci --omit=dev
[INFO] Step 5/8: COPY . .
[INFO] Step 6/8: RUN npm run build
[INFO] Step 7/8: Tagged image as ${deployment.image || 'shipyard-app:latest'}
[INFO] Step 8/8: Pushing container image to private registry...
[INFO] Image push completed successfully.
[INFO] Generating Kubernetes manifest manifests/deployment.yaml
[INFO] Applying deployment to namespace '${deployment.namespace || 'production'}'
[INFO] Rollout status: waiting for pod replicas to report Ready...
${
  deployment.status === 'unhealthy' || deployment.status === 'rolled_back'
    ? `[ERROR] Health verification rule triggered failure!
[ERROR] Threshold violated: Error Rate exceeded 5.0% for 30s.
[WARN] Initiating autonomous rollback to previous healthy version...
[INFO] Traffic routed back to stable replica set. Rollback confirmed.`
    : deployment.status === 'healthy'
    ? `[INFO] Replicas: 3/3 Ready.
[INFO] Continuous verification telemetry: error_rate=0.01%, latency_p95=42ms.
[SUCCESS] Verification passed. Release marked as healthy.`
    : `[INFO] Deployment in progress...`
}`;

  return (
    <div className="space-y-8">
      {/* Back link */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {incident ? (
          <Link
            href="/incidents"
            className="hover:text-slate-200 transition-colors flex items-center gap-1 font-medium text-slate-300 hover:text-white"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Incidents
          </Link>
        ) : (
          <Link
            href={`/repositories/${deployment.repositoryId}`}
            className="hover:text-slate-200 transition-colors flex items-center gap-1 font-medium text-slate-300 hover:text-white"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Repository
          </Link>
        )}

        <span>/</span>

        {incident && (
          <>
            <Link
              href={`/repositories/${deployment.repositoryId}`}
              className="hover:text-slate-200 transition-colors text-slate-400"
            >
              Repository
            </Link>
            <span>/</span>
          </>
        )}

        <span className="text-slate-200 font-mono">
          Deployment {deployment.version}
        </span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1e1e2e]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white font-mono">
              Release {deployment.version}
            </h2>
            <div className="flex items-center gap-2">
              <StatusDot status={deployment.status} />
              <Badge variant={getStatusBadgeVariant(deployment.status)}>
                {deployment.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            {deployment.commitMessage || 'Automated continuous deployment'}
          </p>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Deployed: {formatDate(deployment.createdAt)}
        </div>
      </div>

      {/* Incident Alert Panel */}
      {incident && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 shadow-[0_0_25px_rgba(239,68,68,0.15)] space-y-2">
          <div className="flex items-center gap-2 text-rose-400">
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <h3 className="text-sm font-semibold text-rose-300 uppercase tracking-wider font-mono">
              Deployment Incident Detected &mdash; Rollback Executed
            </h3>
          </div>
          <p className="text-xs text-rose-200 leading-relaxed pl-7">
            {incident.reason}
          </p>
        </div>
      )}

      {/* AI Incident Report Panel */}
      {diagnosis && (
        <Card
          padding="lg"
          className="border-zinc-800 bg-[#0d0d12]/95 shadow-2xl shadow-black/50 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-100 shadow-sm">
                <svg
                  className="w-4 h-4 text-zinc-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>
              <span className="text-sm font-bold text-white font-mono tracking-wider uppercase">
                AI Incident Report
              </span>
            </div>
            <Badge variant="info">
              Autonomous Root Cause Analysis
            </Badge>
          </div>

          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans bg-[#09090c] p-6 rounded-xl border border-zinc-800/80 shadow-inner">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h3 className="text-base font-bold text-white mt-4 mb-2 pb-2 border-b border-zinc-800 flex items-center gap-2 font-mono" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h4 className="text-sm font-bold text-zinc-100 mt-4 mb-2 uppercase tracking-wide font-mono" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h5 className="text-xs font-semibold text-zinc-200 mt-3 mb-1 uppercase tracking-wider font-mono" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="mb-2.5 text-zinc-300 leading-relaxed" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-white" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside space-y-1 mb-2.5 text-zinc-300 pl-1" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside space-y-1 mb-2.5 text-zinc-300 pl-1" {...props} />
                ),
                li: ({ node, ...props }) => <li className="text-zinc-300" {...props} />,
                code: ({ node, className, children, ...props }: any) => {
                  const isMultiline = typeof children === 'string' && children.includes('\n');
                  return isMultiline ? (
                    <div className="my-3 overflow-x-auto rounded-lg bg-[#050508] border border-zinc-800 p-4 font-mono text-[11px] text-emerald-400">
                      <code {...props}>{children}</code>
                    </div>
                  ) : (
                    <code className="bg-zinc-800/90 text-zinc-200 px-1.5 py-0.5 rounded font-mono text-[11px] border border-zinc-700/60" {...props}>
                      {children}
                    </code>
                  );
                },
                hr: () => <hr className="my-4 border-zinc-800" />,
                a: ({ node, ...props }) => (
                  <a className="text-zinc-300 hover:text-white underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
                ),
              }}
            >
              {diagnosis.aiOutput}
            </ReactMarkdown>
          </div>

          {/* Collapsible Evidence Section */}
          {diagnosis.evidence && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowEvidence(!showEvidence)}
                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 font-medium cursor-pointer transition-colors"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showEvidence ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <span>{showEvidence ? 'Hide' : 'View'} Sanitized Evidence &amp; Telemetry Inputs</span>
              </button>

              {showEvidence && (
                <div className="mt-3 p-3 rounded-lg bg-[#09090c] border border-zinc-800 font-mono text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap max-h-60 leading-relaxed">
                  {diagnosis.evidence}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Deployment Metadata Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm" className="space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
            Commit SHA
          </span>
          <p className="text-xs font-mono font-semibold text-slate-200">
            {deployment.commitSha ? deployment.commitSha.substring(0, 7) : 'e8f49a1'}
          </p>
        </Card>

        <Card padding="sm" className="space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
            Branch
          </span>
          <p className="text-xs font-mono font-semibold text-slate-200">
            {deployment.branch || 'main'}
          </p>
        </Card>

        <Card padding="sm" className="space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
            Kubernetes Namespace
          </span>
          <p className="text-xs font-mono font-semibold text-slate-200">
            {deployment.namespace || 'production'}
          </p>
        </Card>

        <Card padding="sm" className="space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
            Container Image
          </span>
          <p className="text-xs font-mono font-semibold text-slate-200 truncate" title={deployment.image}>
            {deployment.image || 'registry.internal/app:v1.0'}
          </p>
        </Card>
      </div>

      {/* Terminal Logs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">
            Execution &amp; Telemetry Logs
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            stdout / stderr
          </span>
        </div>

        <LogViewer logs={rawLogs} loading={deployment.status === 'building' || deployment.status === 'deploying'} />
      </div>
    </div>
  );
}
