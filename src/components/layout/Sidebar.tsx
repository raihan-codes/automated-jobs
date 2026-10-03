'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/firebase/AuthContext';
import ThemeToggle from '@/components/ui/ThemeToggle';
import {
  LayoutDashboard,
  Compass,
  FileCheck2,
  FileText,
  UserCircle2,
  Sliders,
  ShieldCheck,
  Building2,
  Bot,
  Upload,
  UserCheck,
  RefreshCw,
  Target
} from 'lucide-react';

const navItems = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Upload Resume', href: '/upload', icon: Upload },
  { label: 'Job Discovery & Match', href: '/jobs', icon: Compass },
  { label: 'Application Pipeline', href: '/applications', icon: FileCheck2 },
  { label: 'Resume Studio', href: '/resumes', icon: FileText },
  { label: 'Resume Review & Jobs', href: '/resumes/review', icon: Target },
  { label: 'Candidate Profile', href: '/profile', icon: UserCircle2 },
  { label: 'Automation & Sources', href: '/settings', icon: Sliders },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, openAuthModal, isFirebaseLive } = useAuth();

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 min-h-screen flex flex-col justify-between shrink-0 p-4 sticky top-0 hidden md:flex">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-white tracking-tight">Automated</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Jobs</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Job Automation Platform</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Vault & Tenant */}
      <div className="space-y-3 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between px-1 py-1">
          <span className="text-[11px] font-semibold text-slate-400">Theme</span>
          <ThemeToggle variant="pill" />
        </div>

        <button
          onClick={() => openAuthModal('SIGNIN')}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
              {user?.displayName ? user.displayName.charAt(0) : 'U'}
            </div>
            <div>
              <p className="text-xs font-semibold text-white truncate max-w-[110px]">
                {user?.displayName || 'Sign In'}
              </p>
              <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{isFirebaseLive ? 'Firebase DB' : 'Custom Vault'}</span>
              </p>
            </div>
          </div>
          <RefreshCw className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
        </button>

        <div className="p-3 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/20 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-300 font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Hallucination Match</span>
          </div>
          <p className="text-[10px] text-slate-400">Strict human approval safety gates enabled.</p>
        </div>
      </div>
    </aside>
  );
}
