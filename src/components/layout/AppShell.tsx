'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/firebase/AuthContext';
import { Sidebar } from './Sidebar';
import { DashboardNavbar } from './DashboardNavbar';
import { AuthModal } from '../auth/AuthModal';
import { AuthGuard } from '../auth/AuthGuard';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // If loading session on root, show simple loader
  if (loading && pathname === '/') {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // If on root route, render Landing Page full width
  if (pathname === '/') {
    return (
      <div className="min-h-screen bg-ink-950 w-full">
        {children}
        <AuthModal />
      </div>
    );
  }

  // Internal Workspace (Authenticated or Guarded)
  return (
    <div className="bg-[#090d16] text-slate-100 min-h-screen flex antialiased selection:bg-indigo-500 selection:text-white">
      {user && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        {user ? <DashboardNavbar /> : (
          <header className="h-16 glass-panel border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white">Automated Jobs</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">Workspace</span>
            </div>
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Landing Page
            </Link>
          </header>
        )}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {user ? children : <AuthGuard>{children}</AuthGuard>}
        </main>
      </div>
      <AuthModal />
    </div>
  );
}
