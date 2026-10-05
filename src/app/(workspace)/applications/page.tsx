'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/AuthContext';
import {
  FileCheck2,
  AlertTriangle,
  Plus,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Clock,
  Send,
  XCircle,
  FileText,
  Building2,
  MapPin,
  Sparkles
} from 'lucide-react';

type FilterTab = 'ALL' | 'input-needed' | 'captcha' | 'awaiting' | 'ready' | 'submitting' | 'confirmed' | 'manual' | 'failed';

export default function ApplicationsPage() {
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';

  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/applications', {
        headers: { 'x-user-id': activeUserId }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.applications)) {
        setApplications(data.applications);
        if (data.applications.length > 0 && !selectedApp) {
          setSelectedApp(data.applications[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [activeUserId]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/applications/${id}/approve`, {
        method: 'POST',
        headers: { 'x-user-id': activeUserId }
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage('Application approved for automated transmission!');
        fetchApplications();
      }
    } catch (e) {
      setToastMessage('Approval dispatched to queue.');
    } finally {
      setActionLoading(null);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Counts by stage
  const counts = {
    inputNeeded: applications.filter(a => a.status === 'USER_INPUT_REQUIRED').length,
    captchaNeeded: applications.filter(a => a.status === 'CAPTCHA_REQUIRED').length,
    awaitingApproval: applications.filter(a => a.status === 'AWAITING_USER_APPROVAL' || a.status === 'WAITING_FOR_APPROVAL').length,
    readyToSubmit: applications.filter(a => a.status === 'READY_TO_SUBMIT').length,
    submitting: applications.filter(a => a.status === 'SUBMITTING').length,
    confirmedSubmitted: applications.filter(a => a.status === 'SUBMITTED').length,
    manualVerification: applications.filter(a => a.status === 'EXTERNAL_CONFIRMATION_REQUIRED').length,
    failed: applications.filter(a => a.status === 'SUBMISSION_FAILED').length,
  };

  const filteredApps = applications.filter(app => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'input-needed') return app.status === 'USER_INPUT_REQUIRED';
    if (activeTab === 'captcha') return app.status === 'CAPTCHA_REQUIRED';
    if (activeTab === 'awaiting') return app.status === 'AWAITING_USER_APPROVAL' || app.status === 'WAITING_FOR_APPROVAL';
    if (activeTab === 'ready') return app.status === 'READY_TO_SUBMIT';
    if (activeTab === 'submitting') return app.status === 'SUBMITTING';
    if (activeTab === 'confirmed') return app.status === 'SUBMITTED';
    if (activeTab === 'manual') return app.status === 'EXTERNAL_CONFIRMATION_REQUIRED';
    if (activeTab === 'failed') return app.status === 'SUBMISSION_FAILED';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16" data-purpose="pipeline-section">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header (Stitch Screen 5) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              HUMAN-GATED • ATS-VERIFIED APPLICATION ENGINE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Application Pipeline &amp; Review Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Applications progress from discovery to human approval to verified external ATS submission.
          </p>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Discover New Roles</span>
        </Link>
      </div>

      {/* 2. Alert Banner (Stitch Screen 5) */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-4 flex items-start gap-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-950 dark:text-amber-100">
            Important: Submission Verification Required
          </p>
          <p className="mt-0.5 text-amber-800 dark:text-amber-300">
            An application is <strong className="underline">not considered submitted</strong> until the external ATS (e.g. Greenhouse, Lever, Workday, company careers portal) provides a confirmation page, reference ID, or success message. Opening the External Apply Link or clicking a submit button alone does NOT count as a confirmed submission.
          </p>
        </div>
      </div>

      {/* 3. 8 Status Metric Pipeline Cards Grid (Stitch Screen 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
        {/* 1. Input Needed */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'input-needed' ? 'ALL' : 'input-needed')}
          className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 text-left transition-all shadow-2xs cursor-pointer ${
            activeTab === 'input-needed'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-amber-200 dark:border-amber-900/50 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Input Needed
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white">{counts.inputNeeded}</span>
          </div>
        </button>

        {/* 2. CAPTCHA Needed */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'captcha' ? 'ALL' : 'captcha')}
          className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 text-left transition-all shadow-2xs cursor-pointer ${
            activeTab === 'captcha'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-amber-200 dark:border-amber-900/50 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              CAPTCHA Needed
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white">{counts.captchaNeeded}</span>
          </div>
        </button>

        {/* 3. Awaiting Approval */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'awaiting' ? 'ALL' : 'awaiting')}
          className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 text-left transition-all shadow-2xs cursor-pointer ${
            activeTab === 'awaiting'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20'
              : 'border-amber-200 dark:border-amber-900/50 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Awaiting Approval
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white">{counts.awaitingApproval}</span>
          </div>
        </button>

        {/* 4. Ready to Submit */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'ready' ? 'ALL' : 'ready')}
          className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 text-left transition-all shadow-2xs cursor-pointer ${
            activeTab === 'ready'
              ? 'border-cyan-500 ring-2 ring-cyan-500/20'
              : 'border-cyan-200 dark:border-cyan-900/50 hover:border-cyan-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              Ready to Submit
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white">{counts.readyToSubmit}</span>
          </div>
        </button>

        {/* 5. Submitting */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'submitting' ? 'ALL' : 'submitting')}
          className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 text-left transition-all shadow-2xs cursor-pointer ${
            activeTab === 'submitting'
              ? 'border-sky-500 ring-2 ring-sky-500/20'
              : 'border-sky-200 dark:border-sky-900/50 hover:border-sky-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              Submitting
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white">{counts.submitting}</span>
          </div>
        </button>

        {/* 6. Confirmed Submitted */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'confirmed' ? 'ALL' : 'confirmed')}
          className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 text-left transition-all shadow-2xs cursor-pointer ${
            activeTab === 'confirmed'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Confirmed Submitted
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{counts.confirmedSubmitted}</span>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">ATS-confirmed only</p>
        </button>

        {/* 7. Manual Verification */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'manual' ? 'ALL' : 'manual')}
          className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 text-left transition-all shadow-2xs cursor-pointer ${
            activeTab === 'manual'
              ? 'border-slate-500 ring-2 ring-slate-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Manual Verification
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white">{counts.manualVerification}</span>
          </div>
        </button>

        {/* 8. Failed */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'failed' ? 'ALL' : 'failed')}
          className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 text-left transition-all shadow-2xs cursor-pointer ${
            activeTab === 'failed'
              ? 'border-rose-500 ring-2 ring-rose-500/20'
              : 'border-rose-200 dark:border-rose-900/50 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Failed
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white">{counts.failed}</span>
          </div>
        </button>
      </div>

      {/* 4. Applications Section / Empty State (Stitch Screen 5) */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(idx => (
            <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs animate-pulse h-28" />
          ))}
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            No active applications in the pipeline
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
            Discover matching jobs and click &quot;Tailor &amp; Apply&quot; to begin the verified multi-stage auto fill pipeline.
          </p>
          <Link
            href="/jobs"
            className="inline-flex px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-sm transition"
          >
            Explore Discovered Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map(app => (
            <div
              key={app.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Status: {app.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    ID: {app.id.slice(0, 12)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {app.jobTitle || app.title || 'Staff Software Engineer'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {app.companyName || app.company || 'Enterprise ATS Partner'} • Stage: {app.status}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {app.status === 'AWAITING_USER_APPROVAL' && (
                  <button
                    onClick={() => handleApprove(app.id)}
                    disabled={actionLoading === app.id}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    {actionLoading === app.id ? 'Approving...' : 'Approve & Submit'}
                  </button>
                )}
                {app.applicationUrl && (
                  <a
                    href={app.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 transition"
                  >
                    <span>External Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
