'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Spinner } from '@/components/ui/Spinner';
import { StatusDot } from '@/components/ui/StatusDot';

interface DashboardContextType {
  title: string;
  setTitle: (title: string) => void;
  subtitle: string;
  setSubtitle: (subtitle: string) => void;
}

const DashboardContext = createContext<DashboardContextType>({
  title: '',
  setTitle: () => {},
  subtitle: '',
  setSubtitle: () => {},
});

export const useDashboard = () => useContext(DashboardContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [customTitle, setCustomTitle] = useState('');
  const [customSubtitle, setCustomSubtitle] = useState('');

  // Default title based on route
  const getRouteTitle = () => {
    if (customTitle) return customTitle;
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/repositories') return 'Repositories';
    if (pathname === '/repositories/new') return 'Add Repository';
    if (pathname.startsWith('/repositories/')) return 'Repository Overview';
    if (pathname.startsWith('/deployments/')) return 'Deployment Detail';
    if (pathname === '/incidents') return 'Incident Center';
    if (pathname.startsWith('/incidents/')) return 'Incident Details';
    return 'Platform';
  };

  useEffect(() => {
    // Reset custom title when route changes
    setCustomTitle('');
    setCustomSubtitle('');

    if (!isAuthenticated()) {
      router.replace('/login');
    } else {
      setCheckingAuth(false);
    }
  }, [pathname, router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
          Authenticating session...
        </span>
      </div>
    );
  }

  return (
    <DashboardContext.Provider
      value={{
        title: customTitle,
        setTitle: setCustomTitle,
        subtitle: customSubtitle,
        setSubtitle: setCustomSubtitle,
      }}
    >
      <div className="min-h-screen bg-[#09090b] flex text-zinc-100 font-sans">
        {/* Fixed Sidebar */}
        <Sidebar />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Top Bar */}
          <header className="h-16 px-8 border-b border-[#1c1c24] bg-[#09090c]/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight">
                {getRouteTitle()}
              </h1>
              {customSubtitle && (
                <p className="text-xs text-zinc-400 font-normal">
                  {customSubtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#121217] border border-[#22222c] text-xs text-zinc-400">
                <StatusDot status="healthy" />
                <span className="font-mono text-[11px] text-zinc-300">
                  k8s-cluster: us-east-prod
                </span>
              </div>
            </div>
          </header>

          {/* Page Contents */}
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
