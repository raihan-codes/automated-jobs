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
import { useAuth } from '@/lib/firebase/AuthContext';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = (params.id as string) || '';

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { user, openAuthModal } = useAuth();
  const activeUserId = user?.uid || '';

  useEffect(() => {
    let isMounted = true;

    const fetchJob = async () => {
      if (!jobId) {
        if (isMounted) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Try fetching from the dedicated single job API endpoint
        const headers: Record<string, string> = {};
        if (activeUserId) headers['x-user-id'] = activeUserId;

        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { headers });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.job && isMounted) {
            setJob(data.job);
            setLoading(false);
            return;
          }
        }

        // 2. Fallback: Query all jobs list and match by id or sourceJobId
        const listRes = await fetch('/api/jobs', { headers });

        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData.success && Array.isArray(listData.jobs)) {
            const normalizedId = decodeURIComponent(jobId).trim().toLowerCase();
            const found = listData.jobs.find(
              (j: any) =>
                j.id === jobId ||
                j.sourceJobId === jobId ||
                j.id?.toLowerCase() === normalizedId ||
                j.sourceJobId?.toLowerCase() === normalizedId ||
                j.id?.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedId.replace(/[^a-z0-9]/g, '')
            );
            if (found && isMounted) {
              setJob(found);
              setLoading(false);
              return;
            }
          }
        }

        if (isMounted) {
          setJob(null);
        }
      } catch (e) {
        console.error('Error fetching job details:', e);
        if (isMounted) {
          setJob(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchJob();

    return () => {
      isMounted = false;
    };
  }, [jobId, activeUserId]);

  const handleGenerateResumeAndPrepare = async () => {
    if (!job) return;

    if (!user && !activeUserId) {
      setActionMessage('Please sign in or create an account to tailor your resume and prepare your application.');
      if (openAuthModal) {
        openAuthModal('SIGNIN');
      }
      return;
    }

    const currentUserId = user?.uid || activeUserId || 'user_raihan_molla';
    setActionLoading(true);
    setActionMessage('Generating truthful JD-tailored resume & pre-filling ATS form with Playwright...');
    try {
      // 1. Tailor Resume
      const resResume = await fetch('/api/resumes/tailor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify({ jobId: job.id, userId: currentUserId })
      });

      if (resResume.status === 401) {
        setActionMessage('Session expired or login required. Opening sign-in...');
        if (openAuthModal) openAuthModal('SIGNIN');
        return;
      }

      const dataResume = await resResume.json();
      if (!dataResume.success) {
        throw new Error(dataResume.error || 'Failed to tailor resume');
      }

      // 2. Prepare Application via Automation Worker
      const resPrep = await fetch(`/api/applications/${encodeURIComponent(job.id)}/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (resPrep.status === 401) {
        setActionMessage('Session expired or login required. Opening sign-in...');
        if (openAuthModal) openAuthModal('SIGNIN');
        return;
      }

      const dataPrep = await resPrep.json();

      if (dataPrep.success && dataPrep.result?.id) {
        setActionMessage('Application prepared and saved! Redirecting to review checkpoint...');
        setTimeout(() => {
          router.push(`/applications/${dataPrep.result.id}`);
        }, 1200);
      } else if (dataPrep.success) {
        setActionMessage('Application created. Navigating to applications list...');
        setTimeout(() => router.push('/applications'), 1200);
      } else {
        setActionMessage(dataPrep.error || 'Failed to prepare application');
        setTimeout(() => setActionLoading(false), 2500);
        return;
      }
    } catch (e: any) {
      setActionMessage(e.message || 'Operation failed');
      setTimeout(() => setActionLoading(false), 2500);
      return;
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-16 rounded-2xl text-center space-y-4 max-w-xl mx-auto my-12 animate-in fade-in">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white">Loading job details...</h2>
          <p className="text-xs text-slate-400 font-mono">Computing personalized match score &amp; JD requirements</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="glass-panel p-12 rounded-2xl text-center space-y-4 max-w-xl mx-auto my-12 animate-in fade-in">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">Job Posting Not Found</h2>
          <p className="text-xs text-slate-400">
            The job posting ID <code className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">{jobId}</code> could not be located in the active ingestion feed.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Discovery Feed</span>
          </Link>
        </div>
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
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  job.sourcePlatform === 'ADZUNA'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                }`}>
                  Source: {job.sourcePlatform === 'ADZUNA' ? 'Adzuna' : 'Jooble'}
                </span>
                {job.isRemote && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Remote
                  </span>
                )}
                {(() => {
                  const daysOld = Math.max(0, (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24));
                  if (daysOld <= 7) {
                    return (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        🔥 Highly Recent
                      </span>
                    );
                  }
                  if (daysOld <= 30) {
                    return (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        ⚡ Recent
                      </span>
                    );
                  }
                  if (daysOld <= 60) {
                    return (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ⏳ Older (31-60d)
                      </span>
                    );
                  }
                  return (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-800 text-slate-400 border border-slate-700">
                      Archived (&gt;60d)
                    </span>
                  );
                })()}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                <span className="font-semibold text-slate-200 text-sm">{job.company}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> {job.location}
                </span>
                <span>•</span>
                {job.salaryMin || job.salaryMax ? (
                  <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1">
                    {job.salaryMin && job.salaryMax ? (
                      job.salaryCurrency === 'INR'
                        ? `₹${(job.salaryMin / 100000).toFixed(1)} - ₹${(job.salaryMax / 100000).toFixed(1)} LPA`
                        : `${job.salaryCurrency} ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`
                    ) : job.salaryMin ? (
                      job.salaryCurrency === 'INR'
                        ? `₹${(job.salaryMin / 100000).toFixed(1)} LPA`
                        : `${job.salaryCurrency} ${job.salaryMin.toLocaleString()}`
                    ) : (
                      job.salaryCurrency === 'INR'
                        ? `Up to ₹${(job.salaryMax / 100000).toFixed(1)} LPA`
                        : `Up to ${job.salaryCurrency} ${job.salaryMax.toLocaleString()}`
                    )}
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal">
                    Salary not disclosed
                  </span>
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
              href={job.applicationUrl || job.sourceUrl || job.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold"
              title="Open Official Job Posting on Source"
            >
              <span>View on {job.sourcePlatform === 'ADZUNA' ? 'Adzuna' : 'Jooble'}</span>
              <ExternalLink className="w-4 h-4" />
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>AI Match Analytics</span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-indigo-300 font-mono">{job.matchScore ?? 0}% Match</span>
                {job.matchResult?.matchTier && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    job.matchResult.matchTier === 'EXCELLENT'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : job.matchResult.matchTier === 'STRONG'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : job.matchResult.matchTier === 'GOOD'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      : job.matchResult.matchTier === 'MODERATE'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : job.matchResult.matchTier === 'PARTIAL'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                      : 'bg-slate-700/50 text-slate-300 border-slate-600'
                  }`}>
                    {job.matchResult.matchTier}
                  </span>
                )}
              </div>
            </div>

            {/* Score Bars */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Skills Overlap</span>
                  <span className="text-white font-medium">{job.matchResult?.skillsScore ?? 0}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                    style={{ width: `${job.matchResult?.skillsScore ?? 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Experience Fit</span>
                  <span className="text-white font-medium">{job.matchResult?.experienceScore ?? 0}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                    style={{ width: `${job.matchResult?.experienceScore ?? 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Domain & Title Affinity</span>
                  <span className="text-white font-medium">{job.matchResult?.domainScore ?? 0}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                    style={{ width: `${job.matchResult?.domainScore ?? 0}%` }}
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
              {(job.matchResult?.matchedSkills && job.matchResult.matchedSkills.length > 0) ? (
                job.matchResult.matchedSkills.map((s: string) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  >
                    ✓ {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">No specific skill matches detected for this posting.</span>
              )}
            </div>

            {job.matchResult?.missingSkills && job.matchResult.missingSkills.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <h3 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Missing / Additional Skills in JD</span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {job.matchResult.missingSkills.map((s: string) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-amber-950/40 text-amber-300/90 border border-amber-500/20"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
