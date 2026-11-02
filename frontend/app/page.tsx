'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated()) {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div className="relative min-h-screen bg-[#09090b] text-[#f1f5f9] overflow-hidden flex flex-col selection:bg-white/20 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[30%] right-[10%] w-[500px] h-[500px] bg-white/[0.015] rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] left-[10%] w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="w-full border-b border-zinc-800/80 backdrop-blur-md bg-[#09090b]/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/70 flex items-center justify-center shadow-md">
              <svg
                className="w-4 h-4 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold tracking-wider text-base text-white font-mono flex items-center gap-1.5">
              SHIPYARD
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">
              Platform
            </a>
            <a href="#architecture" className="hover:text-white transition-colors">
              Verification
            </a>
            <a href="#ai-diagnostics" className="hover:text-white transition-colors">
              AI Diagnostics
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 pt-20 pb-24 flex flex-col items-center text-center">
        {/* Release Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-xs font-medium mb-8 backdrop-blur-md shadow-sm">
          <StatusDot status="healthy" />
          <span>Continuous Deployment & Autonomous Verification</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6">
          Deploy with <br />
          <span className="bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Confidence
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed font-normal">
          Automate Kubernetes rollouts with continuous telemetry verification.
          Detect regression anomalies in real time and trigger instant rollbacks
          backed by AI-powered incident diagnosis.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Link href="/register">
            <Button size="lg" variant="primary" className="w-48 sm:w-auto">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="w-48 sm:w-auto">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Live Platform Visual Mockup */}
        <div className="w-full max-w-4xl mb-24 rounded-2xl border border-zinc-800 bg-[#0d0d12]/95 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <span className="text-xs font-mono text-zinc-400 pl-2">
                shipyard-deploy-pipeline // release-v2.4.1
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot status="healthy" showLabel />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-left font-mono text-xs">
            <div className="p-3 rounded-lg bg-[#09090c] border border-zinc-800">
              <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                Trigger Event
              </span>
              <p className="text-zinc-200 font-semibold truncate">
                git push main (7f493b8)
              </p>
              <p className="text-zinc-400 text-[11px] mt-1">
                Automated webhook triggered
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#09090c] border border-zinc-800">
              <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                Telemetry Health
              </span>
              <p className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Error Rate: 0.02% (&lt; 1%)
              </p>
              <p className="text-zinc-400 text-[11px] mt-1">
                P95 Latency: 48ms (Pass)
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#09090c] border border-zinc-800">
              <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                Rollback Guard
              </span>
              <p className="text-zinc-200 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Autonomous Engine Active
              </p>
              <p className="text-zinc-400 text-[11px] mt-1">
                AI diagnosis standing by
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlight Cards */}
        <section id="features" className="w-full">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
              Built for Resilient Continuous Delivery
            </h2>
            <p className="text-sm text-zinc-400 max-w-xl mx-auto">
              Every stage of your rollout is guarded by automated verification,
              preventing outages before users even notice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Feature 1 */}
            <Card padding="lg" interactive className="flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-200 mb-5 shadow-sm">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Deploy Automatically
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Trigger automated container builds and zero-downtime Kubernetes
                  rollouts immediately upon push. Manage environments and versions
                  with granular tracking.
                </p>
              </div>
            </Card>

            {/* Feature 2 */}
            <Card padding="lg" interactive className="flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                  <svg
                    className="w-5 h-5"
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
                  Verify Continuously
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Active verification rules monitor error rates, latency spikes, and
                  service metrics in real-time. If health criteria fail, traffic is
                  instantly diverted back to the previous stable release.
                </p>
              </div>
            </Card>

            {/* Feature 3 */}
            <Card padding="lg" interactive className="flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5 shadow-sm">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  AI-Powered Diagnosis
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Upon incident trigger, Shipyard synthesizes sanitized cluster logs,
                  traces, and metric deltas to generate an instant root-cause analysis
                  explaining exactly why the rollout failed.
                </p>
              </div>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-8 px-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-zinc-400 font-semibold">SHIPYARD</span>
            <span>&mdash; Continuous Deployment Platform</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e]" />
            <span>Autonomous Engine Online</span>
          </div>
        </div>
      </footer>
    </div>
  );
}