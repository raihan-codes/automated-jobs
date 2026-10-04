'use client';

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
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
  Clock,
  X,
  ChevronRight,
  Flame,
  Award,
  TrendingUp,
  Check
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { UrlValidator } from '@/services/validation/url-validator';

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

function JobCardSkeleton() {
  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4 animate-pulse border border-slate-800/80">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 shrink-0" />
          <div className="space-y-2.5 flex-1">
            <div className="h-5 bg-slate-800/80 rounded-md w-1/3" />
            <div className="flex gap-2">
              <div className="h-4 bg-slate-800/60 rounded-md w-24" />
              <div className="h-4 bg-slate-800/60 rounded-md w-32" />
              <div className="h-4 bg-slate-800/60 rounded-md w-20" />
            </div>
          </div>
        </div>
        <div className="w-24 h-9 bg-slate-800/80 rounded-xl shrink-0" />
      </div>
      <div className="flex gap-2 pt-2">
        <div className="h-6 bg-slate-800/60 rounded-md w-16" />
        <div className="h-6 bg-slate-800/60 rounded-md w-20" />
        <div className="h-6 bg-slate-800/60 rounded-md w-24" />
      </div>
    </div>
  );
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

  const getSafeExternalJobUrl = (job: any): string | null => {
    const candidates = [job?.applicationUrl, job?.sourceUrl, job?.canonicalUrl];
    for (const candidate of candidates) {
      if (candidate && UrlValidator.isAllowedExternalJobUrl(candidate)) {
        return candidate;
      }
    }
    return null;
  };

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

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchJobs('');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedPlatform('ALL');
    setSelectedEmploymentType('ALL');
    setSelectedRecency('30');
    setRemoteOnly(false);
    setMinMatchScore(0);
    fetchJobs('');
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
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-950/20',
        scoreColor: 'text-emerald-400',
        bgGlow: 'from-emerald-500/10 to-transparent'
      };
    }
    if (score >= 80) {
      return {
        label: 'Strong Match',
        badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 shadow-sm shadow-indigo-950/20',
        scoreColor: 'text-indigo-400',
        bgGlow: 'from-indigo-500/10 to-transparent'
      };
    }
    if (score >= 70) {
      return {
        label: 'Good Match',
        badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-sm shadow-cyan-950/20',
        scoreColor: 'text-cyan-400',
        bgGlow: 'from-cyan-500/10 to-transparent'
      };
    }
    if (score >= 60) {
      return {
        label: 'Moderate Match',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-sm shadow-amber-950/20',
        scoreColor: 'text-amber-400',
        bgGlow: 'from-amber-500/10 to-transparent'
      };
    }
    if (score >= 40) {
      return {
        label: 'Partial Match',
        badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30 shadow-sm shadow-orange-950/20',
        scoreColor: 'text-orange-400',
        bgGlow: 'from-orange-500/10 to-transparent'
      };
    }
    return {
      label: 'Low Match',
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
      scoreColor: 'text-slate-400',
      bgGlow: 'from-slate-800/10 to-transparent'
    };
  };

  // Metrics computation for dashboard header
  const highMatchCount = useMemo(() => {
    return jobs.filter(j => (j.matchScore || 0) >= 80).length;
  }, [jobs]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedPlatform !== 'ALL') count++;
    if (selectedEmploymentType !== 'ALL') count++;
    if (selectedRecency !== '30') count++;
    if (remoteOnly) count++;
    if (minMatchScore > 0) count++;
    return count;
  }, [searchQuery, selectedPlatform, selectedEmploymentType, selectedRecency, remoteOnly, minMatchScore]);

  return (
    <div className="jobs-dashboard space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto pb-12">
      {/* ── Page Header & Stats Summary ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-950/90 p-6 rounded-3xl border border-indigo-500/20 shadow-xl shadow-indigo-950/10 backdrop-blur-md">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Live Job Discovery Engine
            </span>
            <span className="text-slate-600 dark:text-slate-600">•</span>
            <span className="text-[11px] font-medium text-slate-400">Adzuna &amp; Jooble Sync</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Job Discovery &amp; Match</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              AI Powered
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Discover verified openings from official global ATS feeds. Zero fake jobs, deduplicated listings, and live JD alignment scored against your verified candidate profile.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3 self-start lg:self-auto shrink-0">
          <button
            onClick={() => setShowSyncModal(true)}
            className="glass-button-primary flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <RefreshCw className="w-4 h-4 text-indigo-200" />
            <span>Live Search / Sync APIs</span>
          </button>
        </div>
      </div>

      {/* ── Key Metrics Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Available Jobs</p>
            <p className="text-lg font-bold text-white font-mono">{jobs.length}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">High Match (&ge;80%)</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">{highMatchCount}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Active Sources</p>
            <p className="text-lg font-bold text-white">2 APIs Live</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Candidate Target</p>
            <p className="text-xs font-bold text-slate-200 truncate max-w-[110px]">{candidateName}</p>
          </div>
        </div>
      </div>

      {/* ── User Custom Matched Banner ── */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900/90 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-indigo-950/20 backdrop-blur-md">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Personalized Job Matching for {candidateName}
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {hasCustomProfile ? 'Resume Match Active' : 'Profile Search'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Match scores &amp; skill alignments are computed directly between your uploaded resume profile and live job descriptions.
            </p>
          </div>
        </div>

        <Link
          href="/upload"
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/90 text-xs font-bold text-indigo-300 hover:text-white border border-slate-700/80 transition-all duration-200 whitespace-nowrap self-start sm:self-auto flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Upload Resume to Re-score</span>
        </Link>
      </div>

      {/* ── Search & Filters Bar ── */}
      <div className="glass-panel p-5 rounded-3xl space-y-4 border border-slate-800/80 shadow-lg">
        {/* Search Input Row */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Search by role, skills, company, or location (e.g. Python, React, SDE-2, Bengaluru)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Search Jobs</span>
          </button>
        </form>

        {/* Opportunity Type & Recency Toggles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
          {/* Opportunity Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" /> Type:
            </span>
            <div className="inline-flex p-1 bg-slate-900/90 rounded-xl border border-slate-800">
              {[
                { id: 'ALL', label: 'All Types' },
                { id: 'FULL_TIME', label: 'Full-Time' },
                { id: 'INTERNSHIP', label: 'Internships' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedEmploymentType(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedEmploymentType === t.id
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recency Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" /> Recency:
            </span>
            <div className="inline-flex p-1 bg-slate-900/90 rounded-xl border border-slate-800 flex-wrap gap-1">
              {[
                { id: '30', label: '⚡ Recent (0–30d)' },
                { id: '7', label: '🔥 Last 7 Days' },
                { id: '60', label: '⏳ Past 60d' },
                { id: 'older', label: '📁 Older (>30d)' },
                { id: 'all', label: 'All Time' }
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRecency(r.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedRecency === r.id
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Source Filters, Remote Toggle, and Min Match Score */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/60 text-xs">
          {/* Verified Source */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-400" /> Source:
            </span>
            <div className="inline-flex p-1 bg-slate-900/90 rounded-xl border border-slate-800">
              {ALL_PLATFORMS.map(plat => (
                <button
                  key={plat.id}
                  onClick={() => setSelectedPlatform(plat.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    selectedPlatform === plat.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {plat.id === 'ALL' ? '🌟 All Sources' : plat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Remote & Score Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={e => setRemoteOnly(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="font-medium text-xs">Remote Only</span>
            </label>

            <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium">Min Match:</span>
              <select
                value={minMatchScore}
                onChange={e => setMinMatchScore(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={0}>All Scores</option>
                <option value={60}>≥ 60% Match</option>
                <option value={70}>≥ 70% Match</option>
                <option value={80}>≥ 80% Match</option>
                <option value={85}>≥ 85% Match</option>
                <option value={90}>≥ 90% Match</option>
              </select>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Results Count Bar ── */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">
            {jobs.length} {jobs.length === 1 ? 'Job' : 'Jobs'} Found
          </span>
          <span className="text-slate-600">•</span>
          <span>Verified from Adzuna &amp; Jooble APIs</span>
        </div>
        <div className="text-slate-500 hidden sm:block">
          Click any card for full JD breakdown &amp; truthful AI bullet tailoring
        </div>
      </div>

      {/* ── Jobs Results Grid ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <JobCardSkeleton />
            <JobCardSkeleton />
            <JobCardSkeleton />
          </div>
        ) : jobs.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center space-y-4 border border-slate-800/80">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
              <Compass className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No matching job postings found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                No jobs matching your exact filters were found in this timeframe. Try broadening keywords, changing recency, or syncing new live API feeds.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/20"
              >
                Clear All Filters
              </button>
              <button
                onClick={() => setShowSyncModal(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 hover:text-white border border-slate-700 transition-colors"
              >
                Sync More Jobs
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {jobs.map(job => {
              const deduplicatedSources = job.foundOnSources || [job.sourcePlatform];
              const relativeTime = formatRelativeTime(job.postedAt);
              const applyLink = getSafeExternalJobUrl(job);
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
                  className="glass-panel-interactive p-5 sm:p-6 rounded-3xl border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300 flex flex-col md:flex-row md:items-start justify-between gap-6 relative overflow-hidden group shadow-lg hover:shadow-indigo-950/20"
                >
                  {/* Subtle ambient gradient based on score */}
                  <div className={`absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl ${tierInfo.bgGlow} rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-60`} />

                  <div className="space-y-4 flex-1 relative z-10">
                    {/* Header: Company Logo, Title, Badges */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center p-2.5 shrink-0 shadow-inner group-hover:border-indigo-500/40 transition-colors">
                        {job.companyLogo ? (
                          <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-indigo-300" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/jobs/${encodeURIComponent(job.id)}`}
                            className="text-base sm:text-lg font-bold text-white hover:text-indigo-400 transition-colors tracking-tight flex items-center gap-1.5"
                          >
                            <span>{job.title}</span>
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-400" />
                          </Link>

                          {/* Employment Type Tag */}
                          {job.employmentType === 'INTERNSHIP' ? (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />
                              INTERNSHIP
                            </span>
                          ) : (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-slate-800/90 text-slate-300 border border-slate-700">
                              FULL-TIME
                            </span>
                          )}

                          {/* Recency Badge */}
                          {daysOld <= 7 ? (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-emerald-400" />
                              Last 7 Days
                            </span>
                          ) : daysOld <= 30 ? (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              ⚡ Recent
                            </span>
                          ) : daysOld <= 60 ? (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              ⏳ Past 60d
                            </span>
                          ) : (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-slate-800 text-slate-400 border border-slate-700">
                              Archived (&gt;60d)
                            </span>
                          )}

                          {/* Source Label */}
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
                            job.sourcePlatform === 'ADZUNA'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                          }`}>
                            {job.sourcePlatform === 'ADZUNA' ? 'Adzuna' : 'Jooble'}
                          </span>
                        </div>

                        {/* Company, Location, Salary, Posted Time */}
                        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                          <span className="font-semibold text-slate-200">{job.company}</span>
                          <span className="text-slate-600">•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" /> {job.location}
                          </span>
                          <span className="text-slate-600">•</span>
                          {hasRealSalary ? (
                            <span className="text-emerald-400 font-bold font-mono flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
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
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <span className="text-[11px] text-slate-400 font-medium">Verified on:</span>
                            {deduplicatedSources.map((src: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-500/30"
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
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Matched Skills ({matchedSkillsList.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {matchedSkillsList.map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-1 shadow-sm"
                            >
                              <span className="text-emerald-400 font-bold">✓</span> {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Skills */}
                    {missingSkillsList.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-amber-400/90 uppercase tracking-wider">
                          Missing / Gap Skills:
                        </span>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {missingSkillsList.slice(0, 4).map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-amber-950/20 text-amber-300/80 border border-amber-500/20 text-[11px]"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Match Explanation */}
                    {job.matchResult?.whyMatchReason && (
                      <div className="text-xs text-slate-300 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800/90 leading-relaxed flex items-start gap-2.5 shadow-inner">
                        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-indigo-300 font-semibold">Match Insights: </strong>
                          {job.matchResult.whyMatchReason}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Score and Actions Area */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800 relative z-10">
                    {/* Score Badge */}
                    <div className="text-left md:text-right">
                      <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border ${tierInfo.badgeClass}`}>
                        <Sparkles className="w-4 h-4" />
                        <span className="text-base font-extrabold font-mono tracking-tight">
                          {job.matchScore || 0}%
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          {tierInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Action CTA Buttons */}
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/jobs/${encodeURIComponent(job.id)}`}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span>Match Details</span>
                      </Link>

                      {applyLink && (
                        <a
                          href={applyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-button-primary px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                          title="Open official job application on company site"
                        >
                          <span>Apply on {job.company ? job.company.split(' ')[0] : 'Portal'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Live Sync Search Modal ── */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full rounded-3xl p-6 sm:p-7 border border-slate-700/80 space-y-6 animate-in zoom-in-95 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Live Job Search &amp; Sync</h2>
                  <p className="text-[11px] text-slate-400">Query Adzuna and Jooble APIs in real time</p>
                </div>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSyncSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" /> Source API
                </label>
                <select
                  value={syncPlatform}
                  onChange={e => setSyncPlatform(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
                  <option value="ALL">🌟 ALL Sources (Adzuna + Jooble Combined)</option>
                  <option value="ADZUNA">Adzuna Global Jobs API</option>
                  <option value="JOOBLE">Jooble Real-Time Jobs API</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-cyan-400" /> Search Query / Role / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Python, Full Stack Developer, Data Analyst, React, Bengaluru"
                  value={syncQuery}
                  onChange={e => setSyncQuery(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Fetches live postings directly from authorized search feeds.
                </p>
              </div>

              {syncMessage && (
                <div className="p-3.5 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{syncMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="glass-button-primary px-5 py-2.5 rounded-xl text-white font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  {isSyncing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSyncing ? 'Fetching Live APIs...' : 'Run Live Search'}</span>
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
        <div className="p-16 text-center text-slate-400 space-y-4 max-w-md mx-auto">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-semibold font-mono text-slate-300">Loading Genuine Jobs from Adzuna &amp; Jooble...</p>
        </div>
      }
    >
      <JobsExplorerContent />
    </Suspense>
  );
}
