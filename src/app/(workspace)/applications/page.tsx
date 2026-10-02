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
  Eye,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { ApplicationStatus } from '@/types';
import { useAuth } from '@/lib/firebase/AuthContext';

// ── Pipeline stage definitions ───────────────────────────────────────────────

const PIPELINE_STAGES: {
  status: ApplicationStatus;
  label: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    status: 'USER_INPUT_REQUIRED',
    label: 'Input Needed',
    color: 'border-yellow-500/40 text-yellow-400',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  {
    status: 'CAPTCHA_REQUIRED',
    label: 'CAPTCHA Needed',
    color: 'border-amber-500/40 text-amber-400',
    icon: <ShieldAlert className="w-3 h-3" />,
  },
  {
    status: 'AWAITING_USER_APPROVAL',
    label: 'Awaiting Approval',
    color: 'border-amber-500/40 text-amber-400',
    icon: <ShieldAlert className="w-3 h-3" />,
  },
  {
    status: 'READY_TO_SUBMIT',
    label: 'Ready to Submit',
    color: 'border-cyan-500/40 text-cyan-400',
    icon: <Sparkles className="w-3 h-3" />,
  },
  {
    status: 'SUBMITTING',
    label: 'Submitting',
    color: 'border-blue-500/40 text-blue-400',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  {
    status: 'SUBMITTED',
    label: 'Confirmed Submitted',
    color: 'border-emerald-500/40 text-emerald-400',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  {
    status: 'EXTERNAL_CONFIRMATION_REQUIRED',
    label: 'Manual Verification',
    color: 'border-orange-500/40 text-orange-400',
    icon: <HelpCircle className="w-3 h-3" />,
  },
  {
    status: 'SUBMISSION_FAILED',
    label: 'Failed',
    color: 'border-rose-500/40 text-rose-400',
    icon: <XCircle className="w-3 h-3" />,
  },
];

// Also count legacy states
const LEGACY_AWAITING = ['WAITING_FOR_APPROVAL', 'APPLICATION_READY'];

// ── Status badge helper ───────────────────────────────────────────────────────

function StatusBadge({ status, verified }: { status: string; verified?: boolean }) {
  if (status === 'SUBMITTED' && verified) {
    return (
      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        🟢 Submitted and externally verified
      </span>
    );
  }

  if (status === 'SUBMITTED' && !verified) {
    return (
      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">
        <HelpCircle className="w-3 h-3 text-orange-400" />
        🟠 External confirmation required
      </span>
    );
  }

  if (status === 'EXTERNAL_CONFIRMATION_REQUIRED') {
    return (
      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">
        <HelpCircle className="w-3 h-3 text-orange-400" />
        🟠 External confirmation required
      </span>
    );
  }

  if (status === 'USER_INPUT_REQUIRED') {
    return (
      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 text-yellow-400" />
        ⚠ User input required
      </span>
    );
  }

  if (status === 'CAPTCHA_REQUIRED') {
    return (
      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
        <ShieldAlert className="w-3 h-3 text-amber-400" />
        ⚠ CAPTCHA requires manual action
      </span>
    );
  }

  if (status === 'AWAITING_USER_APPROVAL' || status === 'WAITING_FOR_APPROVAL') {
    return (
      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
        <ShieldAlert className="w-3 h-3 text-amber-400" />
        ⚠ Sensitive answer requires review
      </span>
    );
  }

  if (status === 'SUBMITTING') {
    return (
      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
        <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
        🔵 Submitting
      </span>
    );
  }

  if (status === 'SUBMISSION_FAILED') {
    return (
      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
        <XCircle className="w-3 h-3 text-rose-400" />
        🔴 Submission failed
      </span>
    );
  }

  const map: Record<string, string> = {
    READY_TO_SUBMIT:        'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    RESUME_READY:           'bg-purple-500/20 text-purple-300 border-purple-500/30',
    DISCOVERED:             'bg-slate-500/20 text-slate-300 border-slate-500/30',
    APPLICATION_DETECTED:   'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    FILLING_FORM:           'bg-sky-500/20 text-sky-300 border-sky-500/30',
    MATCHED:                'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    TRACKING:               'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  };

  const cls = map[status] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  return (
    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ApplicationsPipelinePage() {
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await fetch('/api/applications', {
        headers: { 'x-user-id': activeUserId }
      });
      const data = await res.json();
      if (data.success) setApplications(data.applications);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApps(); }, [activeUserId]);

  // Count for each pipeline stage
  const countFor = (status: ApplicationStatus) => {
    if (status === 'AWAITING_USER_APPROVAL') {
      return applications.filter(a =>
        a.status === 'AWAITING_USER_APPROVAL' || LEGACY_AWAITING.includes(a.status)
      ).length;
    }
    // SUBMITTED count = ONLY verified applications
    if (status === 'SUBMITTED') {
      return applications.filter(
        a => a.status === 'SUBMITTED' && a.submissionVerification?.verified === true
      ).length;
    }
    return applications.filter(a => a.status === status).length;
  };

  const totalVerifiedSubmitted = applications.filter(
    a => a.status === 'SUBMITTED' && a.submissionVerification?.verified === true
  ).length;

  const totalUnverified = applications.filter(
    a => a.status === 'EXTERNAL_CONFIRMATION_REQUIRED' ||
         (a.status === 'SUBMITTED' && !a.submissionVerification?.verified)
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Human-Gated · ATS-Verified Application Engine
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Application Pipeline &amp; Review Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Applications progress from discovery to human approval to verified external ATS submission.
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

      {/* Verification warning banner */}
      <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-amber-300">Important: Submission Verification Required</p>
          <p className="text-xs text-slate-300 leading-relaxed">
            An application is <strong className="text-white">not considered submitted</strong> until the external ATS
            (e.g. Greenhouse, Lever, Workday, company careers portal) provides a confirmation page, reference ID,
            or success message. Opening the External Apply Link or clicking a submit button alone does
            <strong className="text-rose-300"> NOT </strong> count as a confirmed submission.
          </p>
        </div>
      </div>

      {/* Pipeline stage cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {PIPELINE_STAGES.map(stage => {
          const count = countFor(stage.status);
          return (
            <div
              key={stage.status}
              className={`p-3.5 rounded-xl bg-slate-900/80 border ${stage.color} flex flex-col justify-between space-y-2`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {stage.icon}
                  <span className="text-xs font-bold text-white leading-tight">{stage.label}</span>
                </div>
                <span className="text-sm font-mono font-bold text-slate-200">{count}</span>
              </div>
              <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: count > 0 ? '100%' : '0%' }}
                />
              </div>
              {/* Special note for SUBMITTED stage */}
              {stage.status === 'SUBMITTED' && (
                <p className="text-[10px] text-emerald-400/80">
                  ATS-confirmed only
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      {(totalVerifiedSubmitted > 0 || totalUnverified > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-300">{totalVerifiedSubmitted} Externally Confirmed</p>
              <p className="text-[11px] text-slate-400">ATS returned a confirmation page or reference ID.</p>
            </div>
          </div>
          {totalUnverified > 0 && (
            <div className="p-4 rounded-xl bg-orange-950/30 border border-orange-500/30 flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-orange-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-orange-300">{totalUnverified} Awaiting Manual Verification</p>
                <p className="text-[11px] text-slate-400">Open the application detail to verify or re-submit.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Applications list */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>All Applications ({applications.length})</span>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
            <FileCheck2 className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-white">No active applications in the pipeline</h3>
            <p className="text-xs text-slate-400">
              Discover matching jobs and click &quot;Tailor &amp; Apply&quot; to begin.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map(app => {
              const isVerifiedSubmitted =
                app.status === 'SUBMITTED' && app.submissionVerification?.verified === true;
              const isUnverified =
                app.status === 'EXTERNAL_CONFIRMATION_REQUIRED' ||
                (app.status === 'SUBMITTED' && !app.submissionVerification?.verified);
              const isPendingApproval =
                app.status === 'AWAITING_USER_APPROVAL' ||
                LEGACY_AWAITING.includes(app.status);

              return (
                <div
                  key={app.id}
                  className={`glass-panel-interactive p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                    isUnverified ? 'border border-orange-500/20' : ''
                  }`}
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
                        <Link
                          href={`/applications/${app.id}`}
                          className="text-base font-bold text-white hover:text-indigo-300 transition-colors"
                        >
                          {app.job?.title || 'Software Engineer'}
                        </Link>
                        <StatusBadge
                          status={app.status}
                          verified={app.submissionVerification?.verified}
                        />
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="font-semibold text-slate-200">{app.job?.company}</span>
                        <span>•</span>
                        <span>{app.job?.location || 'Remote'}</span>
                        <span>•</span>
                        <span className="text-indigo-300 font-medium font-mono">
                          {app.matchScore}% Match
                        </span>
                        <span>•</span>
                        <span>Engine: {app.automationEngine}</span>
                      </div>

                      {/* Verified submission details */}
                      {isVerifiedSubmitted && app.submissionVerification && (
                        <div className="mt-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            External ATS Confirmed Submission
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-400">
                            {app.submissionVerification.submittedAt && (
                              <span>Submitted: {new Date(app.submissionVerification.submittedAt).toLocaleString()}</span>
                            )}
                            {app.submissionVerification.externalDomain && (
                              <span>ATS: {app.submissionVerification.externalDomain}</span>
                            )}
                            {app.submissionVerification.verificationMethod && (
                              <span>Method: {app.submissionVerification.verificationMethod.replace(/_/g, ' ')}</span>
                            )}
                            {app.submissionVerification.confirmationId && (
                              <span className="text-emerald-300 font-mono">
                                Ref: {app.submissionVerification.confirmationId}
                              </span>
                            )}
                          </div>
                          {app.submissionVerification.confirmationUrl && (
                            <a
                              href={app.submissionVerification.confirmationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                            >
                              View External Confirmation <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Unverified warning */}
                      {isUnverified && (
                        <p className="text-xs text-orange-300/90 bg-orange-950/40 p-2.5 rounded-xl border border-orange-500/30 flex items-center gap-2 mt-2">
                          <HelpCircle className="w-4 h-4 text-orange-400 shrink-0" />
                          <span>
                            External confirmation required — this application is{' '}
                            <strong>not yet considered submitted</strong>. Open to verify or re-submit.
                          </span>
                        </p>
                      )}

                      {/* Sensitive fields note */}
                      {isPendingApproval && app.humanReviewNotes && (
                        <p className="text-xs text-amber-300/90 bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/30 flex items-center gap-2 mt-2">
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{app.humanReviewNotes}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      href={`/applications/${app.id}`}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isPendingApproval
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                          : isUnverified
                          ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isPendingApproval ? (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Review &amp; Approve</span>
                        </>
                      ) : isUnverified ? (
                        <>
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Verify Submission</span>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
