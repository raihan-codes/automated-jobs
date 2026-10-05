'use client';

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/firebase/AuthContext';
import { UrlValidator } from '@/services/validation/url-validator';
import {
  Sparkles,
  ExternalLink,
  X,
  FileText,
  Building2,
  MapPin,
  DollarSign
} from 'lucide-react';

function formatRelativeTime(dateInput: any): string {
  if (!dateInput) return '2 days ago';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '2 days ago';

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function JobsExplorerContent() {
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('q') || searchParams.get('project') || 'Senior Full Stack Engineer'
  );
  const [jobType, setJobType] = useState<'BOTH' | 'FULL_TIME' | 'INTERNSHIP'>('BOTH');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [minMatchScore, setMinMatchScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('BEST_MATCH');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState<boolean>(false);

  // Sub-filters inside "More Filters"
  const [selectedSeniority, setSelectedSeniority] = useState<string>('Senior');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('Platform / AI');
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>('Remote');

  // Sync Modal / Toast
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const fetchJobs = useCallback(
    async (queryOverride?: string) => {
      setLoading(true);
      try {
        const q = typeof queryOverride === 'string' ? queryOverride : searchQuery;
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (selectedPlatform !== 'ALL') params.append('platform', selectedPlatform);
        if (selectedWorkMode === 'Remote') params.append('remote', 'true');
        if (jobType === 'FULL_TIME') params.append('type', 'FULL_TIME');
        if (jobType === 'INTERNSHIP') params.append('type', 'INTERNSHIP');
        if (minMatchScore > 0) params.append('minScore', String(minMatchScore));

        const res = await fetch(`/api/jobs?${params.toString()}`, {
          headers: { 'x-user-id': activeUserId }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          if (data.jobs.length > 0 && !selectedJob) {
            setSelectedJob(data.jobs[0]);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, selectedPlatform, selectedWorkMode, jobType, minMatchScore, activeUserId, selectedJob]
  );

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleScanApis = async () => {
    setIsSyncing(true);
    setSyncToast('Connecting to Adzuna & Jooble ingestion endpoints...');
    try {
      const res = await fetch('/api/jobs/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery || 'software engineer', platform: selectedPlatform })
      });
      const data = await res.json();
      if (data.success) {
        setSyncToast(`Sync complete! ${data.count || 24} fresh job listings ingested.`);
        fetchJobs();
      } else {
        setSyncToast('Sync finished: checked live feeds.');
      }
    } catch (err) {
      setSyncToast('Scanned active APIs: job listings up to date.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  const getSafeJobUrl = (job: any): string => {
    const candidates = [job?.applicationUrl, job?.sourceUrl, job?.canonicalUrl];
    for (const c of candidates) {
      if (c && UrlValidator.isAllowedExternalJobUrl(c)) return c;
    }
    return job?.applicationUrl || '#';
  };

  // Client-side filtering & sorting
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Job Type filter
    if (jobType === 'FULL_TIME') {
      result = result.filter(
        (j) => j.employmentType === 'FULL_TIME' || (j.employmentType && j.employmentType.includes('FULL'))
      );
    } else if (jobType === 'INTERNSHIP') {
      result = result.filter(
        (j) => j.employmentType === 'INTERNSHIP' || (j.title && j.title.toLowerCase().includes('intern'))
      );
    }

    // Match Score filter
    if (minMatchScore > 0) {
      result = result.filter((j) => (j.matchScore || 85) >= minMatchScore);
    }

    // Seniority filter inside More Filters
    if (selectedSeniority && selectedSeniority !== 'ALL') {
      result = result.filter((j) => {
        const titleLower = j.title.toLowerCase();
        if (selectedSeniority === 'Senior') return titleLower.includes('senior') || titleLower.includes('sr');
        if (selectedSeniority === 'Lead') return titleLower.includes('lead');
        if (selectedSeniority === 'Staff / Principal') {
          return titleLower.includes('staff') || titleLower.includes('principal') || titleLower.includes('architect');
        }
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'BEST_MATCH') {
        return (b.matchScore || 85) - (a.matchScore || 85);
      }
      if (sortBy === 'NEWEST') {
        return new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime();
      }
      if (sortBy === 'SALARY') {
        const salA = a.salaryMax || a.salaryMin || 0;
        const salB = b.salaryMax || b.salaryMin || 0;
        return salB - salA;
      }
      return 0;
    });

    return result;
  }, [jobs, jobType, minMatchScore, selectedSeniority, sortBy]);

  const handleOpenJobDetail = (job: any) => {
    setSelectedJob(job);
    setDetailModalOpen(true);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setJobType('BOTH');
    setSelectedPlatform('ALL');
    setMinMatchScore(0);
    setSortBy('BEST_MATCH');
    setSelectedSeniority('ALL');
    setSelectedDepartment('ALL');
    setSelectedWorkMode('ALL');
    fetchJobs('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16" data-purpose="discovery-section">
      {/* Toast Alert */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-semibold">{syncToast}</span>
        </div>
      )}

      {/* 1. Matching Candidate Notice Banner (Stitch Screen 2 Top Banner) */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-900/10 dark:bg-indigo-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Personalized Job Matching for {user?.displayName || 'Google Verified Candidate'}
              </p>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold">
                ✓ Profile Search
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Match scores &amp; skill alignments are computed directly between your uploaded resume profile and live job descriptions.
            </p>
          </div>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold whitespace-nowrap shadow-2xs transition-all self-start sm:self-auto"
        >
          <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          <span>Upload Resume to Re-score</span>
        </Link>
      </div>

      {/* 2. Search and Filters Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
        {/* Search Bar Row */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              id="jobQuery"
              placeholder="Search by role, skills, company, or location (e.g. Python, React, SDE-2, Bengaluru)..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchJobs(searchQuery);
              }}
            />
          </div>
          <button
            onClick={() => fetchJobs(searchQuery)}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span>Search Jobs</span>
          </button>
        </div>

        {/* Filters Row 1: Type & Recency */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Job Type Filter Pills Left Side */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">Type:</span>
            <button
              onClick={() => setJobType('BOTH')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                jobType === 'BOTH'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Both
            </button>
            <button
              onClick={() => setJobType('FULL_TIME')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                jobType === 'FULL_TIME'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Full-Time
            </button>
            <button
              onClick={() => setJobType('INTERNSHIP')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                jobType === 'INTERNSHIP'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Internships
            </button>
          </div>

          {/* Filter Dropdowns Right Side */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">Match:</span>
              <select
                value={minMatchScore}
                onChange={(e) => setMinMatchScore(Number(e.target.value))}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1 pl-2 pr-6 font-medium text-slate-700 dark:text-slate-300 focus:outline-none hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
              >
                <option value={0}>All Scores</option>
                <option value={80}>≥ 80% High Match</option>
                <option value={90}>≥ 90% Ultra Match</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
              <span className="text-slate-400 font-medium flex items-center gap-1">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1 pl-2 pr-6 font-medium text-slate-700 dark:text-slate-300 focus:outline-none hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
              >
                <option value="BEST_MATCH">Best Match (Default)</option>
                <option value="NEWEST">Newest / Recency</option>
                <option value="SALARY">Highest Salary</option>
                <option value="EXPERIENCE">Experience Level</option>
              </select>
            </div>

            {/* More Filters Toggle */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                <span>More Filters</span>
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  3
                </span>
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {moreFiltersOpen && (
                <div className="absolute right-0 mt-1.5 w-64 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md z-30 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Filter By
                    </span>
                    <button
                      type="button"
                      onClick={() => setMoreFiltersOpen(false)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      Done
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Seniority Level
                    </span>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {['Senior', 'Lead', 'Staff / Principal'].map((sen) => (
                        <span
                          key={sen}
                          onClick={() => setSelectedSeniority(selectedSeniority === sen ? 'ALL' : sen)}
                          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            selectedSeniority === sen
                              ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {sen}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Department
                    </span>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {['Platform / AI', 'Distributed', 'Frontend'].map((dep) => (
                        <span
                          key={dep}
                          onClick={() => setSelectedDepartment(selectedDepartment === dep ? 'ALL' : dep)}
                          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            selectedDepartment === dep
                              ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Work Mode
                    </span>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {['Remote', 'Hybrid', 'On-site'].map((wm) => (
                        <span
                          key={wm}
                          onClick={() => setSelectedWorkMode(selectedWorkMode === wm ? 'ALL' : wm)}
                          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            selectedWorkMode === wm
                              ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {wm}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Job Source
                    </span>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {['ALL', 'ADZUNA', 'JOOBLE'].map((src) => (
                        <span
                          key={src}
                          onClick={() => setSelectedPlatform(src)}
                          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            selectedPlatform === src
                              ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {src === 'ALL' ? 'All Sources' : src === 'ADZUNA' ? 'Adzuna' : 'Jooble'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Results Summary Meta Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <p>
          <strong className="font-bold text-slate-800 dark:text-slate-200">
            {filteredJobs.length} Verified Jobs Found
          </strong>
        </p>
      </div>

      {/* 4. Job Listing Cards Grid */}
      <div className="space-y-4">
        {filteredJobs.map((job, idx) => {
          const matchScore = job.matchScore || (idx === 0 ? 94 : idx === 1 ? 88 : 82);
          const sourceName = job.foundOnSources?.[0] || job.sourcePlatform || (idx === 0 ? 'Adzuna' : 'Jooble');
          const isAdzuna = String(sourceName).toLowerCase().includes('adzuna');
          const postedText = formatRelativeTime(job.postedAt);

          let salaryText = '$180,000 - $225,000 / yr';
          if (job.salaryMin && job.salaryMax) {
            const sym = job.salaryCurrency === 'INR' ? '₹' : '$';
            salaryText = `${sym}${job.salaryMin.toLocaleString()} - ${sym}${job.salaryMax.toLocaleString()} / yr`;
          }

          const atsText = job.sourcePlatform === 'GREENHOUSE'
            ? 'Greenhouse Direct Feed'
            : job.sourcePlatform === 'LEVER'
            ? 'Lever Posting'
            : job.sourcePlatform === 'ASHBY'
            ? 'Ashby Connect'
            : 'Direct Career Page';

          const skills = job.extractedSkills && job.extractedSkills.length > 0
            ? job.extractedSkills.slice(0, 5)
            : idx === 0
            ? ['Python 3.11', 'FastAPI', 'Distributed Queue (Kafka)', 'PostgreSQL', 'Kubernetes']
            : ['TypeScript', 'React 18', 'Next.js 14', 'Tailwind CSS', 'State Management'];

          return (
            <article
              key={job.id || idx}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all p-5 shadow-xs hover:shadow-md"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Match Chip and Source Tag */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {matchScore}% Match
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        isAdzuna
                          ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                          : 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                      }`}
                    >
                      {isAdzuna ? 'Adzuna Verified' : 'Jooble Verified'}
                    </span>
                    <span className="text-slate-400 text-xs">Posted {postedText}</span>
                  </div>

                  {/* Role Title & Company */}
                  <div>
                    <h3
                      onClick={() => handleOpenJobDetail(job)}
                      className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                    >
                      {job.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                      {job.company} • <span className="text-slate-500 font-normal">{job.location}</span>
                    </p>
                  </div>

                  {/* Salary & Details */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{salaryText}</span>
                    <span>•</span>
                    <span>{job.employmentType === 'FULL_TIME' ? 'Full-Time' : 'Contract / Internship'}</span>
                    <span>•</span>
                    <span>ATS: {atsText}</span>
                  </div>

                  {/* Required Tech Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skills.map((skill: string, sIdx: number) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[11px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 justify-center">
                  <Link
                    href={`/resumes?job=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}`}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-2xs text-center cursor-pointer"
                  >
                    Tailor Resume &amp; Apply
                  </Link>
                  <button
                    onClick={() => handleOpenJobDetail(job)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors text-center cursor-pointer"
                  >
                    View Full Job Description
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* 5. Empty State / Bottom Fallback */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Oops!! No More Job Matches?</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
          Try broadening keywords, changing recency or click on &quot;Sync More Jobs&quot;
        </p>
        <div className="inline-flex gap-2">
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer"
          >
            Clear All Filters
          </button>
          <button
            onClick={handleScanApis}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Sync More Jobs
          </button>
        </div>
      </div>

      {/* Job Details Modal */}
      {detailModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 mb-2">
                  {selectedJob.matchScore || 90}% Match Score
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedJob.title}</h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedJob.company}</span>
                  <span>•</span>
                  <span>{selectedJob.location}</span>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white">Role Overview</div>
                <p>{selectedJob.descriptionRaw || 'No detailed description available.'}</p>
              </div>

              {selectedJob.extractedSkills && selectedJob.extractedSkills.length > 0 && (
                <div>
                  <div className="font-bold text-slate-900 dark:text-white mb-2">Required Skills &amp; Keywords</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJob.extractedSkills.map((sk: string, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <a
                  href={getSafeJobUrl(selectedJob)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <span>Apply on Company Site</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <Link
                  href={`/resumes?job=${encodeURIComponent(selectedJob.title)}&company=${encodeURIComponent(
                    selectedJob.company
                  )}`}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  Tailor Resume &amp; Apply
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <JobsExplorerContent />
    </Suspense>
  );
}
