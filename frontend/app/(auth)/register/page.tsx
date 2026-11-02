'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/api';
import { saveAuthData, isAuthenticated } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const response = await register({ name, email, password });
      saveAuthData(response.token, response.user);
      toast.success('Account created successfully');
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string; message?: string } } })
          ?.response?.data?.error ||
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        'Registration failed. Please check your information.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f1f5f9] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/70 flex items-center justify-center shadow-lg">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold tracking-wider text-xl text-white font-mono flex items-center gap-1.5">
              SHIPYARD
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Get started with Shipyard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Create an account to deploy and monitor your workloads
          </p>
        </div>

        {/* Register Card */}
        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                className="input-base"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                className="input-base"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="input-base"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full mt-2"
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-zinc-200 hover:text-white font-medium underline underline-offset-4 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
