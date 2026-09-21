'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuth } from '@/lib/firebase/AuthContext';
import { Sparkles, LogOut } from 'lucide-react';
import Link from 'next/link';

export function DashboardNavbar() {
  const { user, signOutUser } = useAuth();
  const router = useRouter();
  const [profileName, setProfileName] = React.useState(user?.displayName || 'Candidate');
  const [profileRole, setProfileRole] = React.useState('Job Seeker');

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
    <header className="h-16 glass-panel border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>4 ATS Feeds Ingesting</span>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
          <span className="text-slate-600">•</span>
          <span>Greenhouse</span>
          <span className="text-slate-600">•</span>
          <span>Lever</span>
          <span className="text-slate-600">•</span>
          <span>Ashby</span>
          <span className="text-slate-600">•</span>
          <span>Workable</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/upload"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Upload Resume</span>
        </Link>

        <NotificationDropdown />

        <div className="h-6 w-px bg-slate-800" />

        {/* User Profile Capsule */}
        <Link href="/profile" className="flex items-center gap-3 p-1 pl-2 pr-3 rounded-full bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center ring-1 ring-indigo-500/40">
            {profileName.charAt(0)}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-medium text-white leading-tight">{profileName}</p>
            <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{profileRole}</p>
          </div>
        </Link>

        <button
          onClick={handleSignOut}
          title="Sign out"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}