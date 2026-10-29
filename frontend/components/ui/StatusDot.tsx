import React from 'react';
import type { DeploymentStatus } from '@/lib/api';

interface StatusDotProps {
  status: DeploymentStatus | string;
  className?: string;
  showLabel?: boolean;
}

export function StatusDot({
  status,
  className = '',
  showLabel = false,
}: StatusDotProps) {
  const normalized = (status || 'pending').toLowerCase();

  const config: Record<
    string,
    { color: string; ringColor: string; label: string; pulse: boolean }
  > = {
    healthy: {
      color: 'bg-emerald-500',
      ringColor: 'bg-emerald-400',
      label: 'Healthy',
      pulse: true,
    },
    deploying: {
      color: 'bg-teal-400',
      ringColor: 'bg-teal-300',
      label: 'Deploying',
      pulse: true,
    },
    building: {
      color: 'bg-amber-400',
      ringColor: 'bg-amber-400',
      label: 'Building',
      pulse: true,
    },
    pending: {
      color: 'bg-amber-400',
      ringColor: 'bg-amber-400',
      label: 'Pending',
      pulse: false,
    },
    unhealthy: {
      color: 'bg-rose-500',
      ringColor: 'bg-rose-400',
      label: 'Unhealthy',
      pulse: false,
    },
    rolled_back: {
      color: 'bg-purple-400',
      ringColor: 'bg-purple-400',
      label: 'Rolled Back',
      pulse: false,
    },
  };

  const current = config[normalized] || {
    color: 'bg-slate-400',
    ringColor: 'bg-slate-400',
    label: normalized,
    pulse: false,
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        {current.pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${current.ringColor}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${current.color}`}
        />
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-slate-300 capitalize">
          {current.label}
        </span>
      )}
    </div>
  );
}
