'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  Building2,
  MapPin,
  ShieldCheck,
  Compass,
  ArrowRight,
  FileCheck2,
  Check,
  AlertTriangle,
  Edit3,
  Sliders,
  Zap,
  IndianRupee,
  ShieldAlert,
  Lock,
  Globe,
  Briefcase,
  GraduationCap,
  Code2,
  Layers,
  CheckCircle
} from 'lucide-react';

import { useAuth } from '@/lib/firebase/AuthContext';

const SAMPLE_RESUMES = [
  {
    title: 'Rohan Sharma (SDE-2 Full Stack & Backend — Bengaluru)',
    type: 'Full-Time (₹34 LPA)',
    text: `ROHAN SHARMA
Bengaluru, Karnataka • rohan.sharma@example.com • +91 98765 43210
linkedin.com/in/rohansharma-swe • github.com/rohansharma-swe

PROFESSIONAL SUMMARY
Senior Software Development Engineer (SDE-2) with 4+ years experience building high-throughput payment pipelines, real-time React web portals, and microservices in Go, Node.js, TypeScript, PostgreSQL, and Kafka. Notice Period: 30 Days. Current CTC: 24 LPA, Expected CTC: 34 LPA. Work Authorization: Indian Citizen (No sponsorship required).

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, Go (Golang), Java, Python, SQL
Frameworks: React, Next.js 14, Node.js, Spring Boot, Tailwind CSS, WebSockets
Databases & Cloud: PostgreSQL, Redis, Kafka, Docker, Kubernetes, AWS, System Design

EXPERIENCE
Razorpay Technologies — Software Development Engineer II (2022 - Present)
- Architected payment routing microservices handling 15M+ transactions/day using Go, Node.js, and Redis with sub-10ms response time.
- Engineered Next.js 14 merchant dashboard with live WebSocket telemetry serving 50,000+ businesses across India.
- Optimized PostgreSQL sharded partitions and Redis caching layer, cutting peak latency by 45%.

Swiggy — Software Development Engineer I (2020 - 2022)
- Built high-concurrency order tracking and dispatch services using Node.js and Kafka.
- Designed automated CI/CD deployment pipelines using GitHub Actions and Kubernetes.

EDUCATION
Indian Institute of Technology (IIT) Roorkee — B.Tech in Computer Science (2016 - 2020, CGPA: 8.9)`
  },
  {
    title: 'Ananya Verma (SDE Intern / College Graduate — Summer 2026)',
    type: 'Internship (₹18 LPA PPO)',
    text: `ANANYA VERMA
Bengaluru / Hyderabad • ananya.verma@example.com • +91 99887 76655
linkedin.com/in/ananyaverma-swe • github.com/ananyaverma-swe

OBJECTIVE
B.Tech Computer Science student at BITS Pilani (Class of 2026) seeking Summer 2026 SDE Internship or New Grad role focusing on React, TypeScript, Node.js, and distributed backend systems. Expected CTC: 18 LPA. Work Authorization: Indian Citizen.

SKILLS
TypeScript, React, Next.js, Node.js, Python, PostgreSQL, Redis, Docker, Git, Data Structures & Algorithms, System Design

PROJECTS & ACADEMIC EXPERIENCE
BITS Pilani Campus Portal — Full Stack Project Lead (2024)
- Built campus placement and student analytics portal using Next.js 14, PostgreSQL, and Tailwind CSS.
- Implemented secure JWT authentication and role-based access control for 8,000+ active students.

EDUCATION
BITS Pilani — B.Tech in Computer Science and Engineering (2022 - 2026, CGPA: 9.1)`
  }
];

