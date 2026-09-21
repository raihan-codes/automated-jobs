'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
  Building2,
  Layers,
  Send,
  Eye
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { ApplicationStatus } from '@/types';
import { useAuth } from '@/lib/firebase/AuthContext';

const STAGES: { status: ApplicationStatus; label: string; color: string }[] = [
  { status: 'MATCHED', label: 'Matched & Analyzed', color: 'border-indigo-500/40 text-indigo-400' },
  { status: 'RESUME_READY', label: 'Resume Ready', color: 'border-purple-500/40 text-purple-400' },
  { status: 'WAITING_FOR_APPROVAL', label: 'Awaiting User Approval', color: 'border-amber-500/40 text-amber-400' },
  { status: 'SUBMITTED', label: 'Submitted', color: 'border-cyan-500/40 text-cyan-400' },
  { status: 'TRACKING', label: 'Active Tracking', color: 'border-emerald-500/40 text-emerald-400' }
];

export default function ApplicationsPipelinePage() {
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  const fetchApps = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/applications', {
        headers: {
          'x-user-id': activeUserId
        }
      });
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [activeUserId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Human-Gated Application Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Application Pipeline & Review Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track applications from initial discovery to human approval, submission, and interview tracking.
          </p>
        </div>

        <Link
          href="/jobs"
          className="glass-button-primary px-4 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 self-start md:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Discover New Roles</span>
        </Link>
      </div>

      {/* State Machine Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STAGES.map(stage => {
          const count = applications.filter(a => a.status === stage.status).length;
          return (
            <div
              key={stage.status}
              className={`p-3.5 rounded-xl bg-slate-900/80 border ${stage.color} flex flex-col justify-between space-y-2`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white leading-tight">{stage.label}</span>
                <span className="text-sm font-mono font-bold text-slate-200">{count}</span>
              </div>
              <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: count > 0 ? '100%' : '0%' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Active Applications ({applications.length})</span>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
            <FileCheck2 className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-white">No active applications in the pipeline</h3>
            <p className="text-xs text-slate-400">Discover matching jobs and click &quot;Tailor &amp; Apply&quot; to begin.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map(app => (
              <div
                key={app.id}
                className="glass-panel-interactive p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center p-2.5 shrink-0">
                    {app.job?.companyLogo ? (
                      <img src={app.job.companyLogo} alt={app.job.company} className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link href={`/applications/${app.id}`} className="text-base font-bold text-white hover:text-indigo-300 transition-colors">
                        {app.job?.title || 'Software Engineer'}
                      </Link>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                          app.status === 'WAITING_FOR_APPROVAL'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : app.status === 'TRACKING'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {app.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="font-semibold text-slate-200">{app.job?.company}</span>
                      <span>•</span>
                      <span>{app.job?.location || 'Remote'}</span>
                      <span>•</span>
                      <span className="text-indigo-300 font-medium font-mono">{app.matchScore}% Match</span>
                      <span>•</span>
                      <span>Automation: {app.automationEngine}</span>
                    </div>

                    {app.humanReviewNotes && (
                      <p className="text-xs text-amber-300/90 bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/30 flex items-center gap-2 mt-2">
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{app.humanReviewNotes}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/applications/${app.id}`}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      app.status === 'WAITING_FOR_APPROVAL'
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {app.status === 'WAITING_FOR_APPROVAL' ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Review & Approve</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </>
                    )}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
