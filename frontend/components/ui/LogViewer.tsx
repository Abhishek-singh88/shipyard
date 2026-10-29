'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from './Spinner';

interface LogViewerProps {
  logs: string;
  loading?: boolean;
  className?: string;
}

export function LogViewer({ logs, loading = false, className = '' }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    if (!logs) return;
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = logs ? logs.split('\n') : [];

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-[#09090d] overflow-hidden shadow-2xl flex flex-col ${className}`}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f14] border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <span className="ml-2 text-xs font-mono text-zinc-400 font-medium">
            deployment.log
          </span>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Spinner size="sm" />
              <span>Streaming logs...</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!logs}
            className="text-xs font-mono text-zinc-300 hover:text-white transition-colors px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={containerRef}
        className="p-4 font-mono text-xs text-zinc-300 overflow-y-auto max-h-[460px] min-h-[220px] leading-relaxed selection:bg-white/20 selection:text-white"
      >
        {loading && lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Spinner size="md" />
            <span className="mt-3 text-xs">Waiting for deployment stream...</span>
          </div>
        ) : lines.length === 0 ? (
          <div className="text-slate-500 italic py-8 text-center">
            No log output available for this deployment.
          </div>
        ) : (
          <div className="space-y-1">
            {lines.map((line, idx) => {
              const isError =
                line.toLowerCase().includes('error') ||
                line.toLowerCase().includes('failed') ||
                line.toLowerCase().includes('fatal');
              const isWarn =
                line.toLowerCase().includes('warn') ||
                line.toLowerCase().includes('warning');
              const isSuccess =
                line.toLowerCase().includes('success') ||
                line.toLowerCase().includes('completed') ||
                line.toLowerCase().includes('healthy');

              return (
                <div key={idx} className="flex items-start hover:bg-[#161b22]/60 px-1 py-0.5 rounded">
                  <span className="select-none text-slate-600 w-10 text-right pr-4 shrink-0 font-mono text-[11px]">
                    {idx + 1}
                  </span>
                  <span
                    className={`break-all whitespace-pre-wrap ${
                      isError
                        ? 'text-rose-400 font-medium'
                        : isWarn
                        ? 'text-amber-400'
                        : isSuccess
                        ? 'text-emerald-400'
                        : 'text-[#c9d1d9]'
                    }`}
                  >
                    {line || ' '}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
