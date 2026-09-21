'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Sparkles,
  Building2,
  MapPin,
  Briefcase,
  GraduationCap,
  Code2,
  Layers,
  Trophy,
  BadgeCheck,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Target,
  TrendingUp,
  Globe,
  IndianRupee,
  ChevronRight,
  Clock,
  ShieldCheck,
  User2,
  BookOpen,
  Wrench
} from 'lucide-react';

import { useAuth } from '@/lib/firebase/AuthContext';

interface MatchedJob {
  id: string;
  company: string;
  companyLogo?: string;
  title: string;
  location: string;
  isRemote: boolean;
  remoteType?: string;
  employmentType: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  sourcePlatform: string;
  foundOnSources?: string[];
  applicationUrl?: string;
  applicationMethod?: string;
  extractedSkills?: string[];
  experienceLevel?: string;
  postedAt?: string;
  // Match
  matchScore: number;
  skillsScore: number;
  experienceScore: number;
  domainScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  whyMatchReason: string;
  potentialConcerns?: string;
  suggestedAngle?: string;
  isStarred?: boolean;
}

interface ProfileSummary {
  fullName: string;
  headline?: string;
  location?: string;
  yearsOfExperience: number;
  desiredTitles: string[];
  skillCount: number;
  topSkills: string[];
}

type LoadingPhase = 'idle' | 'syncing' | 'matching' | 'done' | 'error';

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-400">{label}</span>
        <span className="font-bold text-white font-mono">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ onGenerate, loading }: { onGenerate: () => void; loading: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600/20 via-cyan-500/10 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-indigo-400" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-xl font-bold text-white">Generate Live Job Suggestions</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Click below to sync fresh openings from Greenhouse, Lever, Ashby, Internshala, and more — then rank them by AI match score against your resume.
        </p>
      </div>
      <button
        onClick={onGenerate}
        disabled={loading}
        className="glass-button-primary flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 text-cyan-300" />
        )}
        <span>Generate AI Job Suggestions</span>
      </button>
    </div>
  );
}

