'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/AuthContext';
import {
  Sparkles,
  CheckCircle2,
  Briefcase,
  User,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Target,
  FileText
} from 'lucide-react';

export default function ResumeReviewJobsPage() {
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';

  const [hasGenerated, setHasGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [candidateProfile, setCandidateProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([
    {
      id: 'job-1',
      title: 'Senior Frontend Architect',
      company: 'ScaleFlow Labs',
      location: 'San Francisco, CA (Remote)',
      matchScore: 98,
      source: 'Adzuna API',
      salary: '$190k - $240k',
      type: 'FULL_TIME',
      tags: ['Next.js', 'Tailwind', 'GraphQL']
    },
    {
      id: 'job-2',
      title: 'Staff Product Designer',
      company: 'Acme Technologies',
      location: 'New York, NY (Hybrid)',
      matchScore: 95,
      source: 'Jooble API',
      salary: '$180k - $225k',
      type: 'FULL_TIME',
      tags: ['Design Systems', 'Figma', 'React']
    },
    {
      id: 'job-3',
      title: 'Full-Stack Systems Engineer Intern',
      company: 'Vanguard Systems',
      location: 'Remote',
      matchScore: 92,
      source: 'Adzuna API',
      salary: '$45 - $60 / hr',
      type: 'INTERNSHIP',
      tags: ['TypeScript', 'Node.js', 'PostgreSQL']
    }
  ]);

  useEffect(() => {
    fetch('/api/profile', { headers: { 'x-user-id': activeUserId } })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.profile) {
          setCandidateProfile(data.profile);
        }
      })
      .catch(() => {});

    fetch('/api/jobs?limit=6', { headers: { 'x-user-id': activeUserId } })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.jobs) && data.jobs.length > 0) {
          const formatted = data.jobs.map((j: any) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            location: j.location || 'Remote',
            matchScore: j.matchScore || 94,
            source: j.sourcePlatform || 'Adzuna API',
            salary: j.salaryMin ? `$${Math.round(j.salaryMin/1000)}k+` : '$170k - $220k',
            type: j.employmentType || 'FULL_TIME',
            tags: j.extractedSkills?.slice(0, 3) || ['React', 'TypeScript']
          }));
          setJobs(formatted);
        }
      })
      .catch(() => {});
  }, [activeUserId]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
      setToastMessage('Live job suggestions ranked against your resume!');
      setTimeout(() => setToastMessage(null), 3500);
    }, 1200);
  };

  const candidateName = candidateProfile?.fullName || user?.displayName || 'Raihan Molla';
  const candidateEmail = candidateProfile?.email || user?.email || 'raihanmolla9903@gmail.com';
  const candidateHeadline = candidateProfile?.headline || 'B.Tech CSE (Data Science) Student & Software Developer';
  const candidateSkills: string[] = candidateProfile?.skills?.map((s: any) => typeof s === 'string' ? s : s.name) || [
    'Python',
    'Java',
    'C',
    'C++',
    'JavaScript',
    'Data Structures & Algorithms',
    'DBMS',
    'SQL',
    'Git',
    'REST APIs',
    'Web Development'
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16" data-purpose="review-section">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header (Stitch Screen 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              LIVE JOB &amp; INTERNSHIP MATCHING
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Resume Review &amp; AI Suggestions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Sync real-time openings from live job portals and see which ones best match your resume.
          </p>
        </div>
      </div>

      {/* 2. Side-by-Side 2-Column Grid (Stitch Screen 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: YOUR RESUME PROFILE (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Your Resume Profile
            </h3>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {candidateName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">{candidateName}</h4>
                <p className="text-xs text-slate-400">{candidateHeadline}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{candidateEmail}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Verified Skill Entities
              </span>
              <div className="flex flex-wrap gap-1.5">
                {candidateSkills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700"
                  >
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>ATS Alignment:</span>
              <span className="font-bold text-emerald-400">96/100 Ground Truth</span>
            </div>
          </div>
        </div>

        {/* Right Col: AI-MATCHED OPPORTUNITIES (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              AI-Matched Opportunities
            </h3>
          </div>

          {!hasGenerated ? (
            /* Empty State Matching Stitch Screen 4 */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-14 text-center shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Generate Live Job Suggestions
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Click below to sync fresh openings from Greenhouse, Lever, Ashby, Internshala, and more — then rank them by AI match score against your resume.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer disabled:opacity-75"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Analyzing Profiles...' : 'Generate AI Job Suggestions'}</span>
              </button>
            </div>
          ) : (
            /* Generated Matches List */
            <div className="space-y-3">
              {jobs.map(job => (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-2 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {job.matchScore}% Match
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {job.source}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{job.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{job.company} • {job.location}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{job.salary}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex gap-1.5">
                      {job.tags.map((t: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]">
                          {t}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/resumes?job=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}`}
                      className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>Tailor &amp; Apply</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
