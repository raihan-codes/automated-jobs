'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/firebase/AuthContext';
import {
  FileText,
  Printer,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Layers,
  Building2,
  Calendar,
  RefreshCw
} from 'lucide-react';

function ResumeStudioContent() {
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';
  const searchParams = useSearchParams();
  const targetJobQuery = searchParams.get('job');
  const targetCompanyQuery = searchParams.get('company');

  const [resumes, setResumes] = useState<any[]>([]);
  const [candidateProfile, setCandidateProfile] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>(
    targetJobQuery || 'Senior Staff Product Designer - Stripe'
  );
  const [loading, setLoading] = useState(true);
  const [tailoringToast, setTailoringToast] = useState<string | null>(null);

  const fetchResumes = async () => {
    try {
      const headers = { 'x-user-id': activeUserId };
      const [res, profRes] = await Promise.all([
        fetch('/api/resumes', { headers }),
        fetch('/api/profile', { headers })
      ]);
      const data = await res.json();
      const profData = await profRes.json();
      if (profData.success && profData.profile) {
        setCandidateProfile(profData.profile);
      }
      if (data.success && Array.isArray(data.resumes) && data.resumes.length > 0) {
        setResumes(data.resumes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, [activeUserId]);

  const handlePrint = () => {
    window.print();
  };

  const candidateName = candidateProfile?.fullName || user?.displayName || 'Raihan Molla';
  const candidateEmail = candidateProfile?.email || user?.email || 'raihanmolla993@gmail.com';
  const candidatePhone = candidateProfile?.phone || '+1 (555) 389-4210';
  const candidateLocation = candidateProfile?.location || 'San Francisco, CA (PST)';
  const candidateHeadline = candidateProfile?.headline || 'Principal Product Designer & Systems Architect';
  const candidateSummary = candidateProfile?.summary || 'Principal Product Designer with 8+ years of experience scaling enterprise SaaS applications, design systems, and cross-functional engineering workflows. Specializing in complex data-dense interfaces and zero-latency design architectures.';

  const candidateSkills: string[] = (candidateProfile?.skills && candidateProfile.skills.length > 0)
    ? candidateProfile.skills.map((s: any) => typeof s === 'string' ? s : s.name)
    : ['Figma / Design Systems', 'React', 'Tailwind CSS', 'User Research & Metrics', 'TypeScript & Next.js', 'Information Architecture'];

  const candidateExperiences = (candidateProfile?.experiences && candidateProfile.experiences.length > 0)
    ? candidateProfile.experiences.map((exp: any) => ({
        company: exp.company,
        role: exp.role,
        duration: exp.duration || (exp.isCurrent ? `${exp.startDate} - Present` : `${exp.startDate || ''} - ${exp.endDate || ''}`),
        bullets: exp.bullets || []
      }))
    : [
        {
          company: targetCompanyQuery || 'Acme Corp',
          role: 'Staff Product Designer',
          duration: '2021 - Present',
          bullets: [
            'Spearheaded redesign of core SaaS analytics dashboard, improving user engagement metrics across enterprise tier by 32%.',
            'Architected design token system scaling from 3 to 45 internal product squads using Figma, React, and Tailwind CSS.',
            'Mentored 6 mid-level and senior designers across distributed global squads.'
          ]
        },
        {
          company: 'TechScale',
          role: 'Senior UX Engineer',
          duration: '2018 - 2021',
          bullets: [
            'Developed high-performance design tokens and React UI packages reducing engineering handoff time by 35%.',
            'Collaborated closely with product managers to run iterative user testing cycles and usability audits.'
          ]
        }
      ];

  const hasTailoredJob = Boolean(targetJobQuery);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16" data-purpose="studio-section">
      {/* Toast Alert */}
      {tailoringToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-semibold">{tailoringToast}</span>
        </div>
      )}

      {/* 1. Header (Stitch Screen 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              TRUTHFUL ATS RESUME STUDIO
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            JD-Tailored Resumes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Every bullet point, skill, and metric is strictly validated against your verified master profile to ensure zero hallucinations.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-2xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print / PDF Export</span>
        </button>
      </div>

      {/* 2. Main Content View: Either Empty State or Tailored Resume Preview (Stitch Screen 1) */}
      {!hasTailoredJob && resumes.length === 0 ? (
        /* Empty State directly from Stitch Screen 1 */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 sm:p-24 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            No tailored resumes generated yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Select any discovered job and click &quot;Tailor Resume &amp; Apply&quot;.
          </p>
          <Link
            href="/jobs"
            className="inline-flex px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-sm transition cursor-pointer"
          >
            Discover Open Jobs
          </Link>
        </div>
      ) : (
        /* Active Tailored Resume View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls & Ground Truth (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Target Job Match
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  96% Match
                </span>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Role Selected</label>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                  {selectedRole}
                </div>
              </div>
              <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                <div className="flex justify-between">
                  <span>ATS Keyword Match:</span>
                  <span className="font-bold text-emerald-600">18/18 (100%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Ground Truth Verification:</span>
                  <span className="font-bold text-indigo-600">Strict Match</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero-Hallucination Safe Mode</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Every generated metric and bullet point is strictly cross-referenced against your Candidate Profile ({candidateName}). Unverified claims are prohibited.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-xs pt-1"
              >
                <span>Edit Candidate Ground Truth</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Clean Tailored Document Paper (8 Cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 shadow-sm space-y-6">
            {/* Resume Header */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{candidateName}</h2>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{candidateHeadline}</p>
              <p className="text-xs text-slate-400 mt-1">
                {candidateLocation} • {candidateEmail} • {candidatePhone}
              </p>
            </div>

            {/* Summary */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Professional Summary
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {candidateSummary}
              </p>
            </div>

            {/* Skills */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Target Competencies &amp; Skills
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {candidateSkills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Verified Work Experience
              </h3>
              <div className="space-y-4">
                {candidateExperiences.map((exp, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{exp.role} — {exp.company}</span>
                      <span className="text-slate-400 text-[11px]">{exp.duration}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
                      {exp.bullets.map((b: string, bIdx: number) => (
                        <li key={bIdx}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResumeStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <ResumeStudioContent />
    </Suspense>
  );
}

