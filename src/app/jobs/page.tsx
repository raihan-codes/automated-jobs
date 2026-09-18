'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  RefreshCw,
  Compass,
  Sparkles,
  Building2,
  MapPin,
  IndianRupee,
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
  Upload
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';

import { useAuth } from '@/lib/firebase/AuthContext';

const ALL_PLATFORMS = [
  { id: 'ALL', label: 'All Sources (Global Aggregation)' },
  { id: 'GREENHOUSE', label: 'Greenhouse' },
  { id: 'LEVER', label: 'Lever' },
  { id: 'ASHBY', label: 'Ashby' },
  { id: 'WORKABLE', label: 'Workable' },
  { id: 'WELLFOUND', label: 'Wellfound' },
  { id: 'INTERNSHALA', label: 'Internshala' },
  { id: 'HANDSHAKE', label: 'Handshake' },
  { id: 'INDEED', label: 'Indeed' },
  { id: 'LINKEDIN', label: 'LinkedIn' },
  { id: 'CAREER_PAGES', label: 'Company Careers' }
];

export default function JobsExplorerPage() {
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidateName, setCandidateName] = useState<string>('Candidate');
  const [hasCustomProfile, setHasCustomProfile] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>('ALL');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minMatchScore, setMinMatchScore] = useState<number>(0);

  // Sync Modal State
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncPlatform, setSyncPlatform] = useState('ALL');
  const [syncCompanySlug, setSyncCompanySlug] = useState('tech');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const { user } = useAuth();

  const fetchJobs = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedPlatform !== 'ALL') params.append('platform', selectedPlatform);
      if (selectedEmploymentType !== 'ALL') params.append('type', selectedEmploymentType);
      if (remoteOnly) params.append('remote', 'true');
      if (minMatchScore > 0) params.append('minScore', String(minMatchScore));

      const res = await fetch(`/api/jobs?${params.toString()}`, {
        headers: {
          'x-user-id': activeUserId
        }
      });
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
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
  };

  useEffect(() => {
    fetchJobs();
  }, [selectedPlatform, selectedEmploymentType, remoteOnly, minMatchScore, activeUserId]);

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
        body: JSON.stringify({ platform: syncPlatform, companySlug: syncCompanySlug })
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
      const minLPA = (job.salaryMin / 100000).toFixed(0);
      const maxLPA = (job.salaryMax / 100000).toFixed(0);
      return `₹${minLPA} - ₹${maxLPA} LPA`;
    }
    return job.salaryMin ? `₹${(job.salaryMin / 100000).toFixed(0)} LPA` : 'Competitive';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Global Multi-Source Ingestion Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Global Job & Internship Discovery Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Aggregated across 10+ verified career sources (Greenhouse, Lever, Ashby, Workable, Wellfound, Internshala, Handshake, Indeed, LinkedIn, Direct Career Pages) with cross-platform deduplication and zero-hallucination AI matching.
          </p>
        </div>

        <button
          onClick={() => setShowSyncModal(true)}
          className="glass-button-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Sync Connectors & Career Boards</span>
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
                Personalized AI Recommendations for {candidateName}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                {hasCustomProfile ? 'Resume Match Active' : 'Default Profile'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Match scores & why-match explanations are dynamically calibrated against your uploaded resume in your Firebase Vault.
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
              placeholder="Search by title, company, skills, or location (e.g. Full Stack, Kolkata, Bengaluru, San Francisco, React, Go)..."
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

        {/* Opportunity Type Toggles (All vs Full Time vs Internships) */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5" /> Opportunity Type:
          </span>
          {[
            { id: 'ALL', label: 'All Opportunities' },
            { id: 'FULL_TIME', label: 'Full-Time Jobs' },
            { id: 'INTERNSHIP', label: 'Internships & Co-ops' }
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

        {/* Platform Source Filters (All 10 Connectors) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 max-w-full">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Source:
            </span>
            {ALL_PLATFORMS.map(plat => (
              <button
                key={plat.id}
                onClick={() => setSelectedPlatform(plat.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                  selectedPlatform === plat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {plat.id === 'ALL' ? '🌟 ALL (Global)' : plat.label}
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
                <option value={90}>≥ 90% Match</option>
                <option value={95}>≥ 95% Match</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Results Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Showing {jobs.length} aggregated opportunities across enabled connectors</span>
          <span>Deduplicated & synced in real-time</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading discovered jobs & internships...</div>
        ) : jobs.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
            <Compass className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-white">No opportunities matched your current criteria</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try selecting &quot;All Sources&quot;, clearing keyword filters, or running a sync across all connectors.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {jobs.map(job => {
              const deduplicatedSources = job.foundOnSources || [job.sourcePlatform];
              const isMultiSource = deduplicatedSources.length > 1;

              return (
                <div
                  key={job.id}
                  className="glass-panel-interactive p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center p-2 shrink-0">
                        {job.companyLogo ? (
                          <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/jobs/${job.id}`} className="text-base font-bold text-white hover:text-indigo-400 transition-colors">
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

                          {/* Application Method Indicator */}
                          {job.applicationMethod === 'EXTERNAL_PORTAL_LINK' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                              <ExternalLink className="w-2.5 h-2.5" />
                              External Apply Link
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5" />
                              ATS Auto-Fill Ready
                            </span>
                          )}
                        </div>

                        {/* Deduplication Multi-Source Badge */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-semibold text-slate-200">{job.company}</span>
                          <span className="text-xs text-slate-600">•</span>
                          <span className="text-xs flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" /> {job.location}
                          </span>
                          <span className="text-xs text-slate-600">•</span>
                          <span className="text-xs text-emerald-400 font-semibold font-mono flex items-center gap-1">
                            <IndianRupee className="w-3.5 h-3.5" />
                            {formatSalary(job)}
                          </span>
                        </div>

                        {/* Cross-Source Deduplication Banner */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-medium">Found on:</span>
                          {deduplicatedSources.map((src: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-500/30"
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Skill Tags */}
                    {job.extractedSkills && job.extractedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.extractedSkills.slice(0, 6).map((skill: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Score and Action */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-left md:text-right">
                      <div className="flex items-center gap-1.5 md:justify-end">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span className="text-xl font-extrabold text-white font-mono">
                          {job.matchScore || 90}%
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                        AI Stack Fit
                      </span>
                    </div>

                    <Link
                      href={`/jobs/${job.id}`}
                      className="glass-button-primary px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
                    >
                      <span>Tailor & Auto-Fill</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sync Custom Company Board Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-slate-700 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Sync Connectors & Career Feeds</h2>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleSyncSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Source Connector</label>
                <select
                  value={syncPlatform}
                  onChange={e => setSyncPlatform(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">🌟 ALL Connectors (Global Concurrent Sync)</option>
                  <option value="GREENHOUSE">Greenhouse (boards-api.greenhouse.io)</option>
                  <option value="LEVER">Lever (api.lever.co/v0/postings)</option>
                  <option value="ASHBY">Ashby (api.ashbyhq.com)</option>
                  <option value="WORKABLE">Workable (apply.workable.com)</option>
                  <option value="WELLFOUND">Wellfound (AngelList Talent)</option>
                  <option value="INTERNSHALA">Internshala (Early Careers & Internships)</option>
                  <option value="HANDSHAKE">Handshake (University Networks)</option>
                  <option value="INDEED">Indeed (Global Job Search)</option>
                  <option value="LINKEDIN">LinkedIn (Public Career Opportunities)</option>
                  <option value="CAREER_PAGES">Direct Company Career Pages</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Search Keywords / Company Slug</label>
                <input
                  type="text"
                  placeholder="e.g. razorpay, figma, zepto, stripe, fullstack, python"
                  value={syncCompanySlug}
                  onChange={e => setSyncCompanySlug(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Enter target company name, ATS board slug, or job role keywords.
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
                  <span>{isSyncing ? 'Ingesting...' : 'Start Ingestion'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
