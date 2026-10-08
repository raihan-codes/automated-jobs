'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/firebase/AuthContext';
import { Sidebar } from './Sidebar';
import { DashboardNavbar } from './DashboardNavbar';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { AuthModal } from '../auth/AuthModal';
import { AuthGuard } from '../auth/AuthGuard';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // If loading session on root, show simple loader
  if (loading && (pathname === '/' || pathname === '/overview')) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center transition-colors">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // If on marketing landing route, render Landing Page full width
  if (pathname === '/landing') {
    return (
      <div className="min-h-screen bg-surface w-full transition-colors">
        {children}
        <AuthModal />
      </div>
    );
  }

  // Internal Workspace (Authenticated or Guarded)
  return (
    <div className="bg-[#f8fafc] dark:bg-[#090e17] text-slate-800 dark:text-slate-100 min-h-screen flex antialiased selection:bg-indigo-600 selection:text-white transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <DashboardNavbar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <AuthModal />
    </div>
  );
}
