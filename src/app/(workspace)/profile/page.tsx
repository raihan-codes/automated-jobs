'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UserCircle2,
  Sparkles,
  Save,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Wrench,
  Sliders,
  IndianRupee,
  ShieldCheck,
  RefreshCw,
  Compass,
  ArrowUpRight,
  FileText,
  Building2,
  Check,
  Edit3,
  KeyRound
} from 'lucide-react';
import { CandidateProfileData } from '@/types';
import { useAuth } from '@/lib/firebase/AuthContext';

export default function CandidateProfilePage() {
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';

  const [profile, setProfile] = useState<CandidateProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Resume Ingestion State
  const [isExtracting, setIsExtracting] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);

  // New Skill Input State
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<'TECHNICAL' | 'FRAMEWORK' | 'TOOL' | 'SOFT'>('TECHNICAL');

  const fetchProfileAndJobs = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const headers = { 'x-user-id': activeUserId };
      const [profRes, jobsRes] = await Promise.all([
        fetch('/api/profile', { headers }),
        fetch('/api/jobs', { headers })
      ]);
      const profData = await profRes.json();
      const jobsData = await jobsRes.json();

      if (profData.success) {
        setProfile(profData.profile);
      }
      if (jobsData.success) {
        setRecommendedJobs(jobsData.jobs.slice(0, 3));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndJobs();
  }, [activeUserId]);

  const handleAutoExtractFile = async (uploadedFile: File) => {
    setIsExtracting(true);
    setSyncFeedback({
      type: 'info',
      message: `Extracting ${uploadedFile.name} and updating candidate profile automatically...`
    });

    try {
      let res;
      if (uploadedFile.name.endsWith('.docx') || uploadedFile.name.endsWith('.pdf')) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('userId', activeUserId);
        res = await fetch('/api/profile/extract-resume', {
          method: 'POST',
          headers: { 'x-user-id': activeUserId },
          body: formData
        });
      } else {
        const text = await uploadedFile.text();
        res = await fetch('/api/profile/extract-resume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': activeUserId
          },
          body: JSON.stringify({ text, userId: activeUserId })
        });
      }

      const data = await res.json();

      if (data.success && data.data?.profile) {
        setProfile(data.data.profile);
        if (data.data.recommendations) {
          setRecommendedJobs(data.data.recommendations.slice(0, 3));
        }

        setSyncFeedback({
          type: 'success',
          message: `✓ Successfully updated profile for ${data.data.profile.fullName}! ${data.data.extractedSkillsCount} skills and ${data.data.extractedRolesCount} experience roles extracted. Job recommendations refreshed.`
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 5000);
      } else {
        setSyncFeedback({
          type: 'error',
          message: data.error || 'Failed to extract resume. Please check file format.'
        });
      }
    } catch (e: any) {
      setSyncFeedback({
        type: 'error',
        message: e.message || 'Error processing resume file.'
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (uploaded) {
      handleAutoExtractFile(uploaded);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleAutoExtractFile(droppedFile);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUserId
        },
        body: JSON.stringify({ ...profile, userId: activeUserId })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        const jobsRes = await fetch('/api/jobs', {
          headers: { 'x-user-id': activeUserId }
        });
        const jobsData = await jobsRes.json();
        if (jobsData.success) {
          setRecommendedJobs(jobsData.jobs.slice(0, 3));
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (!newSkillName.trim() || !profile) return;
    const exists = profile.skills.some(s => s.name.toLowerCase() === newSkillName.trim().toLowerCase());
    if (!exists) {
      const updatedSkills = [
        ...profile.skills,
        { name: newSkillName.trim(), category: newSkillCategory, years: 3, level: 'ADVANCED' as const }
      ];
      setProfile({ ...profile, skills: updatedSkills });
    }
    setNewSkillName('');
  };

  const removeSkill = (skillName: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.filter(s => s.name !== skillName)
    });
  };

  const formatSalary = (job: any) => {
    if (job.salaryMin && job.salaryMax) {
      const minLPA = (job.salaryMin / 100000).toFixed(0);
      const maxLPA = (job.salaryMax / 100000).toFixed(0);
      return `₹${minLPA} - ₹${maxLPA} LPA`;
    }
    if (job.salaryMin) {
      return `₹${(job.salaryMin / 100000).toFixed(0)} LPA`;
    }
    return 'Competitive';
  };

  if (loading || !profile) {
    return (
      <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
        <span className="text-sm font-medium">Loading Candidate Profile & Ground Truth...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCircle2 className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Ground-Truth Candidate Profile</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Candidate Profile & Ground Truth
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload your resume (.docx, .pdf, .txt). The system will automatically extract and update all fields in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="glass-button-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold text-white">Profile Updated Successfully</p>
            <p className="text-emerald-200">Candidate ground-truth details saved and job match scores recalculated.</p>
          </div>
        </div>
      )}

      {/* TOP SECTION: Automatic Resume Ingestion Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="glass-panel p-6 rounded-2xl border-2 border-dashed border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 space-y-4 hover:border-indigo-400 transition-all"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
              {isExtracting ? (
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              ) : (
                <Upload className="w-6 h-6 text-indigo-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">
                  Upload Resume for Instant Automatic Profile Update
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Instant Auto-Sync
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Drag and drop your <strong>.docx, .pdf, or .txt</strong> resume file here. All fields below will update automatically without needing extra clicks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            <label className="glass-button-primary px-5 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-indigo-600/20">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>{isExtracting ? 'Extracting Resume...' : 'Select Resume (.docx / .pdf / .txt)'}</span>
              <input
                type="file"
                accept=".docx,.pdf,.txt,.md,.json"
                onChange={handleFileInputChange}
                disabled={isExtracting}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Live Feedback Toast */}
        {syncFeedback && (
          <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
              : syncFeedback.type === 'error'
              ? 'bg-rose-950/70 border border-rose-500/40 text-rose-300'
              : 'bg-indigo-950/70 border border-indigo-500/40 text-indigo-300'
          }`}>
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : syncFeedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
            )}
            <span className="font-medium">{syncFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Suggested Jobs Matching Updated Resume */}
      {recommendedJobs.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Suggested Opportunities Matching Your Updated Resume</span>
            </h2>
            <Link href="/jobs" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
              <span>View All Discovered Jobs</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recommendedJobs.map(job => (
              <div key={job.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate max-w-[140px]">{job.company}</span>
                  <span className="text-xs font-bold text-indigo-300 font-mono">{job.matchScore || 95}% Match</span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-1 font-medium">{job.title}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span className="text-emerald-400 font-semibold">{formatSalary(job)}</span>
                  <Link href={`/jobs/${job.id}`} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                    Tailor & Apply →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Profile Details Form */}
      <form onSubmit={handleSave} className="space-y-6 text-xs">
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCircle2 className="w-4 h-4 text-indigo-400" />
              <span>Personal Information</span>
            </h2>
            <span className="text-[10px] text-slate-400">Auto-filled from resume</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Full Name</label>
              <input
                type="text"
                value={profile.fullName || ''}
                onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 font-medium"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Email Address</label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={e => setProfile({ ...profile, email: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Mobile Number</label>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Location / Base City</label>
              <input
                type="text"
                value={profile.location || ''}
                onChange={e => setProfile({ ...profile, location: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">LinkedIn Profile URL</label>
              <input
                type="url"
                value={profile.linkedinUrl || ''}
                onChange={e => setProfile({ ...profile, linkedinUrl: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">GitHub / Portfolio URL</label>
              <input
                type="url"
                value={profile.githubUrl || ''}
                onChange={e => setProfile({ ...profile, githubUrl: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-slate-300 font-semibold">Professional Headline</label>
            <input
              type="text"
              value={profile.headline || ''}
              onChange={e => setProfile({ ...profile, headline: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold">Executive Summary</label>
            <textarea
              rows={3}
              value={profile.summary || ''}
              onChange={e => setProfile({ ...profile, summary: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Job Search Preferences */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Job Preferences, Notice Period & Compensation</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Remote Preference</label>
              <select
                value={profile.remotePreference}
                onChange={e => setProfile({ ...profile, remotePreference: e.target.value as any })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="REMOTE_OR_HYBRID">Remote or Hybrid</option>
                <option value="REMOTE">Remote Only</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">Onsite</option>
                <option value="ANY">Any</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Expected CTC (in ₹ LPA)</label>
              <input
                type="number"
                value={profile.expectedSalaryLPA || 25}
                onChange={e => setProfile({ ...profile, expectedSalaryLPA: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Notice Period</label>
              <select
                value={profile.noticePeriod || '30_DAYS'}
                onChange={e => setProfile({ ...profile, noticePeriod: e.target.value as any })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="IMMEDIATE">Immediate Joiner / Serving Notice</option>
                <option value="15_DAYS">15 Days</option>
                <option value="30_DAYS">30 Days (Standard)</option>
                <option value="60_DAYS">60 Days</option>
                <option value="90_DAYS">90 Days</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Years of Experience</label>
              <input
                type="number"
                step="0.5"
                value={profile.yearsOfExperience}
                onChange={e => setProfile({ ...profile, yearsOfExperience: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Skills Tag Management */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-400" />
              <span>Extracted & Verified Skills ({profile.skills.length})</span>
            </h2>
            <span className="text-[10px] text-slate-400">Ground-Truth Zero-Hallucination Inventory</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {profile.skills.map(s => (
              <span
                key={s.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-[10px] text-indigo-400 font-mono">({s.level})</span>
                <button
                  type="button"
                  onClick={() => removeSkill(s.name)}
                  className="text-slate-500 hover:text-rose-400 ml-1"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              placeholder="Add skill (e.g. GraphQL, AWS, Rust, Kafka)..."
              value={newSkillName}
              onChange={e => setNewSkillName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill();
                }
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 flex-1"
            />
            <select
              value={newSkillCategory}
              onChange={e => setNewSkillCategory(e.target.value as any)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="TECHNICAL">Technical</option>
              <option value="FRAMEWORK">Framework</option>
              <option value="TOOL">Tool</option>
              <option value="SOFT">Soft</option>
            </select>
            <button
              type="button"
              onClick={addSkill}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Work Experience */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Briefcase className="w-4 h-4 text-purple-400" />
            <span>Extracted Work History & Bullet Points</span>
          </h2>

          <div className="space-y-4">
            {profile.experiences.map((exp, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{exp.role} — <span className="text-indigo-300">{exp.company}</span></span>
                  <span className="text-slate-400 font-mono text-[11px]">{exp.startDate} - {exp.endDate || 'Present'}</span>
                </div>
                <ul className="list-disc list-outside ml-4 space-y-1 text-slate-300">
                  {exp.bullets.map((b, bIdx) => (
                    <li key={bIdx}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
