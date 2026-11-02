'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getIncidents, simulateIncident, Incident } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      toast.loading('Simulating incident & running Gemini AI diagnosis...', { id: 'sim' });
      await simulateIncident();
      toast.success('Incident simulated & Gemini AI diagnosis ready!', { id: 'sim' });
      const data = await getIncidents();
      setIncidents(data || []);
    } catch (err: unknown) {
      // In case of network latency, check if backend still succeeded in the background
      try {
        const data = await getIncidents();
        if (data && data.length > incidents.length) {
          setIncidents(data);
          toast.success('Incident simulated & Gemini AI diagnosis ready!', { id: 'sim' });
          return;
        }
      } catch {}
      const msg = (err as any)?.response?.data?.error || (err as any)?.message || 'Failed to simulate incident';
      toast.error(msg, { id: 'sim' });
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    async function loadIncidents() {
      setLoading(true);
      try {
        const data = await getIncidents();
        setIncidents(data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load incident history');
      } finally {
        setLoading(false);
      }
    }

    loadIncidents();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const aiDiagnosedCount = incidents.filter(
    (inc) => inc.diagnosis || (inc.diagnoses && inc.diagnoses.length > 0)
  ).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
          Loading incidents...
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
            Incident Center
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Audit log of autonomous rollbacks triggered by metric threshold violations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSimulate}
            disabled={simulating}
            className="bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
          >
            {simulating ? (
              <>
                <Spinner size="sm" />
                <span>Diagnosing with Gemini...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Simulate Incident</span>
              </>
            )}
          </Button>

          <div className="px-3 py-1.5 rounded-lg bg-[#121217] border border-zinc-800 text-xs font-mono text-zinc-300">
            AI Diagnosed:{' '}
            <span className="text-emerald-400 font-semibold">
              {aiDiagnosedCount}
            </span>{' '}
            / {incidents.length}
          </div>
        </div>
      </div>

      {/* Incident List */}
      {incidents.length === 0 ? (
        <Card padding="lg" className="text-center py-16">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No incidents recorded
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            All continuous verification rules are operating within normal parameters. No automated rollbacks have been triggered.
          </p>
          <Button
            onClick={handleSimulate}
            disabled={simulating}
            className="bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs px-4 py-2.5 rounded-lg inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            {simulating ? <Spinner size="sm" /> : null}
            <span>Simulate Incident &amp; Test AI Diagnosis</span>
          </Button>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161622]/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1e1e2e]">
                <tr>
                  <th className="px-5 py-3 font-medium">Release Version</th>
                  <th className="px-5 py-3 font-medium">Repository</th>
                  <th className="px-5 py-3 font-medium">Trigger Reason</th>
                  <th className="px-5 py-3 font-medium">Analysis</th>
                  <th className="px-5 py-3 font-medium">Logged</th>
                  <th className="px-5 py-3 font-medium text-right">Investigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e2e]/60">
                {incidents.map((incident) => {
                  const hasDiagnosis = !!(
                    incident.diagnosis ||
                    (incident.diagnoses && incident.diagnoses.length > 0)
                  );
                  const repoName =
                    incident.deployment?.repository?.name || 'Service Repository';
                  const releaseVersion =
                    incident.deployment?.version || `Rollout #${incident.deploymentId.substring(0, 6)}`;

                  return (
                    <tr
                      key={incident.id}
                      className="hover:bg-[#161622]/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <StatusDot status="unhealthy" />
                          <span className="font-mono font-semibold text-rose-400">
                            {releaseVersion}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-200">
                        {repoName}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 max-w-md">
                        <p className="line-clamp-2 leading-relaxed">
                          {incident.reason}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        {hasDiagnosis ? (
                          <Badge variant="info">
                            AI Analyzed
                          </Badge>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-mono">
                            Unprocessed
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                        {formatDate(incident.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/deployments/${incident.deploymentId}`}
                          className="inline-flex items-center text-zinc-300 hover:text-white font-mono text-xs transition-colors"
                        >
                          View Report &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
