'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRepositories, getIncidents, Repository, Incident, Deployment } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [reposData, incidentsData] = await Promise.allSettled([
          getRepositories(),
          getIncidents(),
        ]);

        if (reposData.status === 'fulfilled') {
          setRepositories(reposData.value || []);
        } else {
          console.error('Failed to load repositories', reposData.reason);
        }

        if (incidentsData.status === 'fulfilled') {
          setIncidents(incidentsData.value || []);
        } else {
          console.error('Failed to load incidents', incidentsData.reason);
        }
      } catch (err) {
        console.error(err);
        toast.error('Error fetching dashboard telemetry');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Compute all deployments from repositories
  const allDeployments: (Deployment & { repositoryName: string })[] = [];
  repositories.forEach((repo) => {
    if (repo.deployments && Array.isArray(repo.deployments)) {
      repo.deployments.forEach((dep) => {
        allDeployments.push({
          ...dep,
          repositoryName: repo.name,
        });
      });
    }
  });

  // Sort deployments descending by creation
  allDeployments.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalRepositories = repositories.length;
  const totalDeployments = allDeployments.length;
  const activeDeployments = allDeployments.filter(
    (d) => d.status === 'healthy' || d.status === 'deploying'
  ).length;
  const totalIncidents = incidents.length;

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

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
          Loading platform metrics...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Overview
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time deployment pipeline telemetry and cluster verification status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/repositories/new">
            <Button variant="primary" size="sm">
              Add Repository
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Repositories */}
        <Card padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Total Repositories
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {totalRepositories}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Active Git integrations</p>
        </Card>

        {/* Total Deployments */}
        <Card padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Total Deployments
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {totalDeployments}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Historical cluster releases</p>
        </Card>

        {/* Active Deployments */}
        <Card padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Active Deployments
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight font-mono">
              {activeDeployments}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Healthy or in rollout</p>
        </Card>

        {/* Incidents */}
        <Card padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Incidents
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight font-mono ${totalIncidents > 0 ? 'text-rose-400' : 'text-zinc-200'}`}>
              {totalIncidents}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Rollbacks &amp; anomalies</p>
        </Card>
      </div>

      {/* Two Column Layout: Recent Deployments + Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Deployments (takes 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">
              Recent Deployments
            </h3>
            <Link
              href="/repositories"
              className="text-xs text-zinc-400 hover:text-white font-medium transition-colors"
            >
              View All Repositories &rarr;
            </Link>
          </div>

          <Card padding="none" className="overflow-hidden">
            {allDeployments.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#111116] flex items-center justify-center text-zinc-400 border border-[#22222d]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-300 font-medium">No deployments found</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Add a repository and trigger a commit to start automatic builds and verification.
                </p>
                <Link href="/repositories/new" className="inline-block pt-2">
                  <Button variant="secondary" size="sm">
                    Connect Repository
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0f0f14] text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800/80">
                    <tr>
                      <th className="px-5 py-3 font-medium">Repository</th>
                      <th className="px-5 py-3 font-medium">Commit SHA</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Timestamp</th>
                      <th className="px-5 py-3 font-medium text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {allDeployments.slice(0, 7).map((deployment) => (
                      <tr
                        key={deployment.id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3.5 font-medium text-white">
                          <Link
                            href={`/repositories/${deployment.repositoryId}`}
                            className="hover:text-white transition-colors"
                          >
                            {deployment.repositoryName || 'Repository'}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-zinc-400">
                          {deployment.commitSha
                            ? deployment.commitSha.substring(0, 7)
                            : deployment.version || 'main'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <StatusDot status={deployment.status} />
                            <Badge variant={getStatusBadgeVariant(deployment.status)}>
                              {deployment.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-400">
                          {formatDate(deployment.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/deployments/${deployment.id}`}
                            className="inline-flex items-center text-zinc-300 hover:text-white font-mono text-xs transition-colors"
                          >
                            Inspect &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Recent Incidents */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">
              Recent Incidents
            </h3>
            <Link
              href="/incidents"
              className="text-xs text-zinc-400 hover:text-white font-medium transition-colors"
            >
              View All &rarr;
            </Link>
          </div>

          <Card padding="none" className="divide-y divide-zinc-800/50 overflow-hidden">
            {incidents.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 space-y-2">
                <div className="w-8 h-8 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs text-zinc-300 font-medium">All deployments healthy</p>
                <p className="text-[11px] text-zinc-500">
                  No verification threshold violations or rollbacks triggered.
                </p>
              </div>
            ) : (
              incidents.slice(0, 5).map((incident) => {
                const hasDiagnosis = !!(
                  incident.diagnosis ||
                  (incident.diagnoses && incident.diagnoses.length > 0)
                );

                return (
                  <div
                    key={incident.id}
                    className="p-4 hover:bg-white/[0.02] transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusDot status="unhealthy" />
                        <span className="font-mono text-xs font-semibold text-rose-400">
                          {incident.deployment?.version
                            ? `Version ${incident.deployment.version}`
                            : 'Incident'}
                        </span>
                      </div>
                      {hasDiagnosis && (
                        <Badge variant="info">
                          AI Analyzed
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-zinc-300 line-clamp-2">
                      {incident.reason}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500">
                      <span>{formatDate(incident.createdAt)}</span>
                      <Link
                        href={`/deployments/${incident.deploymentId}`}
                        className="text-zinc-300 hover:text-white font-medium"
                      >
                        View Rollback &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
