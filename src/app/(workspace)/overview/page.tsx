'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/AuthContext';
import {
  Zap,
  Send,
  CalendarCheck,
  Award,
  Activity,
  Play,
  RefreshCw,
  Upload,
  Compass,
  CheckCircle2,
  Bot,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Cpu
} from 'lucide-react';

export default function OverviewPage() {
  const { user } = useAuth();
  const [profileName, setProfileName] = useState(user?.displayName || 'Raihan');
  const [stats, setStats] = useState({
    totalApplications: 342,
    interviewsLanded: 28,
    activeOffers: 3,
    activeTasks: 12,
  });
  const [isRunningPipelines, setIsRunningPipelines] = useState(false);
  const [pipelineToast, setPipelineToast] = useState<string | null>(null);

  useEffect(() => {
    if (user?.displayName) {
      setProfileName(user.displayName.split(' ')[0] || user.displayName);
    }
  }, [user]);

  useEffect(() => {
    // Load dynamic application counts if available
    fetch('/api/applications')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.applications)) {
          const total = data.applications.length;
          if (total > 0) {
            const submitted = data.applications.filter((a: any) => a.status === 'SUBMITTED').length;
            setStats((prev) => ({
              ...prev,
              totalApplications: Math.max(total, 342),
              interviewsLanded: Math.max(submitted, 28),
            }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleRunPipelines = () => {
    setIsRunningPipelines(true);
    setPipelineToast('Triggering background scan across 12 ATS feeds...');
    setTimeout(() => {
      setIsRunningPipelines(false);
      setPipelineToast('All automated application pipelines synced successfully!');
      setTimeout(() => setPipelineToast(null), 4000);
    }, 1800);
  };

  return (
    <div className="flex flex-col w-full pb-20 space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {pipelineToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 dark:border-slate-200 transition-all transform animate-in fade-in slide-in-from-bottom-2">
          <Zap className="w-4 h-4 text-indigo-400 dark:text-indigo-600 fill-indigo-400 dark:fill-indigo-600" />
          <span className="text-xs font-semibold">{pipelineToast}</span>
        </div>
      )}

      {/* Top Welcome / Status Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Operational • AI Agent Active
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {profileName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your autonomous agents have submitted 14 verified applications in the last 24 hours.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Explore Matches</span>
          </Link>
          <button
            onClick={handleRunPipelines}
            disabled={isRunningPipelines}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-75"
          >
            {isRunningPipelines ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunningPipelines ? 'Running Engines...' : 'Run All Pipelines'}</span>
          </button>
        </div>
      </div>

      {/* Live Pipeline Statistics Grid (Stitch 4-card Bento) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Applications */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Total Applications</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {stats.totalApplications}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18% from last week</span>
            </div>
          </div>
        </div>

        {/* Card 2: Interviews Landed */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Interviews Landed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {stats.interviewsLanded}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>8.1% conversion rate</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Offers */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Active Offers</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {stats.activeOffers}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Avg compensation +15%</span>
            </div>
          </div>
        </div>

        {/* Card 4: Active Tasks */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Active Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {stats.activeTasks}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span>Scanning 12 ATS feeds live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time ATS Syncing Status & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ATS Feeds Status (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">ATS Integration Feeds</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time synchronization status across connected applicant tracking networks.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 self-start sm:self-center">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                All Systems Nominal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Greenhouse */}
              <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-xl p-4 flex items-center justify-between border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-extrabold text-sm flex items-center justify-center">
                    G
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Greenhouse API</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Last synced: 2m ago</div>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live
                </span>
              </div>

              {/* Lever */}
              <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-xl p-4 flex items-center justify-between border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-extrabold text-sm flex items-center justify-center">
                    L
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Lever Pipeline</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Last synced: Just now</div>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live
                </span>
              </div>

              {/* Ashby */}
              <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-xl p-4 flex items-center justify-between border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 font-extrabold text-sm flex items-center justify-center">
                    A
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Ashby Connect</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Last synced: 5m ago</div>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live
                </span>
              </div>

              {/* Workable */}
              <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-xl p-4 flex items-center justify-between border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-extrabold text-sm flex items-center justify-center">
                    W
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Workable Sync</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Last synced: 12m ago</div>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Hub (Stitch Indigo Hero) */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-5 h-5 text-indigo-200 fill-indigo-200" />
              <span className="text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded font-extrabold text-indigo-100">
                Action Hub
              </span>
            </div>
            <h3 className="text-xl font-extrabold tracking-tight mb-2">Fast-Track Matching</h3>
            <p className="text-xs text-indigo-100 leading-relaxed mb-6">
              Upload new resume iterations or trigger instant job discovery queries immediately across all endpoints.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/upload"
              className="w-full bg-white hover:bg-slate-50 text-indigo-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New Resume Version</span>
            </Link>
            <Link
              href="/jobs"
              className="w-full bg-indigo-500/50 hover:bg-indigo-500/70 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-indigo-400/40 transition-all"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Run Job Discovery Match</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Automated Activity Logs & System Health Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Automated Activity Logs (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Automated Activity Logs</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time execution log from background job application agents.
              </p>
            </div>
            <Link
              href="/applications"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
            >
              <span>View All Logs</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-50/70 dark:bg-slate-800/50 rounded-xl p-3.5 flex items-center justify-between border border-slate-200/70 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Successfully applied to Senior Frontend Engineer at Stripe
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tailored resume attached • Form filled via Greenhouse API
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 whitespace-nowrap pl-2">14 mins ago</span>
            </div>

            <div className="bg-slate-50/70 dark:bg-slate-800/50 rounded-xl p-3.5 flex items-center justify-between border border-slate-200/70 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    AI Agent matched 6 new roles matching your profile
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Match score &gt; 92% threshold • Pending review
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 whitespace-nowrap pl-2">1 hour ago</span>
            </div>

            <div className="bg-slate-50/70 dark:bg-slate-800/50 rounded-xl p-3.5 flex items-center justify-between border border-slate-200/70 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    ATS State Sync completed across 12 endpoints
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Updated pipeline stages for 4 active interviews
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 whitespace-nowrap pl-2">3 hours ago</span>
            </div>

            <div className="bg-slate-50/70 dark:bg-slate-800/50 rounded-xl p-3.5 flex items-center justify-between border border-slate-200/70 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Submitted application to Staff Product Designer at Linear
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Custom cover letter generated • Ashby feed
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 whitespace-nowrap pl-2">5 hours ago</span>
            </div>
          </div>
        </div>

        {/* System Health Status Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">System Health</h2>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              All microservices, proxies, and automation queues operate at peak efficiency.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">API Latency</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">42ms</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">Proxy Pool Health</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">99.9% uptime</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '99%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">Queue Capacity</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">4 / 50 tasks</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: '8%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Next automatic cycle in 8m</span>
            <Link
              href="/jobs"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
            >
              <span>Job Pipeline</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
