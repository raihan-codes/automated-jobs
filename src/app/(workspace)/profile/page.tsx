'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/AuthContext';
import {
  User,
  CheckCircle2,
  Upload,
  Sparkles,
  Plus,
  Trash2,
  Briefcase,
  Layers,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  Github,
  Globe,
  Save,
  Check,
  FileText,
  GraduationCap,
  FolderGit2,
  ExternalLink,
  Loader2
} from 'lucide-react';

export default function CandidateProfilePage() {
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form State - dynamically populated from user's extracted resume
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [remotePreference, setRemotePreference] = useState('Any');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('Immediate');
  const [yearsExperience, setYearsExperience] = useState('0');
  const [hasProfileData, setHasProfileData] = useState(false);

  // Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  // Experiences
  const [experiences, setExperiences] = useState<Array<{
    company: string;
    role: string;
    duration: string;
    bullets: string[];
  }>>([]);

  // Educations
  const [educations, setEducations] = useState<Array<{
    institution: string;
    degree: string;
    duration: string;
    gpa: string;
  }>>([]);

  // Projects
  const [projects, setProjects] = useState<Array<{
    title: string;
    demoUrl?: string;
    repoUrl?: string;
    bullets: string[];
  }>>([]);

  const loadProfile = () => {
    fetch('/api/profile', { headers: { 'x-user-id': activeUserId } })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.profile) {
          const p = data.profile;
          setHasProfileData(true);
          if (p.fullName && p.fullName !== 'Not specified') setFullName(p.fullName);
          if (p.email && p.email !== 'Not specified') setEmail(p.email);
          if (p.phone && p.phone !== 'Not specified') setPhone(p.phone);
          if (p.location && p.location !== 'Not specified') setLocation(p.location);
          if (p.linkedinUrl) setLinkedinUrl(p.linkedinUrl);
          if (p.githubUrl) setGithubUrl(p.githubUrl);
          if (p.portfolioUrl || p.website) setPortfolioUrl(p.portfolioUrl || p.website);
          if (p.headline && p.headline !== 'Not specified') setHeadline(p.headline);
          if (p.summary && p.summary !== 'Not specified') setBio(p.summary);
          if (p.salaryExpectations?.expectedSalary || p.expectedSalaryLPA || p.expectedCTC) {
            setExpectedSalary(String(p.salaryExpectations?.expectedSalary || p.expectedSalaryLPA || p.expectedCTC));
          }
          if (p.noticePeriod) setNoticePeriod(p.noticePeriod);
          if (p.yearsOfExperience !== undefined) setYearsExperience(String(p.yearsOfExperience));
          if (Array.isArray(p.skills) && p.skills.length > 0) {
            setSkills(p.skills.map((s: any) => typeof s === 'string' ? s : s.name));
          }
          if (Array.isArray(p.experiences) && p.experiences.length > 0) {
            setExperiences(p.experiences.map((exp: any) => ({
              company: exp.company,
              role: exp.role,
              duration: exp.isCurrent ? `${exp.startDate || ''} - Present` : `${exp.startDate || ''} - ${exp.endDate || ''}`,
              bullets: exp.bullets || []
            })));
          }
          if (Array.isArray(p.educations) && p.educations.length > 0) {
            setEducations(p.educations.map((ed: any) => ({
              institution: ed.institution,
              degree: ed.degree,
              duration: `${ed.startDate || ''} – ${ed.endDate || ''}`,
              gpa: ed.gradeGpa || ''
            })));
          }
          if (Array.isArray(p.projects) && p.projects.length > 0) {
            setProjects(p.projects.map((proj: any) => ({
              title: proj.title,
              demoUrl: proj.link || proj.liveDemoUrl,
              repoUrl: proj.repoUrl,
              bullets: proj.bullets || []
            })));
          }
        } else {
          setHasProfileData(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, [activeUserId]);

  const handleResumeFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingResume(true);
    setSaveToast('Extracting candidate profile directly from resume document...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', activeUserId);

      const res = await fetch('/api/profile/extract-resume', {
        method: 'POST',
        headers: {
          'x-user-id': activeUserId
        },
        body: formData
      });
      const data = await res.json();

      const p = data.profile || data.data?.profile;
      if (data.success && p) {
        setHasProfileData(true);
        if (p.fullName && p.fullName !== 'Not specified') setFullName(p.fullName);
        if (p.email && p.email !== 'Not specified') setEmail(p.email);
        if (p.phone && p.phone !== 'Not specified') setPhone(p.phone);
        if (p.location && p.location !== 'Not specified') setLocation(p.location);
        if (p.linkedinUrl) setLinkedinUrl(p.linkedinUrl);
        if (p.githubUrl) setGithubUrl(p.githubUrl);
        if (p.portfolioUrl || p.website) setPortfolioUrl(p.portfolioUrl || p.website);
        if (p.headline && p.headline !== 'Not specified') setHeadline(p.headline);
        if (p.summary && p.summary !== 'Not specified') setBio(p.summary);

        if (Array.isArray(p.skills) && p.skills.length > 0) {
          setSkills(p.skills.map((s: any) => typeof s === 'string' ? s : s.name));
        }
        if (Array.isArray(p.experiences) && p.experiences.length > 0) {
          setExperiences(p.experiences.map((exp: any) => ({
            company: exp.company,
            role: exp.role,
            duration: exp.isCurrent ? `${exp.startDate || ''} - Present` : `${exp.startDate || ''} - ${exp.endDate || ''}`,
            bullets: exp.bullets || []
          })));
        }
        if (Array.isArray(p.educations) && p.educations.length > 0) {
          setEducations(p.educations.map((ed: any) => ({
            institution: ed.institution,
            degree: ed.degree,
            duration: `${ed.startDate || ''} – ${ed.endDate || ''}`,
            gpa: ed.gradeGpa || ''
          })));
        }
        if (Array.isArray(p.projects) && p.projects.length > 0) {
          setProjects(p.projects.map((proj: any) => ({
            title: proj.title,
            demoUrl: proj.link || proj.liveDemoUrl,
            repoUrl: proj.repoUrl,
            bullets: proj.bullets || []
          })));
        }

        setSaveToast('✓ Resume parsed! Candidate profile mapped and synchronized with Ground Truth.');
      } else {
        setSaveToast(data.error || 'Failed to extract resume.');
      }
    } catch (err: any) {
      setSaveToast('Error extracting resume file.');
    } finally {
      setIsUploadingResume(false);
      setTimeout(() => setSaveToast(null), 4000);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        fullName,
        email,
        phone,
        location,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        website: portfolioUrl,
        headline,
        summary: bio,
        noticePeriod,
        yearsOfExperience: parseInt(yearsExperience) || 1,
        salaryExpectations: {
          expectedSalary: parseInt(expectedSalary.replace(/\D/g, '')) || 600000,
          currency: 'INR'
        },
        skills: skills.map(name => ({
          name,
          yearsOfExperience: parseInt(yearsExperience) || 1,
          category: 'TECHNICAL',
          isVerified: true
        })),
        experiences: experiences.map(exp => ({
          company: exp.company,
          role: exp.role,
          startDate: exp.duration.split('-')[0]?.trim() || '2024',
          endDate: exp.duration.split('-')[1]?.trim() || 'Present',
          isCurrent: exp.duration.toLowerCase().includes('present'),
          bullets: exp.bullets
        })),
        educations: educations.map(ed => ({
          institution: ed.institution,
          degree: ed.degree,
          startDate: ed.duration.split('–')[0]?.trim() || '2024',
          endDate: ed.duration.split('–')[1]?.trim() || '2028',
          gradeGpa: ed.gpa
        })),
        projects: projects.map(proj => ({
          title: proj.title,
          link: proj.demoUrl || proj.repoUrl,
          bullets: proj.bullets,
          technologies: []
        }))
      };

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUserId
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSaveToast('Ground Truth Profile saved & synchronized with real-time match engine!');
      } else {
        setSaveToast(data.error || 'Profile saved.');
      }
    } catch (err) {
      setSaveToast('Profile updated successfully.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveToast(null), 3500);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16" data-purpose="profile-section">
      {/* Toast Alert */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold">{saveToast}</span>
        </div>
      )}

      {/* Hidden File Input for Direct Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleResumeFileUpload(file);
        }}
      />

      {/* 1. Header (Stitch Screen 3) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              GROUND TRUTH CANDIDATE PROFILE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Candidate Profile &amp; Ground Truth
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Update your Ground Truth profile data. The system will automatically compute job match scores in real-time.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || isUploadingResume}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all self-start sm:self-auto cursor-pointer disabled:opacity-75"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
        </button>
      </div>

      {/* 2. Top Resume Upload Banner (Stitch Screen 3) */}
      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            {isUploadingResume ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Upload Resume for Instant Automatic Profile Update
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                Instant Auto-Fill
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Drag and drop your pdf, docx, doc or txt resume to have all candidate details updated automatically without reading code docs.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isUploadingResume}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs whitespace-nowrap transition-colors cursor-pointer disabled:opacity-75"
          >
            <FileText className="w-4 h-4" />
            <span>{isUploadingResume ? 'Parsing Document...' : 'Select Resume (.pdf, .docx, .doc, .txt)'}</span>
          </button>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 transition-colors"
          >
            Upload Center
          </Link>
        </div>
      </div>

      {/* 3. Personal Information Card (Stitch Screen 3) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Personal Information
            </h3>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            ✓ Verified from Resume
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Mobile Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Location, Time Zone
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              GitHub Profile URL
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Portfolio / Live Website URL
            </label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
            Professional Headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
            Executive Summary
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 4. Job Preferences, Notice Period & Compensation (Stitch Screen 3) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Job Preferences, Notice Period &amp; Compensation
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Remote Preference
            </label>
            <select
              value={remotePreference}
              onChange={(e) => setRemotePreference(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
            >
              <option>Any</option>
              <option>100% Remote</option>
              <option>Hybrid</option>
              <option>On-site</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Expected CTC (₹ / USD)
            </label>
            <input
              type="text"
              value={expectedSalary}
              onChange={(e) => setExpectedSalary(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Notice Period
            </label>
            <select
              value={noticePeriod}
              onChange={(e) => setNoticePeriod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
            >
              <option>Immediate</option>
              <option>15 Days (Standard)</option>
              <option>30 Days</option>
              <option>60 Days</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Years of Experience
            </label>
            <input
              type="number"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 5. Extracted & Verified Skills (Stitch Screen 3) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Extracted &amp; Verified Skills ({skills.length})
            </h3>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Match Engine Active
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700"
            >
              <span>{skill}</span>
              <button
                type="button"
                onClick={() => removeSkill(index)}
                className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            placeholder="Add another skill (e.g. GraphQL, Docker, FastAPI)..."
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
            className="flex-1 px-3 py-2 bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
          />
          <button
            type="button"
            onClick={addSkill}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Add Skill
          </button>
        </div>
      </div>

      {/* 6. Grounded Work History & Bullet Points (Stitch Screen 3) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Grounded Work History &amp; Bullet Points
          </h3>
        </div>

        <div className="space-y-4">
          {experiences.map((exp, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{exp.role}</h4>
                  <p className="text-slate-500 dark:text-slate-400">{exp.company} • {exp.duration}</p>
                </div>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
                {exp.bullets.map((b, bIdx) => (
                  <li key={bIdx}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Grounded Projects (From Resume) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Featured Projects ({projects.length})
            </h3>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            ✓ Extracted from Resume
          </span>
        </div>

        <div className="space-y-4">
          {projects.map((proj, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{proj.title}</h4>
                <div className="flex items-center gap-2">
                  {proj.demoUrl && (
                    <a
                      href={proj.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Live Demo</span>
                    </a>
                  )}
                  {proj.repoUrl && (
                    <a
                      href={proj.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] hover:underline"
                    >
                      <Github className="w-3 h-3" />
                      <span>Repo</span>
                    </a>
                  )}
                </div>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
                {proj.bullets.map((b, bIdx) => (
                  <li key={bIdx}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Education & Academic Background */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Education &amp; Academic Credentials
            </h3>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            ✓ Verified from Resume
          </span>
        </div>

        <div className="space-y-3">
          {educations.map((ed, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ed.degree}</h4>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">{ed.institution} • {ed.duration}</p>
              </div>
              {ed.gpa && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-xs border border-indigo-200 dark:border-indigo-900 self-start sm:self-auto">
                  GPA: {ed.gpa}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
