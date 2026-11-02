'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createRepository } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function NewRepositoryPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [githubToken, setGithubToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !githubUrl.trim()) {
      toast.error('Repository Name and GitHub URL are required');
      return;
    }

    setLoading(true);
    try {
      await createRepository({
        name: name.trim(),
        githubUrl: githubUrl.trim(),
        branch: branch.trim() || 'main',
        githubToken: githubToken.trim() || undefined,
        webhookSecret: webhookSecret.trim() || undefined,
      });

      toast.success('Repository connected successfully');
      router.push('/repositories');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string; message?: string } } })
          ?.response?.data?.error ||
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        'Failed to connect repository';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Navigation / Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/repositories"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 font-medium"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Repositories
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Connect New Repository
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Link a Git repository to enable continuous automated builds, cluster rollouts, and telemetry monitoring
        </p>
      </div>

      {/* Form Container */}
      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Repository Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Repository Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. auth-service or frontend-web"
              className="input-base font-mono text-sm"
              disabled={loading}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Used as the identifier in Shipyard pipeline configurations.
            </p>
          </div>

          {/* GitHub URL */}
          <div>
            <label
              htmlFor="githubUrl"
              className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
            >
              GitHub URL <span className="text-rose-400">*</span>
            </label>
            <input
              id="githubUrl"
              type="url"
              required
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/organization/repository"
              className="input-base font-mono text-sm"
              disabled={loading}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Full HTTPS clone URL of the repository.
            </p>
          </div>

          {/* Target Branch */}
          <div>
            <label
              htmlFor="branch"
              className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Deployment Branch
            </label>
            <input
              id="branch"
              type="text"
              required
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="input-base font-mono text-sm"
              disabled={loading}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Push events to this branch will automatically trigger container build and verification.
            </p>
          </div>

          {/* GitHub Token (Optional) */}
          <div className="pt-2 border-t border-zinc-800/60">
            <label
              htmlFor="githubToken"
              className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              GitHub Personal Access Token{' '}
              <span className="text-zinc-500 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="githubToken"
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="input-base font-mono text-sm"
              disabled={loading}
            />
            <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
              Required if cloning a private repository or automatically registering webhook endpoints. Needs <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700/60 font-mono">repo</code> and <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700/60 font-mono">admin:repo_hook</code> scopes.
            </p>
          </div>

          {/* Webhook Secret */}
          <div>
            <label
              htmlFor="webhookSecret"
              className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Webhook Secret{' '}
              <span className="text-zinc-500 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="webhookSecret"
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="Custom HMAC signature secret"
              className="input-base font-mono text-sm"
              disabled={loading}
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Used to cryptographically verify HMAC-SHA256 signatures on incoming GitHub webhook payloads.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800/60">
            <Link href="/repositories">
              <Button variant="ghost" size="md" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
            >
              Connect Repository
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