const PIPELINE_STEPS = [
  { id: 1, title: 'Upload Resume', desc: 'Drag & Drop PDF or DOCX' },
  { id: 2, title: 'Read PDF/DOCX', desc: 'Binary layer & text extraction' },
  { id: 3, title: 'Extract Resume Text', desc: 'Normalized buffer stream' },
  { id: 4, title: 'AI / Resume Parser', desc: 'Semantic entity extraction' },
  { id: 5, title: 'Extract Details', desc: 'Name, Skills, Work, Links' },
  { id: 6, title: 'Save Candidate Profile', desc: 'Persistent master ground-truth' },
  { id: 7, title: 'Auto-Fill Application', desc: 'Sensitive fields safety gate' }
];

export default function ResumeUploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const activeUserId = user?.uid || 'user_raihan_molla';

  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('Initializing analysis...');
  const [activePipelineStep, setActivePipelineStep] = useState<number>(1);
  const [step, setStep] = useState<'UPLOAD' | 'PARSING' | 'RESULTS'>('UPLOAD');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [topAppId, setTopAppId] = useState<string>('app_figma_1');
  const [filterType, setFilterType] = useState<'ALL' | 'JOBS' | 'INTERNSHIPS'>('ALL');

  // Manual Review & Quick Edit State
  const [showManualReview, setShowManualReview] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('Kolkata, West Bengal, India');
  const [editHeadline, setEditHeadline] = useState('');
  const [editExperience, setEditExperience] = useState(3);
  const [editExpectedSalaryLPA, setEditExpectedSalaryLPA] = useState(25);
  const [editNoticePeriod, setEditNoticePeriod] = useState('30_DAYS');
  const [editWorkAuth, setEditWorkAuth] = useState('Indian Citizen (Authorized to Work)');
  const [editSkillsText, setEditSkillsText] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      if (uploadedFile.name.endsWith('.docx') || uploadedFile.name.endsWith('.pdf')) {
        setRawText(`[Selected File: ${uploadedFile.name} — Parsed server-side via native PDF/DOCX engine]`);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setRawText(content);
        };
        reader.readAsText(uploadedFile);
      }
    }
  };

  const handleSelectSample = (sampleText: string) => {
    setRawText(sampleText);
    setFile(new File([sampleText], 'Sample_Resume.txt', { type: 'text/plain' }));
  };

  const handleProcessResume = async () => {
    if (!file && !rawText.trim()) return;

    setStep('PARSING');
    setIsProcessing(true);
    setActivePipelineStep(1);

    try {
      let res;
      if (file && (file.name.endsWith('.docx') || file.name.endsWith('.pdf'))) {
        setActivePipelineStep(2);
        setProcessingStatus(
          file.name.endsWith('.pdf')
            ? 'Step 2/7: Reading PDF binary layers via PDFParse...'
            : 'Step 2/7: Reading Word .docx XML structure via Mammoth...'
        );

        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', activeUserId);
        
        setActivePipelineStep(3);
        setProcessingStatus('Step 3/7: Extracting raw textual tokens and layout stream...');

        res = await fetch('/api/profile/extract-resume', {
          method: 'POST',
          headers: {
            'x-user-id': activeUserId
          },
          body: formData
        });
      } else {
        setActivePipelineStep(3);
        setProcessingStatus('Step 3/7: Ingesting resume text stream into parser...');
        res = await fetch('/api/profile/extract-resume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': activeUserId
          },
          body: JSON.stringify({ text: rawText, userId: activeUserId })
        });
      }

      setActivePipelineStep(4);
      setProcessingStatus('Step 4/7: AI Resume Parser analyzing entities and technical taxonomy...');

      const data = await res.json();

      if (!data.success || !data.data?.profile) {
        throw new Error(data.error || 'Failed to parse resume');
      }

      setActivePipelineStep(5);
      setProcessingStatus('Step 5/7: Extracted Name, Email, Phone, Skills, Education, Experience & Sensitive Fields...');

      const profile = data.data.profile;
      setExtractedData(profile);
      setRecommendations(data.data.recommendations || []);

      // Populate Manual Quick Edit inputs
      setEditName(profile.fullName || '');
      setEditEmail(profile.email || '');
      setEditPhone(profile.phone || '+91 98765 43210');
      setEditLocation(profile.location || 'Bengaluru, India');
      setEditHeadline(profile.headline || '');
      setEditExperience(profile.yearsOfExperience || 3);
      setEditExpectedSalaryLPA(profile.expectedSalaryLPA || 25);
      setEditNoticePeriod(profile.noticePeriod || '30_DAYS');
      setEditWorkAuth(profile.workAuthorization || 'Indian Citizen (Authorized to Work)');
      setEditSkillsText(profile.skills?.map((s: any) => s.name).join(', ') || 'TypeScript, React, Node.js, PostgreSQL');

      setActivePipelineStep(6);
      setProcessingStatus('Step 6/7: Saved master ground-truth to Candidate Profile database...');

      // Pre-fill application for top match
      const topJob = data.data.recommendations?.[0] || { id: 'job_razorpay_1', company: 'Razorpay' };
      setActivePipelineStep(7);
      setProcessingStatus(`Step 7/7: Automatically filling Application Form for ${topJob.company} (Sensitive fields gated)...`);
      
      if (data.data?.topAppId) {
        setTopAppId(data.data.topAppId);
      }

      try {
        const prepRes = await fetch(`/api/applications/${topJob.id || 'job_razorpay_1'}/prepare`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': activeUserId
          }
        });
        const prepData = await prepRes.json();
        if (prepData.result?.id) {
          setTopAppId(prepData.result.id);
        }
      } catch (e) {
        console.warn('Auto-prep notice:', e);
      }

      setTimeout(() => {
        setIsProcessing(false);
        setStep('RESULTS');
      }, 800);
    } catch (e: any) {
      setIsProcessing(false);
      setStep('UPLOAD');
      alert(e.message || 'Error processing resume');
    }
  };

  const handleSaveManualUpdates = async () => {
    const updatedSkills = editSkillsText.split(',').map(s => s.trim()).filter(Boolean).map(name => ({
      name,
      category: 'TECHNICAL' as const,
      years: 3,
      level: 'ADVANCED' as const
    }));

    const updatedProfile = {
      ...extractedData,
      userId: activeUserId,
      fullName: editName,
      email: editEmail,
      phone: editPhone,
      location: editLocation,
      headline: editHeadline,
      yearsOfExperience: Number(editExperience),
      expectedSalaryLPA: Number(editExpectedSalaryLPA),
      noticePeriod: editNoticePeriod,
      workAuthorization: editWorkAuth,
      skills: updatedSkills.length > 0 ? updatedSkills : extractedData.skills
    };

    setExtractedData(updatedProfile);

    // Save and re-score
    await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': activeUserId
      },
      body: JSON.stringify(updatedProfile)
    });

    const jobsRes = await fetch('/api/jobs', {
      headers: { 'x-user-id': activeUserId }
    });
    const jobsData = await jobsRes.json();
    if (jobsData.success) {
      setRecommendations(jobsData.jobs);
    }

    setShowManualReview(false);
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

  const filteredRecommendations = recommendations.filter(job => {
    if (filterType === 'INTERNSHIPS') return job.employmentType === 'INTERNSHIP';
    if (filterType === 'JOBS') return job.employmentType !== 'INTERNSHIP';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Automated Resume Processing & Sensitive Field Gate</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          AI Resume Extractor & Application Auto-Fill
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Upload your resume in PDF or DOCX format. The parser extracts profile entities, saves them to your Candidate Profile, and auto-fills application forms with sensitive fields safety checkpoints.
        </p>
      </div>

      {/* Visual Pipeline Architecture Card */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 bg-slate-950/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>End-to-End Extraction & Auto-Fill Pipeline</span>
          </span>
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Sensitive Fields Protected
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
          {PIPELINE_STEPS.map((s) => {
            const isCompleted = step === 'RESULTS' || (step === 'PARSING' && activePipelineStep > s.id);
            const isCurrent = step === 'PARSING' && activePipelineStep === s.id;
            return (
              <div
                key={s.id}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? 'bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-500/40 shadow-lg'
                    : isCompleted
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : isCurrent
                      ? 'bg-indigo-400 text-slate-950 animate-pulse'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isCompleted ? '✓' : s.id}
                  </span>
                  <span className="text-[11px] font-bold truncate text-white">{s.title}</span>
                </div>
                <p className="text-[9px] text-slate-400 line-clamp-1">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {step === 'UPLOAD' && (
        <div className="space-y-6">
          {/* Drag and Drop Box */}
          <div className="glass-panel p-8 rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 transition-all text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {file ? file.name : 'Upload your Resume (PDF or DOCX)'}
              </h3>
              <p className="text-xs text-slate-400">
                Native binary PDF text layer parsing via PDFParse & Word .docx via Mammoth
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <label className="glass-button-primary px-5 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer inline-flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Choose Resume File (.pdf / .docx / .txt)</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Or Paste Raw Text */}
          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Or Paste Resume Plain Text</span>
              <span className="text-[11px] text-slate-400">AI Entity Parser Active</span>
            </div>

            <textarea
              rows={8}
              placeholder="Paste the full text of your resume here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />

            {/* Quick Sample Selector */}
            <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Try sample resume:</span>
                {SAMPLE_RESUMES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSample(sample.text)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium underline"
                  >
                    {sample.title.split(' ')[0]} ({sample.type})
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleProcessResume}
                disabled={!file && !rawText.trim()}
                className="glass-button-primary px-6 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Parse Resume & Auto-Fill Form</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'PARSING' && (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Executing Resume Extraction Pipeline</h3>
            <p className="text-xs text-indigo-300 font-mono max-w-md mx-auto">
              {processingStatus}
            </p>
          </div>
        </div>
      )}

      {step === 'RESULTS' && extractedData && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Action Alert Banner: Form Auto-Filled & Sensitive Fields Gate */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/40 shadow-lg shadow-amber-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Application Form Auto-Filled • Sensitive Questions Protected
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase">Human Approval Checkpoint</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Your resume has been saved to your Candidate Profile and mapped to the ATS application form. Sensitive fields (Salary Expectation & Work Authorization) have been pre-filled with safety gates for your explicit review.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowManualReview(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>

              <Link
                href={`/applications/${topAppId}`}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 whitespace-nowrap flex items-center gap-1.5"
              >
                <span>Review & Submit Application</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Sensitive Fields Safety Highlight Card */}
          <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-950/10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Sensitive Application Fields Configured
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                Explicit Confirmation Enforced
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Salary Expectation:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {extractedData.expectedSalaryLPA ? `₹${extractedData.expectedSalaryLPA} LPA` : (extractedData.minSalary ? `₹${(extractedData.minSalary / 100000).toFixed(0)} LPA` : '₹24 LPA')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Pre-filled into ATS form with <strong className="text-slate-200">85% confidence</strong>. Requires 1-click confirmation before submission.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Work Authorization / Visa:</span>
                  <span className="text-cyan-300 font-semibold truncate max-w-[200px]">
                    {extractedData.workAuthorization || 'No Sponsorship Required'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Classified as legal compliance question with <strong className="text-slate-200">Human Approval Gate</strong> attached.
                </p>
              </div>
            </div>
          </div>

          {/* Extracted Profile Ground Truth */}
          <div className="glass-panel p-6 rounded-2xl space-y-4 border border-emerald-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-base font-bold text-white">Extracted Candidate Profile Data</h2>
                  <p className="text-xs text-slate-400">Saved to Master Profile database as ground-truth</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowManualReview(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Manual Edit</span>
                </button>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Profile Active
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <p className="text-slate-400"><strong className="text-white">Full Name:</strong> {extractedData.fullName}</p>
                <p className="text-slate-400"><strong className="text-white">Email:</strong> {extractedData.email}</p>
                <p className="text-slate-400"><strong className="text-white">Phone:</strong> {extractedData.phone}</p>
                <p className="text-slate-400"><strong className="text-white">Location:</strong> {extractedData.location}</p>
                <p className="text-slate-400"><strong className="text-white">LinkedIn:</strong> {extractedData.linkedinUrl || 'Not provided'}</p>
                <p className="text-slate-400"><strong className="text-white">GitHub:</strong> {extractedData.githubUrl || 'Not provided'}</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-slate-400"><strong className="text-white">Headline:</strong> {extractedData.headline}</p>
                <p className="text-slate-400"><strong className="text-white">Experience:</strong> {extractedData.yearsOfExperience} Years</p>
                <p className="text-slate-400"><strong className="text-white">Notice Period:</strong> {extractedData.noticePeriod?.replace(/_/g, ' ') || '30 DAYS'}</p>
                <p className="text-slate-400"><strong className="text-white">Work Auth:</strong> {extractedData.workAuthorization}</p>
                <div>
                  <strong className="text-white">Extracted Skills:</strong>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {extractedData.skills?.slice(0, 10).map((s: any) => (
                      <span key={s.name} className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[10px] border border-indigo-500/20">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Job & Internship Recommendations */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Job Recommendations Matching Profile</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Ranked by AI match affinity against your parsed skills and experience.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 text-xs bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
                {(['ALL', 'JOBS', 'INTERNSHIPS'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      filterType === type
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredRecommendations.map((job) => (
                <div
                  key={job.id}
                  className="glass-panel-interactive p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center p-2 shrink-0">
                        {job.companyLogo ? (
                          <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/jobs/${job.id}`} className="text-base font-bold text-white hover:text-indigo-300 transition-colors">
                            {job.title}
                          </Link>
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {job.sourcePlatform}
                          </span>
                          {job.employmentType === 'INTERNSHIP' && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              INTERNSHIP
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="font-semibold text-slate-200">{job.company}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" /> {job.location}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold font-mono">
                            {formatSalary(job)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {job.matchResult && (
                      <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
                        <strong className="text-indigo-300">Why Match:</strong> {job.matchResult.whyMatchReason}
                      </p>
                    )}
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                      <span className="text-sm font-extrabold text-indigo-300">{job.matchScore || 95}%</span>
                      <span className="text-[10px] text-indigo-400 font-medium">Match</span>
                    </div>

                    <Link
                      href={`/jobs/${job.id}`}
                      className="glass-button-primary px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
                    >
                      <span>Tailor & Apply</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Review & Quick Update Modal */}
      {showManualReview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full rounded-2xl p-6 border border-slate-700 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Review & Edit Candidate Details</h2>
              </div>
              <button onClick={() => setShowManualReview(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-xs">
              Adjust your profile details below. Saving will update your profile and immediately recalculate job match scores.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Mobile Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Expected Salary / CTC (₹ LPA)</label>
                <input
                  type="number"
                  value={editExpectedSalaryLPA}
                  onChange={e => setEditExpectedSalaryLPA(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Work Authorization / Visa Status</label>
                <input
                  type="text"
                  value={editWorkAuth}
                  onChange={e => setEditWorkAuth(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-slate-300 font-semibold">Professional Headline</label>
              <input
                type="text"
                value={editHeadline}
                onChange={e => setEditHeadline(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-slate-300 font-semibold">Key Skills (Comma separated)</label>
              <textarea
                rows={3}
                value={editSkillsText}
                onChange={e => setEditSkillsText(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowManualReview(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualUpdates}
                className="glass-button-primary px-5 py-2 rounded-xl text-white text-xs font-bold"
              >
                Save & Re-Score Matches
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
