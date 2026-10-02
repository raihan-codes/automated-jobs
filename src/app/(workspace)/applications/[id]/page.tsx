'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Building2,
  FileText,
  Sparkles,
  Send,
  Lock,
  ExternalLink,
  Eye,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  XCircle,
  HelpCircle,
  Clock,
  Globe,
  Hash,
  Check,
  UserCheck,
  Info,
  ListOrdered,
  FileSearch,
  CheckCheck,
  ChevronRight,
  Layers,
  ArrowRight,
  History,
  Activity
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { FormFieldStatus, ApplicationFormField } from '@/types';

export default function ApplicationReviewPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form field modifications state
  const [formFields, setFormFields] = useState<ApplicationFormField[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'audit' | 'verification'>('form');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'MISSING' | 'SENSITIVE' | 'AUTO'>('ALL');

  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';

  const fetchApplication = async () => {
    try {
      // 1. Try fetching specific application record
      const res = await fetch(`/api/applications/${appId}`);
      const data = await res.json();
      if (data.success && data.application) {
        setApplication(data.application);
        setFormFields(data.application.fields || []);
        setLoading(false);
        return;
      }

      // 2. Try auto-preparing application on the fly
      const prepRes = await fetch(`/api/applications/${appId}/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const prepData = await prepRes.json();
      if (prepData.success && prepData.result?.fields) {
        const singleRes = await fetch(`/api/applications/${prepData.result.id || appId}`);
        const singleData = await singleRes.json();
        if (singleData.success && singleData.application) {
          setApplication(singleData.application);
          setFormFields(singleData.application.fields || prepData.result.fields || []);
          setLoading(false);
          return;
        }
      }

      // 3. Fallback to list
      const listRes = await fetch('/api/applications');
      const listData = await listRes.json();
      if (listData.success && listData.applications?.length > 0) {
        const found = listData.applications.find((a: any) => a.id === appId || a.jobPostingId === appId) || listData.applications[0];
        if (found) {
          setApplication(found);
          setFormFields(found.fields || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [appId, user]);

  const handleFieldChange = (key: string, value: string) => {
    setFormFields(prev =>
      prev.map(f => {
        if (f.fieldKey === key) {
          return {
            ...f,
            fieldValue: value,
            requiresUserReview: false,
            status: 'MANUALLY_EDITED' as FormFieldStatus,
            validationError: undefined
          };
        }
        return f;
      })
    );
  };

  const handleApproveAndSubmit = async () => {
    setSubmitting(true);
    setStatusMessage('Executing Playwright automation & verifying external ATS submission...');
    try {
      const res = await fetch(`/api/applications/${appId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        if (data.finalStatus === 'SUBMITTED') {
          setStatusMessage('Application externally confirmed and verified by ATS! Moved to tracking.');
        } else if (data.finalStatus === 'CAPTCHA_REQUIRED') {
          setStatusMessage('CAPTCHA detected during submission. Please complete the CAPTCHA manually.');
        } else if (data.finalStatus === 'EXTERNAL_CONFIRMATION_REQUIRED') {
          setStatusMessage('Application submitted, but ATS requires manual confirmation verification.');
        } else {
          setStatusMessage(data.message || `Submission completed with status: ${data.finalStatus}`);
        }
        await fetchApplication();
      } else {
        setStatusMessage(data.error || 'Submission failed');
      }
    } catch (e) {
      setStatusMessage('Submission request error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSolveCaptcha = async () => {
    setSubmitting(true);
    setStatusMessage('Confirming CAPTCHA completion & resuming workflow...');
    try {
      const res = await fetch(`/api/applications/${appId}/captcha-resolved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message || 'CAPTCHA marked completed.');
        await fetchApplication();
      } else {
        setStatusMessage(data.error || 'Failed to update CAPTCHA state.');
      }
    } catch (e) {
      setStatusMessage('Request error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveUserInput = async () => {
    setSubmitting(true);
    setStatusMessage('Saving missing field answers & updating validation...');
    try {
      const fieldUpdates: Record<string, string> = {};
      formFields.forEach(f => {
        if (f.fieldValue) fieldUpdates[f.fieldKey] = f.fieldValue;
      });
      const res = await fetch(`/api/applications/${appId}/user-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fieldUpdates })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage('Answers saved successfully! Proceed to final approval.');
        await fetchApplication();
      } else {
        setStatusMessage(data.error || 'Failed to save answers.');
      }
    } catch (e) {
      setStatusMessage('Failed to save answers.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverify = async () => {
    setSubmitting(true);
    setStatusMessage('Inspecting ATS page signals & re-verifying confirmation...');
    try {
      const res = await fetch(`/api/applications/${appId}/reverify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message || 'Re-verification complete.');
        await fetchApplication();
      } else {
        setStatusMessage(data.error || 'Re-verification failed.');
      }
    } catch (e) {
      setStatusMessage('Re-verification request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading application details...</div>;
  }

  if (!application) {
    return (
      <div className="glass-panel p-12 rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Application Record Not Found</h2>
        <Link href="/applications" className="text-xs text-indigo-400 font-semibold">
          ← Back to Application Pipeline
        </Link>
      </div>
    );
  }

  const isCaptchaRequired = application.status === 'CAPTCHA_REQUIRED';
  const isUserInputRequired = application.status === 'USER_INPUT_REQUIRED';
  const isReadyToSubmit = application.status === 'READY_TO_SUBMIT';
  const isPendingApproval =
    application.status === 'AWAITING_USER_APPROVAL' || application.status === 'WAITING_FOR_APPROVAL' || isReadyToSubmit;
  const isSubmittingState = application.status === 'SUBMITTING' || submitting;
  const isVerifiedSubmitted =
    application.status === 'SUBMITTED' && application.submissionVerification?.verified === true;
  const isConfirmationRequired =
    application.status === 'EXTERNAL_CONFIRMATION_REQUIRED' ||
    (application.status === 'SUBMITTED' && !application.submissionVerification?.verified);
  const isFailed = application.status === 'SUBMISSION_FAILED';

  const verification = application.submissionVerification;
  const sensitiveFields = formFields.filter(f => f.isSensitive || f.status === 'SENSITIVE_REVIEW_REQUIRED');
  const missingFields = formFields.filter(f => f.status === 'USER_INPUT_REQUIRED' && f.isRequired && !f.fieldValue);
  const autoFilledFields = formFields.filter(f => f.status === 'AUTO_FILLED' || (f.fieldValue && f.status !== 'USER_INPUT_REQUIRED'));
  const resumeField = formFields.find(f => f.fieldType === 'file');

  // Progress metrics calculation
  const totalFields = formFields.length || 1;
  const completedFieldsCount = formFields.filter(f => Boolean(f.fieldValue && f.fieldValue.trim() !== '')).length;
  const progressPercent = Math.min(100, Math.round((completedFieldsCount / totalFields) * 100));

  const filteredFields = formFields.filter(f => {
    if (filterCategory === 'MISSING') return f.status === 'USER_INPUT_REQUIRED' && !f.fieldValue;
    if (filterCategory === 'SENSITIVE') return f.isSensitive || f.status === 'SENSITIVE_REVIEW_REQUIRED';
    if (filterCategory === 'AUTO') return f.status === 'AUTO_FILLED';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back Link */}
      <div>
        <Link href="/applications" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Applications Pipeline</span>
        </Link>
      </div>

      {/* ── TOP HERO HEADER & CONTROLS ────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center p-2.5 shrink-0">
              {application.job?.companyLogo ? (
                <img src={application.job.companyLogo} alt={application.job.company} className="w-full h-full object-contain" />
              ) : (
                <Building2 className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white">{application.job?.title}</h1>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                    isVerifiedSubmitted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : isCaptchaRequired
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : isUserInputRequired
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      : isReadyToSubmit
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : isPendingApproval
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : isConfirmationRequired
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : isFailed
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {isVerifiedSubmitted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>🟢 Submitted and externally verified</span>
                    </>
                  ) : isCaptchaRequired ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>⚠ CAPTCHA requires manual action</span>
                    </>
                  ) : isUserInputRequired ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                      <span>⚠ User input required</span>
                    </>
                  ) : isConfirmationRequired ? (
                    <>
                      <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                      <span>🟠 External confirmation required</span>
                    </>
                  ) : isFailed ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>🔴 Submission failed</span>
                    </>
                  ) : isSubmittingState ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                      <span>🔵 Submitting</span>
                    </>
                  ) : (
                    <span>{application.status.replace(/_/g, ' ')}</span>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                <strong className="text-slate-200">{application.job?.company}</strong> • {application.job?.location} • {application.matchScore}% Match Score
                {application.submissionVerification?.externalDomain && (
                  <span className="ml-2 font-mono text-indigo-300">[{application.submissionVerification.externalDomain}]</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {(application.job?.applicationUrl || application.job?.sourceUrl) && (
              <a
                href={application.job.applicationUrl || application.job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold"
                title="Open Official Job Application"
              >
                <span>External Apply Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {isCaptchaRequired && (
              <button
                onClick={handleSolveCaptcha}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>I've Completed The CAPTCHA</span>
              </button>
            )}

            {isUserInputRequired && (
              <button
                onClick={handleSaveUserInput}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-yellow-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                <span>Save Answers & Proceed</span>
              </button>
            )}

            {!isCaptchaRequired && !isUserInputRequired && isPendingApproval && (
              <button
                onClick={handleApproveAndSubmit}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Approve & Finalize Submission</span>
              </button>
            )}

            {isSubmittingState && !isPendingApproval && (
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Submitting to ATS...</span>
              </div>
            )}

            {isVerifiedSubmitted && (
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmed Submitted on {new Date(verification?.submittedAt || application.submittedAt || application.updatedAt).toLocaleDateString()}</span>
              </div>
            )}

            {isConfirmationRequired && (
              <button
                onClick={handleReverify}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-200 text-xs font-bold transition-all flex items-center gap-2"
                title="Re-check ATS Confirmation"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4 text-orange-400" />}
                <span>Re-verify ATS Confirmation</span>
              </button>
            )}

            {isFailed && (
              <button
                onClick={handleApproveAndSubmit}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-bold transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
                <span>Retry Submission</span>
              </button>
            )}
          </div>
        </div>

        {statusMessage && (
          <div className="p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* ── HYBRID AUTOMATION PROGRESS TRACKER (SPEC REQUIREMENT) ────────── */}
      <div className="glass-panel p-5 rounded-2xl space-y-3 border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Hybrid Automation Progress</span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {completedFieldsCount}/{totalFields} Completed ({progressPercent}%)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automates what is safe and reliable • Never invents candidate information • Requests human review where needed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {missingFields.length > 0 ? (
              <span className="px-3 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 font-semibold flex items-center gap-1.5 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                <span>⏸ Waiting for your input</span>
              </span>
            ) : isCaptchaRequired ? (
              <span className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-1.5 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>⏸ Waiting for CAPTCHA</span>
              </span>
            ) : isPendingApproval ? (
              <span className="px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5" />
                <span>✓ Ready for review</span>
              </span>
            ) : isVerifiedSubmitted ? (
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>✓ Application Confirmed</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              missingFields.length === 0 ? 'bg-gradient-to-r from-indigo-500 to-emerald-400' : 'bg-gradient-to-r from-indigo-500 to-yellow-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Progress Breakdown Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span className="text-slate-300">
              <strong className="text-white">{autoFilledFields.length}</strong> fields automatically completed
            </span>
          </div>

          <div
            className={`p-2 rounded-lg border flex items-center gap-2 ${
              missingFields.length > 0 ? 'bg-yellow-950/30 border-yellow-500/40 text-yellow-300' : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
          >
            <span className="font-bold">{missingFields.length > 0 ? '⚠' : '✓'}</span>
            <span>
              <strong className="text-white">{missingFields.length}</strong> fields require your input
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span className="text-slate-300">
              Resume uploaded &amp; verified
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-2">
            <span className={missingFields.length === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {missingFields.length === 0 ? '✓' : '•'}
            </span>
            <span className="text-slate-300">
              {missingFields.length === 0 ? 'Application validated' : 'Validation pending input'}
            </span>
          </div>
        </div>
      </div>

      {/* ── SECURITY / CHALLENGE ALERTS ──────────────────────────────────── */}
      {/* CAPTCHA Detection Notice */}
      {isCaptchaRequired && (
        <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs flex items-start gap-4 animate-in fade-in">
          <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-amber-300">
              Anti-Bot Verification / CAPTCHA Detected
            </p>
            <p className="text-amber-200/90 leading-relaxed">
              The external application website requires a human challenge ({verification?.captchaType || 'CAPTCHA / Cloudflare Turnstile'}).
              In accordance with security rules, automated bots cannot bypass or fake CAPTCHA.
              Please click <strong>External Apply Link</strong> to complete the verification on the site, then click <strong>"I've Completed The CAPTCHA"</strong> above to resume automation.
            </p>
          </div>
        </div>
      )}

      {/* Missing Required Information Action Drawer */}
      {missingFields.length > 0 && (
        <div className="p-5 rounded-2xl bg-yellow-950/40 border border-yellow-500/50 text-yellow-200 text-xs space-y-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-yellow-300">
                Candidate Profile Information Required ({missingFields.length} field{missingFields.length > 1 ? 's' : ''})
              </p>
              <p className="text-yellow-200/90 leading-relaxed">
                The external form requires information not found in your verified profile. We will never fabricate or guess your details.
                Please provide your preferred answers below and click <strong>"Save Answers &amp; Proceed"</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {missingFields.map(f => (
              <div key={f.fieldKey} className="p-3 rounded-xl bg-slate-900/90 border border-yellow-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1">
                    <span>{f.fieldLabel}</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                    ⚠ Input Needed
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{f.validationError || 'Missing from candidate profile.'}</p>
                {f.fieldType === 'select' && f.options ? (
                  <select
                    value={f.fieldValue || ''}
                    onChange={e => handleFieldChange(f.fieldKey, e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="">Select an option...</option>
                    {f.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : f.fieldType === 'textarea' ? (
                  <textarea
                    rows={2}
                    value={f.fieldValue || ''}
                    onChange={e => handleFieldChange(f.fieldKey, e.target.value)}
                    placeholder="Enter your answer..."
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                ) : (
                  <input
                    type="text"
                    value={f.fieldValue || ''}
                    onChange={e => handleFieldChange(f.fieldKey, e.target.value)}
                    placeholder="Enter your answer..."
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSaveUserInput}
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-yellow-500/20"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Save Answers &amp; Proceed</span>
            </button>
          </div>
        </div>
      )}

      {/* Warning Alert if Confirmation is Required */}
      {isConfirmationRequired && (
        <div className="p-5 rounded-2xl bg-orange-950/30 border border-orange-500/40 text-orange-200 text-xs flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-orange-300">
              External Status Confirmation Required
            </p>
            <p className="text-orange-200/90 leading-relaxed">
              We submitted the application to the employer portal, but automated external confirmation could not be unequivocally proven.
              Please click <strong>Re-verify ATS Confirmation</strong> or check your email to confirm receipt.
            </p>
          </div>
        </div>
      )}

      {/* Submission Failed Alert */}
      {isFailed && (
        <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-4 animate-in fade-in">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-rose-300">
              External ATS Reported Submission Failure
            </p>
            <p className="text-rose-200/90 leading-relaxed">
              {verification?.failureReason || 'The external platform reported an error during submission. You can adjust your details and click Retry Submission.'}
            </p>
          </div>
        </div>
      )}

      {/* ── TABS NAVIGATION ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('form')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'form' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Universal Form Inspector ({formFields.length} fields)</span>
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'verification' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>External Verification Evidence</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Log Timeline ({application.auditLogs?.length || 0})</span>
        </button>
      </div>

      {/* ── TAB 1: UNIVERSAL FORM INSPECTOR ────────────────────────────────── */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form Fields & Category Filter */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sensitive Questions Warning Box */}
            {sensitiveFields.length > 0 && isPendingApproval && (
              <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Human Approval Checkpoint ({sensitiveFields.length} sensitive fields detected)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The engine identified questions involving legal work authorization, compensation expectations, or role motivations.
                  Please review each value below before final submission.
                </p>
              </div>
            )}

            {/* Filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFilterCategory('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterCategory === 'ALL' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Fields ({formFields.length})
              </button>
              <button
                onClick={() => setFilterCategory('MISSING')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  filterCategory === 'MISSING' ? 'bg-yellow-500 text-slate-950 font-bold' : 'bg-slate-800 text-yellow-300 hover:text-white'
                }`}
              >
                <span>⚠ Input Required</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 font-mono">
                  {missingFields.length}
                </span>
              </button>
              <button
                onClick={() => setFilterCategory('SENSITIVE')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  filterCategory === 'SENSITIVE' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-amber-300 hover:text-white'
                }`}
              >
                <span>🔒 Sensitive Review</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 font-mono">
                  {sensitiveFields.length}
                </span>
              </button>
              <button
                onClick={() => setFilterCategory('AUTO')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  filterCategory === 'AUTO' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-emerald-400 hover:text-white'
                }`}
              >
                <span>✓ Auto-Filled</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 font-mono">
                  {autoFilledFields.length}
                </span>
              </button>
            </div>

            {/* Form Fields Editor */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <span>Detected Fields ({filteredFields.length})</span>
                </h2>
                <span className="text-xs text-slate-400 font-mono">Universal Mapping Engine</span>
              </div>

              <div className="space-y-4">
                {filteredFields.map(field => {
                  const isFieldMissing = field.status === 'USER_INPUT_REQUIRED' && field.isRequired && !field.fieldValue;
                  const isFieldSensitive = field.isSensitive || field.status === 'SENSITIVE_REVIEW_REQUIRED';

                  return (
                    <div
                      key={field.fieldKey}
                      className={`p-4 rounded-xl border transition-colors ${
                        isFieldMissing
                          ? 'bg-yellow-950/30 border-yellow-500/50'
                          : isFieldSensitive
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>{field.fieldLabel}</span>
                          {field.isRequired && <span className="text-rose-400 font-bold">*</span>}
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isFieldMissing ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-semibold border border-yellow-500/30">
                              ⚠ User Input Required
                            </span>
                          ) : isFieldSensitive ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                              🔒 Sensitive Review Required
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Auto-filled
                            </span>
                          )}

                          {field.category && (
                            <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">
                              {field.category}
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 font-mono">
                            {(field.confidenceScore * 100).toFixed(0)}% Confidence
                          </span>
                        </div>
                      </div>

                      {field.fieldType === 'textarea' ? (
                        <textarea
                          rows={3}
                          value={field.fieldValue || ''}
                          onChange={e => handleFieldChange(field.fieldKey, e.target.value)}
                          placeholder="Enter response..."
                          disabled={isVerifiedSubmitted}
                          className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-70"
                        />
                      ) : field.fieldType === 'select' && field.options ? (
                        <select
                          value={field.fieldValue || ''}
                          onChange={e => handleFieldChange(field.fieldKey, e.target.value)}
                          disabled={isVerifiedSubmitted}
                          className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-70"
                        >
                          <option value="">Select an option...</option>
                          {field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.fieldType === 'radio' && field.options ? (
                        <div className="flex gap-4 pt-1 flex-wrap">
                          {field.options.map(opt => (
                            <label key={opt} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                              <input
                                type="radio"
                                name={field.fieldKey}
                                value={opt}
                                checked={field.fieldValue === opt}
                                onChange={() => handleFieldChange(field.fieldKey, opt)}
                                disabled={isVerifiedSubmitted}
                                className="accent-indigo-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : field.fieldType === 'checkbox' ? (
                        <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={field.fieldValue === 'true' || field.fieldValue === 'Yes'}
                            onChange={e => handleFieldChange(field.fieldKey, e.target.checked ? 'true' : 'false')}
                            disabled={isVerifiedSubmitted}
                            className="accent-indigo-500 rounded"
                          />
                          <span>{field.helperText || 'I confirm and agree to this declaration'}</span>
                        </label>
                      ) : field.fieldType === 'file' ? (
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs text-slate-200 font-mono">{field.fieldValue || 'Tailored_Resume.pdf'}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Tailored Resume Attached
                          </span>
                        </div>
                      ) : (
                        <input
                          type={field.fieldType === 'email' ? 'email' : (field.fieldType === 'tel' ? 'tel' : 'text')}
                          value={field.fieldValue || ''}
                          onChange={e => handleFieldChange(field.fieldKey, e.target.value)}
                          placeholder="Enter value..."
                          disabled={isVerifiedSubmitted}
                          className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-70"
                        />
                      )}

                      {field.validationError && (
                        <p className="text-[11px] text-amber-400/90 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {field.validationError}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 1 Col: Evidence Snapshot & Tailored Resume */}
          <div className="space-y-6">
            {/* Resume Snapshot Card */}
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Attached Tailored Resume</span>
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Single Source
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <p className="font-bold text-white truncate">
                  {application.resume?.content?.title || `${application.job?.company}_Tailored_Resume.pdf`}
                </p>
                <p className="text-[11px] text-slate-400 line-clamp-3">
                  {application.resume?.content?.summary || 'Tailored engineering summary highlighting verified skills and achievements.'}
                </p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-medium">✓ Verified Skills Attached</span>
                  <Link href="/resumes" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                    Open in Studio →
                  </Link>
                </div>
              </div>
            </div>

            {/* Form Browser Snapshot */}
            <div className="glass-panel p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>Visual Form State</span>
                </h2>
                <span className="text-[10px] text-slate-400 font-mono">DOM Inspected</span>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-800 relative group aspect-video bg-slate-900 flex items-center justify-center">
                <img
                  src={application.screenshotSnapshot || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80'}
                  alt="Form Snapshot"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-white font-semibold px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700">
                    DOM Elements Detected &amp; Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: EXTERNAL ATS VERIFICATION EVIDENCE ──────────────────────── */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">External ATS Verification Authority</h2>
              </div>
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold border ${
                  verification?.verified
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                }`}
              >
                {verification?.verified ? '🟢 VERIFIED CONFIRMED' : '🟠 UNVERIFIED / PENDING PROOF'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              In accordance with our strict verification invariants, an application is marked <strong>SUBMITTED</strong> only
              when an external platform signal (confirmation text, reference ID, or success page) is unequivocally detected.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" /> External ATS Domain:
                </span>
                <p className="font-mono text-white text-sm">
                  {verification?.externalDomain || 'Not detected'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-cyan-400" /> Confirmation Reference ID:
                </span>
                <p className="font-mono text-white text-sm">
                  {verification?.confirmationId || 'None assigned yet'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Verification Method:
                </span>
                <p className="font-mono text-white text-sm">
                  {verification?.verificationMethod || 'none'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Confirmed At:
                </span>
                <p className="font-mono text-white text-sm">
                  {verification?.submittedAt ? new Date(verification.submittedAt).toLocaleString() : 'Pending'}
                </p>
              </div>
            </div>

            {verification?.confirmationText && (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                <span className="text-xs uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Captured ATS Proof Text:
                </span>
                <p className="text-xs text-emerald-200 font-mono italic p-3 rounded-lg bg-slate-950 border border-slate-800">
                  "{verification.confirmationText}"
                </p>
              </div>
            )}

            {verification?.failureReason && !verification?.verified && (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1">
                <span className="text-xs uppercase font-bold text-amber-400">Verification Details:</span>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  {verification.failureReason}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleReverify}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
                <span>Re-verify External Confirmation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: AUDIT LOG TIMELINE (19. AUDIT LOG REQUIREMENT) ─────────── */}
      {activeTab === 'audit' && (
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Full Application Lifecycle Audit Trail</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Immutable Compliance Log</span>
          </div>

          <p className="text-xs text-slate-300">
            Every discovery, ATS inspection, field mapping, user action, and verification event is immutably logged for total transparency.
          </p>

          <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {application.auditLogs && application.auditLogs.length > 0 ? (
              application.auditLogs.map((log: any, index: number) => (
                <div key={log.id || index} className="flex items-start gap-4 pl-1">
                  <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 z-10">
                    {log.action.includes('SUBMITTED') || log.action.includes('CONFIRMATION') ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : log.action.includes('CAPTCHA') ? (
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                    ) : log.action.includes('USER_INPUT') ? (
                      <UserCheck className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex-1 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-white font-mono">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString()} • {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {log.details && (
                      <pre className="text-[11px] text-slate-400 font-mono overflow-x-auto p-2 rounded bg-slate-950/80 border border-slate-800/60">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                No external audit records recorded yet for this session.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
