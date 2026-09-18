'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Sparkles,
  Building2,
  ExternalLink,
  Layers,
  Check
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';

import { useAuth } from '@/lib/firebase/AuthContext';

export default function ResumeStudioPage() {
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';

  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResume, setSelectedResume] = useState<any>(null);
  const [candidateProfile, setCandidateProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  const fetchResumes = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
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
      if (data.success) {
        setResumes(data.resumes);
        if (data.resumes.length > 0) {
          setSelectedResume(data.resumes[0]);
        }
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

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading Resume Studio...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Truthful ATS Resume Studio</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            JD-Tailored Resumes
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Every bullet point, skill, and metric is strictly validated against your verified master profile to ensure zero hallucinations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF Export</span>
          </button>
        </div>
      </div>

      {resumes.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-white">No tailored resumes generated yet</h3>
          <p className="text-xs text-slate-400">Select any discovered job and click &quot;Tailor Resume &amp; Apply&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: List of Resumes */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Generated Resumes ({resumes.length})
            </h2>

            {resumes.map(r => {
              const isSelected = selectedResume?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedResume(r)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-indigo-950/50 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[180px]">
                      {r.content?.targetCompany || 'Target Role'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1">{r.content?.targetRole}</p>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Generated {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })}

            {/* Anti-Hallucination Audit Box */}
            {selectedResume?.content?.verificationReport && (
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Zero-Hallucination Audit Passed</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  All {selectedResume.content.verificationReport.verifiedSkillsCount} skills and claims in this resume have been verified to originate from candidate ground-truth profile data.
                </p>
              </div>
            )}
          </div>

          {/* Right 2 Columns: ATS Resume Document Viewer */}
          <div className="lg:col-span-2 glass-panel p-8 rounded-2xl space-y-6 font-sans text-slate-200">
            {selectedResume?.content ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center pb-4 border-b border-slate-800 space-y-1.5">
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    {candidateProfile?.fullName || user?.displayName || user?.email?.split('@')[0] || 'Candidate Resume'}
                  </h1>
                  <p className="text-xs text-indigo-400 font-medium">
                    {selectedResume.content?.targetRole || candidateProfile?.desiredTitles?.[0] || 'Software Engineer'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {[
                      candidateProfile?.location,
                      candidateProfile?.email || user?.email,
                      candidateProfile?.phone,
                      candidateProfile?.linkedinUrl,
                      candidateProfile?.githubUrl
                    ].filter(Boolean).join(' • ')}
                  </p>
                </div>

                {/* Professional Summary */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1">
                    Professional Summary
                  </h2>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {selectedResume.content.summary}
                  </p>
                </div>

                {/* Core Technical Skills */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1">
                    Technical Expertise & Tools
                  </h2>
                  <div className="space-y-1.5 text-xs">
                    {selectedResume.content.skillsSection?.map((group: any) => (
                      <div key={group.category} className="flex gap-2">
                        <span className="font-semibold text-slate-200 min-w-[180px]">{group.category}:</span>
                        <span className="text-slate-300">{group.skills.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Work Experience */}
                <div className="space-y-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1">
                    Professional Experience
                  </h2>

                  {selectedResume.content.experienceSection?.map((exp: any, idx: number) => (
                    <div key={idx} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{exp.role} — <span className="text-indigo-300">{exp.company}</span></span>
                        <span className="text-slate-400 font-mono">{exp.period}</span>
                      </div>
                      <ul className="list-disc list-outside ml-4 space-y-1 text-slate-300 leading-relaxed">
                        {exp.bullets?.map((bullet: string, bIdx: number) => (
                          <li key={bIdx}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Projects */}
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1">
                    Key Engineering Projects
                  </h2>

                  {selectedResume.content.projectsSection?.map((proj: any, idx: number) => (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{proj.title}</span>
                        <span className="text-slate-400 font-mono">{proj.technologies?.join(', ')}</span>
                      </div>
                      <ul className="list-disc list-outside ml-4 space-y-1 text-slate-300 leading-relaxed">
                        {proj.bullets?.map((bullet: string, bIdx: number) => (
                          <li key={bIdx}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Education */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1">
                    Education
                  </h2>
                  {selectedResume.content.educationSection?.map((edu: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">{edu.institution}</span> — <span className="text-slate-300">{edu.degree}</span>
                      </div>
                      {edu.period && <span className="text-slate-400 font-mono">{edu.period}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs text-center py-12">Select a resume to preview.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
