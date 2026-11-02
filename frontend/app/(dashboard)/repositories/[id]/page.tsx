'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getRepository, triggerDeployment, Repository, Deployment } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

export default function RepositoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [repository, setRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const handleTriggerDeploy = async () => {
    if (!id) return;
    setDeploying(true);
    try {
      const deployment = await triggerDeployment(id);
      toast.success('Deployment triggered successfully!');
      router.push(`/deployments/${deployment.id}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to trigger deployment';
      toast.error(message);
    } finally {
      setDeploying(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    async function loadRepository() {
      setLoading(true);
      try {
        const data = await getRepository(id);
        setRepository(data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load repository details');
      } finally {
        setLoading(false);
      }
    }

    loadRepository();
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
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const webhookEndpoint = `${
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  }/api/webhook/github`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setCopiedWebhook(true);
    toast.success('Webhook URL copied to clipboard');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
          Loading repository data...
        </p>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="text-center py-16 space-y-4">
        <h3 className="text-xl font-bold text-white">Repository not found</h3>
        <p className="text-sm text-slate-400">
          The requested repository configuration may have been removed.
        </p>
        <Link href="/repositories">
          <Button variant="secondary" size="sm">
            Back to Repositories
          </Button>
        </Link>
      </div>
    );
  }

  const deployments: Deployment[] = repository.deployments || [];

  return (
    <div className="space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link
          href="/repositories"
          className="hover:text-slate-200 transition-colors font-medium"
        >
          Repositories
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-mono">{repository.name}</span>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1e1e2e]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white font-mono">
              {repository.name}
            </h2>
            <Badge variant="neutral" className="font-mono text-xs">
              {repository.branch || 'main'}
            </Badge>
          </div>
          <a
            href={repository.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors mt-1.5 inline-flex items-center gap-1.5 font-mono"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            {repository.githubUrl}
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleTriggerDeploy}
            disabled={deploying}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm border border-emerald-500/30 transition-all cursor-pointer"
          >
            {deploying ? (
              <>
                <Spinner size="sm" />
                <span>Deploying...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Deploy Now</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Webhook Configuration Panel */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <h3 className="text-sm font-semibold text-white">
              GitHub Webhook Setup Instructions
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Payload format: JSON
          </span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Configure a webhook in your GitHub repository settings under{' '}
          <strong className="text-zinc-200">Settings &rarr; Webhooks &rarr; Add webhook</strong> to trigger automatic builds on git push.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#09090c] border border-zinc-800">
            <span className="text-zinc-500 text-[10px] uppercase block mb-1">
              Payload URL
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-200 truncate">{webhookEndpoint}</span>
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-[10px] cursor-pointer shrink-0"
              >
                {copiedWebhook ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
            <span className="text-slate-500 text-[10px] uppercase block mb-1">
              Trigger Event
            </span>
            <span className="text-slate-300">
              Just the <code>push</code> event
            </span>
          </div>
        </div>
      </Card>

      {/* Deployment History Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">
            Deployment History
          </h3>
          <span className="text-xs font-mono text-slate-500">
            {deployments.length} total releases
          </span>
        </div>

        <Card padding="none" className="overflow-hidden">
          {deployments.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 border border-zinc-700/60">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-sm text-zinc-300 font-medium">
                No deployment history
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Push commits to the <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700/60 font-mono">{repository.branch}</code> branch to trigger automatic container builds and cluster deployment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0f0f14] text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800/80">
                  <tr>
                    <th className="px-5 py-3 font-medium">Version</th>
                    <th className="px-5 py-3 font-medium">Commit SHA</th>
                    <th className="px-5 py-3 font-medium">Commit Message</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Timestamp</th>
                    <th className="px-5 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {deployments.map((deployment) => (
                    <tr
                      key={deployment.id}
                      onClick={() => router.push(`/deployments/${deployment.id}`)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 font-semibold text-white font-mono">
                        {deployment.version}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">
                        {deployment.commitSha
                          ? deployment.commitSha.substring(0, 7)
                          : 'e8f49a1'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 max-w-xs truncate">
                        {deployment.commitMessage || 'Automated rollout from git push'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <StatusDot status={deployment.status} />
                          <Badge variant={getStatusBadgeVariant(deployment.status)}>
                            {deployment.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {formatDate(deployment.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-zinc-300 hover:text-white transition-colors">
                        Inspect &rarr;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
