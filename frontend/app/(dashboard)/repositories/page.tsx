'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRepositories, deleteRepository, Repository } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const data = await getRepositories();
      setRepositories(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to disconnect repository "${name}"?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteRepository(id);
      toast.success(`Repository ${name} removed`);
      setRepositories((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || 'Failed to delete repository';
      toast.error(errorMsg);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
          Loading repositories...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Repositories
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage your Git repositories connected to automated Kubernetes delivery pipelines
          </p>
        </div>
        <Link href="/repositories/new">
          <Button variant="primary" size="sm" className="gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Repository
          </Button>
        </Link>
      </div>

      {/* Repositories Grid or Empty State */}
      {repositories.length === 0 ? (
        <Card padding="lg" className="text-center py-16">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 mb-4 shadow-xl">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No repositories connected
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
            Connect a GitHub repository to configure continuous deployment, automated verification gates, and instant rollbacks.
          </p>
          <Link href="/repositories/new">
            <Button variant="primary" size="md">
              Connect Your First Repository
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo) => {
            const latestDeployment =
              repo.deployments && repo.deployments.length > 0
                ? repo.deployments[0]
                : null;

            return (
              <Card
                key={repo.id}
                padding="md"
                className="flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-200"
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Link
                      href={`/repositories/${repo.id}`}
                      className="text-base font-semibold text-white hover:text-white transition-colors truncate"
                    >
                      {repo.name}
                    </Link>

                    <button
                      type="button"
                      disabled={deletingId === repo.id}
                      onClick={() => handleDelete(repo.id, repo.name)}
                      title="Disconnect repository"
                      className="text-zinc-500 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {deletingId === repo.id ? (
                        <Spinner size="sm" />
                      ) : (
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
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* GitHub URL */}
                  <a
                    href={repo.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors mb-4 break-all"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                    <span className="truncate">{repo.githubUrl.replace('https://github.com/', '')}</span>
                  </a>

                  {/* Branch & Target info */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[11px] font-mono text-zinc-500">Branch:</span>
                    <Badge variant="neutral" className="font-mono text-[11px]">
                      {repo.branch || 'main'}
                    </Badge>
                  </div>
                </div>

                {/* Footer of Card: Latest deployment status */}
                <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot
                      status={latestDeployment ? latestDeployment.status : 'pending'}
                    />
                    <span className="text-xs font-medium text-zinc-300 capitalize">
                      {latestDeployment
                        ? latestDeployment.status.replace('_', ' ')
                        : 'No deployments'}
                    </span>
                  </div>

                  <Link
                    href={`/repositories/${repo.id}`}
                    className="text-xs text-zinc-300 hover:text-white font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    Manage &rarr;
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