export default function ResumeReviewPage() {
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_alex_chen';

  // Profile & resume state
  const [profile, setProfile] = useState<any>(null);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Suggestion state
  const [suggestions, setSuggestions] = useState<MatchedJob[]>([]);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [totalScanned, setTotalScanned] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');

  // Selected job for details
  const [selectedJob, setSelectedJob] = useState<MatchedJob | null>(null);

  // Filter state
  const [filterType, setFilterType] = useState<'ALL' | 'FULL_TIME' | 'INTERNSHIP'>('ALL');
  const [minScore, setMinScore] = useState(0);

  // ── Load profile on mount ────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const res = await fetch('/api/profile', {
          headers: { 'x-user-id': activeUserId }
        });
        const data = await res.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [activeUserId]);

  // ── Generate suggestions ─────────────────────────────────────────────────
  const generateSuggestions = useCallback(async () => {
    setLoadingPhase('syncing');
    setErrorMsg(null);
    setSuggestions([]);
    setSelectedJob(null);

    try {
      // Simulate phased loading for UX
      const phaseTimer = setTimeout(() => setLoadingPhase('matching'), 3500);

      const res = await fetch('/api/resumes/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUserId
        },
        body: JSON.stringify({ userId: activeUserId })
      });

      clearTimeout(phaseTimer);

      const data = await res.json();

      if (!res.ok || !data.success) {
        setLoadingPhase('error');
        setErrorMsg(data.error || 'Failed to generate suggestions');
        return;
      }

      setSuggestions(data.suggestions || []);
      setProfileSummary(data.profile || null);
      setTotalScanned(data.totalJobsScanned || 0);
      setSearchKeyword(data.searchKeyword || '');
      setLoadingPhase('done');

      if (data.suggestions?.length > 0) {
        setSelectedJob(data.suggestions[0]);
      }
    } catch (e: any) {
      setLoadingPhase('error');
      setErrorMsg('Network error. Please try again.');
    }
  }, [activeUserId]);

  // ── Filtered suggestions ─────────────────────────────────────────────────
  const filteredSuggestions = suggestions.filter(j => {
    if (filterType !== 'ALL' && j.employmentType !== filterType) return false;
    if (j.matchScore < minScore) return false;
    return true;
  });

  // ── Salary formatter ─────────────────────────────────────────────────────
  const formatSalary = (job: MatchedJob) => {
    if (job.salaryCurrency === 'INR') {
      if (job.salaryMin && job.salaryMax) {
        return `₹${(job.salaryMin / 100000).toFixed(0)}–${(job.salaryMax / 100000).toFixed(0)} LPA`;
      }
      if (job.salaryMin) return `₹${(job.salaryMin / 100000).toFixed(0)} LPA`;
    }
    return 'Competitive';
  };

  const scoreColor = (score: number) =>
    score >= 90 ? 'text-emerald-400' :
    score >= 75 ? 'text-cyan-400' :
    score >= 60 ? 'text-amber-400' : 'text-rose-400';

  const scoreBg = (score: number) =>
    score >= 90 ? 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30' :
    score >= 75 ? 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30' :
    score >= 60 ? 'from-amber-500/20 to-amber-600/10 border-amber-500/30' :
    'from-rose-500/20 to-rose-600/10 border-rose-500/30';

  const scoreBarColor = (score: number) =>
    score >= 90 ? 'bg-emerald-500' :
    score >= 75 ? 'bg-cyan-500' :
    score >= 60 ? 'bg-amber-500' : 'bg-rose-500';

  // ── Loading overlay ──────────────────────────────────────────────────────
  const LoadingOverlay = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-indigo-500/40 animate-ping animation-delay-200" />
        <div className="w-20 h-20 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">
          {loadingPhase === 'syncing' ? '🌐 Syncing Live Job Portals...' : '🧠 AI Matching Your Profile...'}
        </h3>
        <p className="text-sm text-slate-400 max-w-sm">
          {loadingPhase === 'syncing'
            ? 'Fetching fresh openings from Greenhouse, Lever, Ashby, Internshala & Wellfound in real-time.'
            : 'Running multi-factor match scoring against your skills, experience, and desired roles.'}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {['Syncing portals', 'Deduplicating jobs', 'Scoring matches', 'Ranking results'].map((step, i) => (
          <React.Fragment key={step}>
            <span className={loadingPhase === 'matching' && i < 2 ? 'text-emerald-400' : ''}>{step}</span>
            {i < 3 && <ChevronRight className="w-3 h-3 text-slate-700" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Live Job & Internship Matching
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Resume Review & AI Suggestions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sync real-time openings from 5+ job portals and see which ones best match your resume.
          </p>
        </div>

        {loadingPhase === 'done' && (
          <button
            onClick={generateSuggestions}
            className="glass-button-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white self-start md:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Re-sync & Refresh</span>
          </button>
        )}
      </div>

      {/* ── Main Two-Pane Layout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── LEFT PANE: Resume / Profile ─────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Your Resume Profile
          </div>

          {profileLoading ? (
            <div className="glass-panel rounded-2xl p-6 flex items-center justify-center h-40">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          ) : profile ? (
            <div className="glass-panel rounded-2xl overflow-hidden">
              {/* Profile Hero */}
              <div className="p-5 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border-b border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-xl font-black text-white shrink-0 shadow-lg shadow-indigo-500/30">
                    {(profile.fullName || 'U').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-white truncate">{profile.fullName}</h2>
                    <p className="text-xs text-indigo-300 mt-0.5 line-clamp-2">{profile.headline}</p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                      {profile.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {profile.location}
                        </span>
                      )}
                      {profile.yearsOfExperience !== undefined && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {profile.yearsOfExperience}y exp
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desired Titles */}
                {profile.desiredTitles?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {profile.desiredTitles.slice(0, 4).map((t: string) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Skills */}
              {profile.skills?.length > 0 && (
                <div className="p-4 border-b border-slate-800/80 space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Code2 className="w-3.5 h-3.5" /> Skills ({profile.skills.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((s: any) => (
                      <span
                        key={s.name}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-medium border ${
                          s.level === 'EXPERT' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                          s.level === 'ADVANCED' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' :
                          'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        {s.name}
                        {s.years && <span className="opacity-50 ml-1">{s.years}y</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {profile.experiences?.length > 0 && (
                <div className="p-4 border-b border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Briefcase className="w-3.5 h-3.5" /> Experience
                  </div>
                  {profile.experiences.map((exp: any) => (
                    <div key={exp.id} className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-white">{exp.role}</p>
                          <p className="text-[11px] text-indigo-300">{exp.company}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 mt-0.5">
                          {exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate || '—'}
                        </span>
                      </div>
                      {exp.bullets?.length > 0 && (
                        <ul className="list-disc list-outside ml-4 space-y-0.5 text-[11px] text-slate-400">
                          {exp.bullets.slice(0, 2).map((b: string, i: number) => (
                            <li key={i} className="leading-relaxed">{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Education */}
              {profile.educations?.length > 0 && (
                <div className="p-4 border-b border-slate-800/80 space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <BookOpen className="w-3.5 h-3.5" /> Education
                  </div>
                  {profile.educations.map((edu: any) => (
                    <div key={edu.id}>
                      <p className="text-xs font-bold text-white">{edu.institution}</p>
                      <p className="text-[11px] text-slate-300">{edu.degree}{edu.fieldOfStudy ? ` — ${edu.fieldOfStudy}` : ''}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {edu.startDate && edu.endDate ? `${edu.startDate} – ${edu.endDate}` : edu.endDate || ''}
                        {edu.gradeGpa ? ` · GPA ${edu.gradeGpa}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Projects */}
              {profile.projects?.length > 0 && (
                <div className="p-4 border-b border-slate-800/80 space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Layers className="w-3.5 h-3.5" /> Projects
                  </div>
                  {profile.projects.map((proj: any) => (
                    <div key={proj.id}>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white">{proj.title}</p>
                        {proj.link && (
                          <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-indigo-400 transition-colors">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{proj.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(proj.technologies || []).slice(0, 5).map((t: string) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Certifications & Achievements */}
              {(profile.certifications?.length > 0 || profile.achievements?.length > 0) && (
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Trophy className="w-3.5 h-3.5" /> Awards & Certifications
                  </div>
                  {profile.achievements?.map((a: any) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <Trophy className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-semibold text-white">{a.title}</p>
                        <p className="text-[10px] text-slate-500">{a.issuer} · {a.date}</p>
                      </div>
                    </div>
                  ))}
                  {profile.certifications?.map((c: any) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <BadgeCheck className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-semibold text-white">{c.name}</p>
                        <p className="text-[10px] text-slate-500">{c.issuer} · {c.issueDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 text-center space-y-3">
              <User2 className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-400">No profile found.</p>
              <Link href="/upload" className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                Upload your resume →
              </Link>
            </div>
          )}
        </div>

        {/* ── RIGHT PANE: Job Suggestions ──────────────────────────────── */}
        <div className="xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Target className="w-3.5 h-3.5" />
              AI-Matched Opportunities
              {loadingPhase === 'done' && (
                <span className="text-[10px] normal-case font-medium text-slate-500">
                  · {filteredSuggestions.length} results from {totalScanned} scanned
                </span>
              )}
            </div>

            {/* Filters */}
            {loadingPhase === 'done' && suggestions.length > 0 && (
              <div className="flex items-center gap-2">
                {(['ALL', 'FULL_TIME', 'INTERNSHIP'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      filterType === t
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {t === 'ALL' ? 'All' : t === 'FULL_TIME' ? 'Full-Time' : 'Internships'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats row (after load) */}
          {loadingPhase === 'done' && profileSummary && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Portals Synced', value: '5', icon: Globe, color: 'text-cyan-400' },
                { label: 'Jobs Scanned', value: String(totalScanned), icon: Briefcase, color: 'text-indigo-400' },
                { label: 'Top Matches', value: String(filteredSuggestions.filter(j => j.matchScore >= 80).length), icon: Sparkles, color: 'text-emerald-400' }
              ].map(s => (
                <div key={s.label} className="glass-panel rounded-2xl p-4 text-center">
                  <s.icon className={`w-5 h-5 mx-auto mb-1.5 ${s.color}`} />
                  <p className="text-xl font-black text-white font-mono">{s.value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Content area */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            {loadingPhase === 'idle' && (
              <EmptyState onGenerate={generateSuggestions} loading={false} />
            )}

            {(loadingPhase === 'syncing' || loadingPhase === 'matching') && <LoadingOverlay />}

            {loadingPhase === 'error' && (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 text-rose-400" />
                <p className="text-sm font-semibold text-white">Something went wrong</p>
                <p className="text-xs text-slate-400 max-w-xs">{errorMsg}</p>
                <button
                  onClick={generateSuggestions}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {loadingPhase === 'done' && filteredSuggestions.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <Briefcase className="w-10 h-10 text-slate-500" />
                <p className="text-sm font-semibold text-white">No matches for current filters</p>
                <button onClick={() => { setFilterType('ALL'); setMinScore(0); }} className="text-xs text-indigo-400 underline">
                  Clear filters
                </button>
              </div>
            )}

            {loadingPhase === 'done' && filteredSuggestions.length > 0 && (
              <div className="divide-y divide-slate-800/80">
                {/* Selected Job Detail Panel */}
                {selectedJob && (
                  <div className="p-5 bg-gradient-to-br from-indigo-950/50 via-slate-900/80 to-slate-900/80">
                    {/* Job header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-2 shrink-0">
                        {selectedJob.companyLogo ? (
                          <img src={selectedJob.companyLogo} alt={selectedJob.company} className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white">{selectedJob.title}</h3>
                          {selectedJob.employmentType === 'INTERNSHIP' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" /> INTERNSHIP
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              FULL-TIME
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-indigo-300 mt-0.5">{selectedJob.company}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedJob.location}</span>
                          <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3 text-emerald-400" />{formatSalary(selectedJob)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{selectedJob.sourcePlatform}</span>
                        </div>
                      </div>

                      {/* Score badge */}
                      <div className={`px-3 py-2 rounded-xl bg-gradient-to-br ${scoreBg(selectedJob.matchScore)} border text-center shrink-0`}>
                        <p className={`text-2xl font-black font-mono ${scoreColor(selectedJob.matchScore)}`}>
                          {selectedJob.matchScore}%
                        </p>
                        <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Match</p>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <ScoreBar label="Skills Fit" value={selectedJob.skillsScore} color={scoreBarColor(selectedJob.skillsScore)} />
                      <ScoreBar label="Experience" value={selectedJob.experienceScore} color={scoreBarColor(selectedJob.experienceScore)} />
                      <ScoreBar label="Role Affinity" value={selectedJob.domainScore} color={scoreBarColor(selectedJob.domainScore)} />
                    </div>

                    {/* Why Match */}
                    <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/20 mb-3">
                      <div className="flex items-center gap-1.5 text-indigo-300 text-[11px] font-bold mb-1">
                        <Sparkles className="w-3.5 h-3.5" /> Why This Matches You
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{selectedJob.whyMatchReason}</p>
                    </div>

                    {/* Matched Skills */}
                    {selectedJob.matchedSkills.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[11px] text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Matched Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedJob.matchedSkills.map(s => (
                            <span key={s} className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Skills */}
                    {selectedJob.missingSkills.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[11px] text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Skill Gaps
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedJob.missingSkills.slice(0, 6).map(s => (
                            <span key={s} className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Angle */}
                    {selectedJob.suggestedAngle && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 mb-4">
                        <p className="text-[11px] text-cyan-300 font-semibold mb-0.5 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Resume Angle Suggestion
                        </p>
                        <p className="text-[11px] text-slate-300 leading-relaxed">{selectedJob.suggestedAngle}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/jobs/${selectedJob.id}`}
                        className="glass-button-primary flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white"
                      >
                        <Zap className="w-3.5 h-3.5 text-cyan-300" />
                        Tailor Resume & Auto-Apply
                      </Link>
                      {selectedJob.applicationUrl && (
                        <a
                          href={selectedJob.applicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Job
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Job List */}
                <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-800/60">
                  {filteredSuggestions.map((job, idx) => {
                    const isSelected = selectedJob?.id === job.id;
                    return (
                      <button
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className={`w-full text-left p-4 transition-all flex items-center gap-4 ${
                          isSelected
                            ? 'bg-indigo-950/40 border-l-2 border-l-indigo-500'
                            : 'hover:bg-slate-800/30 border-l-2 border-l-transparent'
                        }`}
                      >
                        {/* Rank */}
                        <span className="text-xs font-bold text-slate-600 font-mono w-5 text-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Logo */}
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-1.5 shrink-0">
                          {job.companyLogo ? (
                            <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        {/* Job info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{job.title}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {job.company} · {job.location}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {job.employmentType === 'INTERNSHIP' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 font-semibold">INTERN</span>
                            )}
                            <span className="text-[10px] text-slate-500 font-mono">{job.sourcePlatform}</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right shrink-0">
                          <p className={`text-base font-black font-mono ${scoreColor(job.matchScore)}`}>
                            {job.matchScore}%
                          </p>
                          <p className="text-[10px] text-slate-500">match</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
