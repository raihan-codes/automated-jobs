'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ExternalLink,
  Bot,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    const fetchJob = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/jobs');
        const data = await res.json();
        if (data.success) {
          const found = data.jobs.find((j: any) => j.id === jobId || j.sourceJobId === jobId);
          setJob(found);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId, user]);

  const handleGenerateResumeAndPrepare = async () => {
    setActionLoading(true);
    setActionMessage('Generating truthful JD-tailored resume & pre-filling ATS form with Playwright...');
    try {
      // 1. Tailor Resume
      const resResume = await fetch('/api/resumes/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
      });
      const dataResume = await resResume.json();

      if (!dataResume.success) {
        throw new Error(dataResume.error || 'Failed to tailor resume');
      }

      // 2. Prepare Application via Automation Worker
      const resPrep = await fetch(`/api/applications/${job.id}/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const dataPrep = await resPrep.json();

      if (dataPrep.success) {
        setActionMessage('Application prepared and paused at Human Approval checkpoint! Redirecting to review...');
        setTimeout(() => {
          router.push(`/applications/${dataPrep.result?.fields ? 'app_' + job.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '_1' : ''}`);
        }, 1500);
      } else {
        router.push('/applications');
      }
    } catch (e: any) {
      setActionMessage(e.message || 'Operation failed');
      setTimeout(() => router.push('/applications'), 1500);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading job details and match analytics...</div>;
  }

  if (!job) {
    return (
      <div className="glass-panel p-12 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Job Posting Not Found</h2>
        <Link href="/jobs" className="text-xs text-indigo-400 font-semibold">
          ← Back to Discovery Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back Link */}
      <div>
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Discovered Jobs</span>
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center p-3 shrink-0">
              {job.companyLogo ? (
                <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-white">{job.title}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {job.sourcePlatform}
                </span>
                {job.isRemote && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Remote
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                <span className="font-semibold text-slate-200 text-sm">{job.company}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> {job.location}
                </span>
                {job.salaryMin && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5" />
                      ₹{(job.salaryMin / 100000).toFixed(0)}{job.salaryMax ? ` - ₹${(job.salaryMax / 100000).toFixed(0)}` : ''} LPA
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Posted {new Date(job.postedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={job.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Open Official Job Posting"
            >
              <ExternalLink className="w-5 h-5" />
            </a>

            <button
              onClick={handleGenerateResumeAndPrepare}
              disabled={actionLoading}
              className="glass-button-primary px-6 py-3 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span>{actionLoading ? 'Preparing Application...' : 'Tailor Resume & Prepare Application'}</span>
            </button>
          </div>
        </div>

        {actionMessage && (
          <div className="p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
      </div>

      {/* Two Column Layout: Match Insights & Parsed Description */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Match Deep Breakdown */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>AI Match Analytics</span>
              </h2>
              <span className="text-base font-extrabold text-indigo-300">{job.matchScore}% Match</span>
            </div>

            {/* Score Bars */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Skills Overlap</span>
                  <span className="text-white font-medium">{job.matchResult?.skillsScore || 95}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                    style={{ width: `${job.matchResult?.skillsScore || 95}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Experience Calibration</span>
                  <span className="text-white font-medium">{job.matchResult?.experienceScore || 92}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                    style={{ width: `${job.matchResult?.experienceScore || 92}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Domain & Title Affinity</span>
                  <span className="text-white font-medium">{job.matchResult?.domainScore || 90}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                    style={{ width: `${job.matchResult?.domainScore || 90}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Why You Match */}
            {job.matchResult && (
              <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                <h3 className="font-semibold text-white">Why You Match</h3>
                <p className="text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  {job.matchResult.whyMatchReason}
                </p>

                {job.matchResult.potentialConcerns && (
                  <div className="pt-2">
                    <h3 className="font-semibold text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Considerations
                    </h3>
                    <p className="text-slate-300 mt-1">{job.matchResult.potentialConcerns}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Extracted Skills Badges */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Matched Skills from Profile</span>
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {(job.matchResult?.matchedSkills || ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker']).map((s: string) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                >
                  ✓ {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Full Job Description */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Job Description & Requirements</span>
            </h2>
            <span className="text-xs text-slate-400">Parsed from ATS Feed</span>
          </div>

          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans space-y-4">
            {job.descriptionRaw}
          </div>
        </div>
      </div>
    </div>
  );
}
