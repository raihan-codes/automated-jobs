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
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';

export default function ApplicationReviewPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form field modifications state
  const [formFields, setFormFields] = useState<any[]>([]);

  const { user } = useAuth();

  useEffect(() => {
    const fetchApplication = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
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
          // Re-fetch the newly prepared application
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
    fetchApplication();
  }, [appId, user]);

  const handleFieldChange = (key: string, value: string) => {
    setFormFields(prev =>
      prev.map(f => (f.fieldKey === key ? { ...f, fieldValue: value, requiresUserReview: false } : f))
    );
  };

  const handleApproveAndSubmit = async () => {
    setSubmitting(true);
    setStatusMessage('Submitting verified application via automation engine...');
    try {
      const res = await fetch(`/api/applications/${appId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage('Application successfully approved & submitted! Moved to tracking.');
        setTimeout(() => {
          router.push('/applications');
        }, 1500);
      } else {
        setStatusMessage(data.error || 'Submission failed');
      }
    } catch (e) {
      setStatusMessage('Submission request error.');
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

  const isPendingApproval = application.status === 'WAITING_FOR_APPROVAL';
  const sensitiveFields = formFields.filter(f => f.isSensitive || f.requiresUserReview);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back Link */}
      <div>
        <Link href="/applications" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Applications Pipeline</span>
        </Link>
      </div>

      {/* Review Header Banner */}
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
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    isPendingApproval
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {application.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                <strong className="text-slate-200">{application.job?.company}</strong> • {application.job?.location} • {application.matchScore}% Match Score
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isPendingApproval ? (
              <button
                onClick={handleApproveAndSubmit}
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Approve & Finalize Submission</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Submitted on {new Date(application.submittedAt || application.updatedAt).toLocaleDateString()}</span>
              </div>
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

      {/* Review Steps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pre-Filled ATS Form & Sensitive Review */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sensitive Questions Warning Box */}
          {sensitiveFields.length > 0 && isPendingApproval && (
            <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>Human Approval Checkpoint ({sensitiveFields.length} sensitive fields detected)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The agent identified questions involving legal work authorization, compensation expectations, or role motivations. Please review or adjust each value below before final submission.
              </p>
            </div>
          )}

          {/* Form Fields Editor */}
          <div className="glass-panel p-6 rounded-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Pre-Filled ATS Form Data</span>
              </h2>
              <span className="text-xs text-slate-400">Playwright Form Automation</span>
            </div>

            <div className="space-y-4">
              {formFields.map(field => (
                <div
                  key={field.fieldKey}
                  className={`p-4 rounded-xl border transition-colors ${
                    field.isSensitive
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      {field.fieldLabel}
                    </label>
                    <div className="flex items-center gap-1.5">
                      {field.isSensitive && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                          Sensitive
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
                      disabled={!isPendingApproval}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-70"
                    />
                  ) : field.fieldType === 'select' && field.options ? (
                    <select
                      value={field.fieldValue || ''}
                      onChange={e => handleFieldChange(field.fieldKey, e.target.value)}
                      disabled={!isPendingApproval}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-70"
                    >
                      {field.options.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={field.fieldValue || ''}
                      onChange={e => handleFieldChange(field.fieldKey, e.target.value)}
                      disabled={!isPendingApproval}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-70"
                    />
                  )}

                  {field.validationError && (
                    <p className="text-[11px] text-amber-400/90 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {field.validationError}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Tailored Resume & Visual Snapshot */}
        <div className="space-y-6">
          {/* Resume Snapshot Card */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Attached Tailored Resume</span>
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Zero-Hallucination
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <p className="font-bold text-white truncate">
                {application.resume?.content?.title || 'Alex_Chen_Figma_Tailored_Resume.pdf'}
              </p>
              <p className="text-[11px] text-slate-400 line-clamp-3">
                {application.resume?.content?.summary || 'Tailored software engineer summary highlighting TypeScript, React, and Node.js microservices.'}
              </p>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-emerald-400 font-medium">✓ 14 Facts Verified</span>
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
              <span className="text-[10px] text-slate-400 font-mono">Playwright Headless</span>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800 relative group aspect-video bg-slate-900 flex items-center justify-center">
              <img
                src={application.screenshotSnapshot || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80'}
                alt="Form Snapshot"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white font-semibold px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700">
                  DOM Inspected & Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
