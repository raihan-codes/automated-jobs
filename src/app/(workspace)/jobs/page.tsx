'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  RefreshCw,
  Compass,
  Sparkles,
  Building2,
  MapPin,
  IndianRupee,
  DollarSign,
  ArrowUpRight,
  ExternalLink,
  SlidersHorizontal,
  FileText,
  CheckCircle2,
  Plus,
  Layers,
  Globe,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  Zap,
  Upload,
  Clock
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthContext';

const ALL_PLATFORMS = [
  { id: 'ALL', label: 'All Sources (Adzuna + Jooble)' },
  { id: 'ADZUNA', label: 'Adzuna' },
  { id: 'JOOBLE', label: 'Jooble' }
];

function formatRelativeTime(dateInput: any): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return diffMin <= 1 ? 'Posted just now' : `Posted ${diffMin} mins ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? 'Posted 1 hour ago' : `Posted ${diffHours} hours ago`;
  }
  if (diffDays === 1) {
    return 'Posted 1 day ago';
  }
  if (diffDays < 30) {
    return `Posted ${diffDays} days ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths === 1 ? 'Posted 1 month ago' : `Posted ${diffMonths} months ago`;
}

function JobsExplorerContent() {
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidateName, setCandidateName] = useState<string>('Candidate');
  const [hasCustomProfile, setHasCustomProfile] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || searchParams.get('project') || '');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>('ALL');
  const [selectedRecency, setSelectedRecency] = useState<string>('30');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minMatchScore, setMinMatchScore] = useState<number>(0);

  // Sync Modal State
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncPlatform, setSyncPlatform] = useState('ALL');
  const [syncQuery, setSyncQuery] = useState('software engineer');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchJobs = useCallback(async (queryOverride?: string) => {
    setLoading(true);
    try {
      const q = typeof queryOverride === 'string' ? queryOverride : searchQuery;
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (selectedPlatform !== 'ALL') params.append('platform', selectedPlatform);
      if (selectedEmploymentType !== 'ALL') params.append('type', selectedEmploymentType);
      if (selectedRecency) params.append('recency', selectedRecency);
      if (remoteOnly) params.append('remote', 'true');
      if (minMatchScore > 0) params.append('minScore', String(minMatchScore));

      const res = await fetch(`/api/jobs?${params.toString()}`, {
        headers: {
          'x-user-id': activeUserId
        }
      });
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || []);
        setHasCustomProfile(Boolean(data.hasCustomProfile));
        if (user?.displayName) {
          setCandidateName(user.displayName);
        } else if (data.hasCustomProfile && data.candidateName) {
          setCandidateName(data.candidateName);
        } else if (user?.email) {
          setCandidateName(user.email.split('@')[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedPlatform, selectedEmploymentType, selectedRecency, remoteOnly, minMatchScore, activeUserId, user]);

  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('project');
    if (q !== null && q !== searchQuery) {
      setSearchQuery(q);
      fetchJobs(q);
    } else {
      fetchJobs();
    }
  }, [searchParams, selectedPlatform, selectedEmploymentType, selectedRecency, remoteOnly, minMatchScore, activeUserId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/jobs/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: syncPlatform, query: syncQuery })
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(data.message);
        await fetchJobs();
      } else {
        setSyncMessage(data.error || 'Sync failed');
      }
    } catch (e) {
      setSyncMessage('Network error during sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatSalary = (job: any) => {
    if (job.salaryMin && job.salaryMax) {
      if (job.salaryCurrency === 'INR') {
        const minLPA = (job.salaryMin / 100000).toFixed(1).replace(/\.0$/, '');
        const maxLPA = (job.salaryMax / 100000).toFixed(1).replace(/\.0$/, '');
        return `₹${minLPA} - ₹${maxLPA} LPA`;
      }
      return `${job.salaryCurrency || '$'} ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`;
    }
    if (job.salaryMin) {
      if (job.salaryCurrency === 'INR') {
        const minLPA = (job.salaryMin / 100000).toFixed(1).replace(/\.0$/, '');
        return `₹${minLPA} LPA`;
      }
      return `${job.salaryCurrency || '$'} ${job.salaryMin.toLocaleString()}`;
    }
    if (job.salaryMax) {
      if (job.salaryCurrency === 'INR') {
        const maxLPA = (job.salaryMax / 100000).toFixed(1).replace(/\.0$/, '');
        return `Up to ₹${maxLPA} LPA`;
      }
      return `Up to ${job.salaryCurrency || '$'} ${job.salaryMax.toLocaleString()}`;
    }
    return 'Salary not disclosed';
  };

  const getMatchTierInfo = (score: number) => {
    if (score >= 90) {
      return {
        label: 'Excellent Match',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        scoreColor: 'text-emerald-400'
      };
    }
    if (score >= 80) {
      return {
        label: 'Strong Match',
        badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        scoreColor: 'text-indigo-400'
      };
    }
    if (score >= 70) {
      return {
        label: 'Good Match',
        badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        scoreColor: 'text-cyan-400'
      };
    }
    if (score >= 60) {
      return {
        label: 'Moderate Match',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        scoreColor: 'text-amber-400'
      };
    }
    if (score >= 40) {
      return {
        label: 'Partial Match',
        badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        scoreColor: 'text-orange-400'
      };
    }
    return {
      label: 'Low Match',
      badgeClass: 'bg-slate-700/50 text-slate-300 border-slate-600',
      scoreColor: 'text-slate-400'
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Live Adzuna &amp; Jooble Real Job Search</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Real-Time Job &amp; Internship Search
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Discovered dynamically from official <strong className="text-slate-200">Adzuna</strong> and <strong className="text-slate-200">Jooble</strong> APIs. Zero dummy jobs, cross-platform deduplication, and genuine ATS/company application links.
          </p>
        </div>

        <button
          onClick={() => setShowSyncModal(true)}
          className="glass-button-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Live Search / Sync APIs</span>
        </button>
      </div>

      {/* User Custom Matched Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-indigo-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-white">
                Personalized Job Matching for {candidateName}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                {hasCustomProfile ? 'Resume Match Active' : 'Profile Search'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Match scores &amp; skill alignments are calculated directly between your candidate profile and live API job requirements.
            </p>
          </div>
        </div>

        <Link
          href="/upload"
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 hover:text-white border border-slate-700 transition-colors whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Upload Resume to Re-score</span>
        </Link>
      </div>

      {/* Search & Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search real jobs by title, skills, company, or location (e.g. Python, Data Analyst, React, Bengaluru)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            Search
          </button>
        </form>

        {/* Opportunity Type & Recency Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" /> Opportunity Type:
            </span>
            {[
              { id: 'ALL', label: 'All Opportunities' },
              { id: 'FULL_TIME', label: 'Full-Time' },
              { id: 'INTERNSHIP', label: 'Internships' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedEmploymentType(t.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedEmploymentType === t.id
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Recency Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" /> Recency:
            </span>
            {[
              { id: '30', label: '🌟 Recent (0–30d)' },
              { id: '7', label: '🔥 Highly Recent (0–7d)' },
              { id: '60', label: '⏳ Past 60d' },
              { id: 'older', label: '📁 Older Jobs (>30d)' },
              { id: 'all', label: 'All Time' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRecency(r.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedRecency === r.id
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Source Filters (Adzuna + Jooble) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 max-w-full">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Verified Source:
            </span>
            {ALL_PLATFORMS.map(plat => (
              <button
                key={plat.id}
                onClick={() => setSelectedPlatform(plat.id)}
                className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 ${
                  selectedPlatform === plat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {plat.id === 'ALL' ? '🌟 All Sources' : plat.label}
              </button>
            ))}
          </div>

          {/* Remote & Score Filters */}
          <div className="flex items-center gap-4 shrink-0">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={e => setRemoteOnly(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Remote Only</span>
            </label>

            <div className="flex items-center gap-2 text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Min Match:</span>
              <select
                value={minMatchScore}
                onChange={e => setMinMatchScore(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={0}>All Scores</option>
                <option value={80}>≥ 80% Match</option>
                <option value={85}>≥ 85% Match</option>
                <option value={90}>≥ 90% Match</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Results Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Showing {jobs.length} genuine jobs returned from Adzuna &amp; Jooble APIs</span>
          <span>Filtered by verified posting dates</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs font-mono">Fetching real jobs from Adzuna &amp; Jooble APIs...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
            <Compass className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-white">No more recent matching jobs were found.</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No jobs matching your filters were posted in this timeframe. Try broadening keywords, clearing filters, or switching to older jobs.
            </p>
            {selectedRecency !== 'all' && selectedRecency !== 'older' && (
              <div className="pt-2">
                <button
                  onClick={() => setSelectedRecency('all')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 hover:text-white border border-slate-700 transition-colors"
                >
                  View All &amp; Older Jobs
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {jobs.map(job => {
              const deduplicatedSources = job.foundOnSources || [job.sourcePlatform];
              const relativeTime = formatRelativeTime(job.postedAt);
              const applyLink = job.applicationUrl || job.sourceUrl || job.canonicalUrl;
              const tierInfo = getMatchTierInfo(job.matchScore || 0);
              const matchedSkillsList = job.matchResult?.matchedSkills || job.extractedSkills || [];
              const missingSkillsList = job.matchResult?.missingSkills || [];
              const hasRealSalary = Boolean(job.salaryMin || job.salaryMax);

              const daysOld = typeof job.daysOld === 'number'
                ? job.daysOld
                : Math.max(0, (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={job.id}
                  className="glass-panel-interactive p-5 rounded-2xl flex flex-col md:flex-row md:items-start justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center p-2 shrink-0">
                        {job.companyLogo ? (
                          <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/jobs/${encodeURIComponent(job.id)}`} className="text-base font-bold text-white hover:text-indigo-400 transition-colors">
                            {job.title}
                          </Link>
                          
                          {/* Employment Type Tag */}
                          {job.employmentType === 'INTERNSHIP' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />
                              INTERNSHIP
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              FULL-TIME
                            </span>
                          )}

                          {/* Recency Badge */}
                          {daysOld <= 7 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              🔥 Highly Recent
                            </span>
                          ) : daysOld <= 30 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              ⚡ Recent
                            </span>
                          ) : daysOld <= 60 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              ⏳ Older (31-60d)
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-800 text-slate-400 border border-slate-700">
                              Archived (&gt;60d)
                            </span>
                          )}

                          {/* Source Label */}
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                            job.sourcePlatform === 'ADZUNA'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                          }`}>
                            Source: {job.sourcePlatform === 'ADZUNA' ? 'Adzuna' : 'Jooble'}
                          </span>
                        </div>

                        {/* Company, Location, Salary, Posted Time */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-400">
                          <span className="font-semibold text-slate-200">{job.company}</span>
                          <span className="text-slate-600">•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" /> {job.location}
                          </span>
                          <span className="text-slate-600">•</span>
                          {hasRealSalary ? (
                            <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1">
                              {job.salaryCurrency === 'INR' ? <IndianRupee className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                              {formatSalary(job)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">
                              {formatSalary(job)}
                            </span>
                          )}
                          {relativeTime && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="flex items-center gap-1 text-slate-400">
                                <Clock className="w-3.5 h-3.5 text-slate-500" /> {relativeTime}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Deduplication Multiple Sources */}
                        {deduplicatedSources.length > 1 && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[11px] text-slate-400 font-medium">Found on:</span>
                            {deduplicatedSources.map((src: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-500/30"
                              >
                                {src === 'ADZUNA' ? 'Adzuna' : 'Jooble'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Matched Skills */}
                    {matchedSkillsList.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                          Matched Skills:
                        </span>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {matchedSkillsList.map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium"
                            >
                              ✓ {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Skills */}
                    {missingSkillsList.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-amber-400/90 uppercase tracking-wider">
                          Missing / Less-matched:
                        </span>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {missingSkillsList.slice(0, 4).map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-amber-950/30 text-amber-300/80 border border-amber-500/20 text-[10px]"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Match Explanation */}
                    {job.matchResult?.whyMatchReason && (
                      <p className="text-xs text-slate-300 bg-slate-900/90 p-3 rounded-xl border border-slate-800 leading-relaxed">
                        <strong className="text-indigo-300">Match Insights: </strong>
                        {job.matchResult.whyMatchReason}
                      </p>
                    )}
                  </div>

                  {/* Right Score and Actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-left md:text-right">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${tierInfo.badgeClass}`}>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-sm font-extrabold font-mono">
                          {job.matchScore || 0}%
                        </span>
                        <span className="text-[10px] font-semibold uppercase">
                          {tierInfo.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {applyLink && (
                        <a
                          href={applyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5"
                          title="Open original job posting"
                        >
                          <span>View Job</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <Link
                        href={`/jobs/${encodeURIComponent(job.id)}`}
                        className="glass-button-primary px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
                      >
                        <span>Tailor Resume</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Sync Search Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-slate-700 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Live Search Across Adzuna &amp; Jooble</h2>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleSyncSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Source API</label>
                <select
                  value={syncPlatform}
                  onChange={e => setSyncPlatform(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">🌟 ALL Sources (Adzuna + Jooble)</option>
                  <option value="ADZUNA">Adzuna API</option>
                  <option value="JOOBLE">Jooble API</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Search Query / Job Role / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Python, Data Analyst, React, Full Stack, Bengaluru"
                  value={syncQuery}
                  onChange={e => setSyncQuery(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Queries real-time job openings directly from Adzuna and Jooble APIs.
                </p>
              </div>

              {syncMessage && (
                <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-200 text-xs">
                  {syncMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="glass-button-primary px-5 py-2 rounded-xl text-white font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {isSyncing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSyncing ? 'Searching APIs...' : 'Search Live APIs'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobsExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-medium font-mono">Loading Real Jobs from Adzuna &amp; Jooble...</p>
        </div>
      }
    >
      <JobsExplorerContent />
    </Suspense>
  );
}
