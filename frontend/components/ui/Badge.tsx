import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-sm',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-sm',
    info: 'bg-purple-950/30 text-purple-300 border-purple-800/40 shadow-sm',
    neutral: 'bg-zinc-800/60 text-zinc-300 border-zinc-700/50',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
