'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { NotificationDropdown } from './NotificationDropdown';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useAuth } from '@/lib/firebase/AuthContext';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Upload,
  Compass,
  FileCheck2,
  FileText,
  Target,
  UserCircle2,
  ShieldCheck
} from 'lucide-react';

const mobileNavItems = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Upload Resume', href: '/upload', icon: Upload },
  { label: 'Job Discovery & Match', href: '/jobs', icon: Compass },
  { label: 'Application Pipeline', href: '/applications', icon: FileCheck2 },
  { label: 'Resume Studio', href: '/resumes', icon: FileText },
  { label: 'Resume Review & Jobs', href: '/resumes/review', icon: Target },
  { label: 'Candidate Profile', href: '/profile', icon: UserCircle2 },
];

export function DashboardNavbar() {
  const { user, signOutUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.displayName || 'Raihan Molla');
  const [profileRole, setProfileRole] = useState('Software Developer');

  React.useEffect(() => {
    if (user?.displayName) setProfileName(user.displayName);
  }, [user?.displayName]);

  React.useEffect(() => {
    fetch('/api/profile', {
      headers: user?.uid ? { 'x-user-id': user.uid } : undefined
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.profile) {
          if (data.profile.fullName) setProfileName(data.profile.fullName);
          if (data.profile.headline) {
            const role = data.profile.headline.split('—')[0] || data.profile.headline.split('|')[0];
            setProfileRole(role.trim() || 'Job Seeker');
          }
        }
      })
      .catch(() => {});
  }, [user?.uid]);

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/');
  };

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20" data-purpose="top-navigation">
        {/* Left items: Mobile Hamburger + Live ATS Feed Indicator */}
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>4 ATS Feeds Ingesting</span>
          </div>

          <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>•</span>
            <span className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default">Greenhouse</span>
            <span>•</span>
            <span className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default">Lever</span>
            <span>•</span>
            <span className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default">Ashby</span>
            <span>•</span>
            <span className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default">Workable</span>
          </div>
        </div>

        {/* Right items: Actions & Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <Link
            href="/upload"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200/80 dark:border-indigo-800 transition-all"
          >
            Upload Resume
          </Link>

          <ThemeToggle variant="pill" />

          <NotificationDropdown />

          {/* User Capsule */}
          <Link
            href="/profile"
            className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-indigo-50 dark:ring-indigo-950">
              {profileName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{profileName}</p>
              <p className="text-[10px] text-slate-400 truncate max-w-[130px]">{profileRole}</p>
            </div>
          </Link>

          {user && (
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between h-full z-10 shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <Link
                  href="/overview"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-base">Automated</span>
                    <span className="ml-1 text-[10px] font-bold px-1 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 uppercase">JOBS</span>
                  </div>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {mobileNavItems.map(item => {
                  const isActive = pathname === item.href || (item.href !== '/overview' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Appearance</span>
                <ThemeToggle variant="pill" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}