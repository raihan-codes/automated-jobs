export interface ServiceItem {
  id: number;
  number: string;
  icon: string;
  title: string;
  desc: string;
  tags: string[];
  span: string;
}

export interface CaseStudyItem {
  id: number;
  company: string;
  industry: string;
  result: string;
  desc: string;
  services: string[];
  accentColor: string;
}

export interface TeamMember {
  name: string;
  role: string;
  quote: string;
  colors: [string, string];
}

export interface FAQItem {
  q: string;
  a: string;
}

export const services: ServiceItem[] = [
  { id: 1, number: '01', icon: 'Globe', title: 'Job Search & Aggregation', desc: 'One search across Greenhouse, Lever, Ashby, LinkedIn, Indeed and more — deduplicated and refreshed continuously.', tags: ['Greenhouse', 'Lever', 'Ashby', 'LinkedIn'], span: 'col-span-2' },
  { id: 2, number: '02', icon: 'Sparkles', title: 'AI Job Matching', desc: 'Every role is scored against your resume, skills, and target compensation so you only see jobs worth your time.', tags: ['Match Score', 'JD Analysis', 'Skill Fit'], span: 'col-span-1' },
  { id: 3, number: '03', icon: 'FileText', title: 'Resume Studio', desc: 'Generate truthful, ATS-friendly resumes tailored to each job description in seconds — never fabricate, only emphasize.', tags: ['ATS Ready', 'Tailoring', 'PDF/DOCX'], span: 'col-span-1' },
  { id: 4, number: '04', icon: 'Zap', title: 'One-Click Apply', desc: 'Application forms are pre-filled from your verified profile. You review every answer before anything is submitted.', tags: ['Form Prefill', 'Auto Submit', 'Playwright'], span: 'col-span-2' },
  { id: 5, number: '05', icon: 'FileCheck2', title: 'Application Tracking', desc: 'A live pipeline for every application — matched, tailored, awaiting approval, submitted, tracking.', tags: ['Pipeline', 'Status', 'History'], span: 'col-span-1' },
  { id: 6, number: '06', icon: 'Bell', title: 'Job Alerts', desc: 'Real-time notifications the moment a role matching your profile drops — approvals, new matches, and status changes.', tags: ['Push Alerts', 'Digest', 'Filters'], span: 'col-span-1' },
  { id: 7, number: '07', icon: 'ShieldCheck', title: 'Human-Gated Automation', desc: 'Nothing is sent without you. A strict human approval gate reviews every generated resume and answer for truthfulness.', tags: ['Approval Gate', 'Truthfulness', 'Audit Log'], span: 'col-span-3' },
  { id: 8, number: '08', icon: 'UserCircle2', title: 'Profile & Settings', desc: 'Your resume, links, and preferences in one vault. Tune sources, alerts, and automation rules whenever you like.', tags: ['Profile Vault', 'Sources', 'Preferences'], span: 'col-span-1' },
];

export const caseStudies: CaseStudyItem[] = [
  { id: 1, company: 'Aarav · Backend Engineer', industry: 'SaaS', result: '3.4× More Callbacks', desc: 'Applied to 61 tailored roles in 3 weeks. Interview invites tripled compared to his previous manual approach.', services: ['AI Matching', 'Resume Studio', 'Tracking'], accentColor: 'from-ember/20 to-transparent' },
  { id: 2, company: 'Priya · Product Designer', industry: 'FinTech', result: 'Offer in 26 Days', desc: 'Automated alerts caught a newly posted senior design role within minutes. Tailored resume approved at 9am, submitted by 10am.', services: ['Job Alerts', 'One-Click Apply', 'Approvals'], accentColor: 'from-green-900/40 to-transparent' },
  { id: 3, company: 'Daniel · Data Analyst', industry: 'HealthTech', result: 'ATS Score 58 → 93', desc: 'Resume Studio rebuilt his base resume against real job descriptions — keyword-aligned and truthful. Screen passes followed.', services: ['Resume Tailoring', 'JD Analysis'], accentColor: 'from-signal/10 to-transparent' },
  { id: 4, company: 'Meera · CS Grad', industry: 'New Grad', result: '42 Applications / Week', desc: 'Turned a full-time job of applying into a 20-minute daily review. Every submission tracked from match to interview.', services: ['Aggregation', 'Pipeline', 'Alerts'], accentColor: 'from-purple-900/40 to-transparent' },
];

export const team: TeamMember[] = [
  { name: 'Product & Engineering', role: 'Founding Team', quote: 'Job searching is a job. We built the platform that automates it.', colors: ['#e8ff47', '#080812'] },
  { name: 'AI & Matching', role: 'ML Engineering', quote: 'A match score is worthless unless you can trust exactly how it was computed.', colors: ['#ff6b35', '#080812'] },
  { name: 'Automation Core', role: 'Platform Engineering', quote: 'Forms should fill themselves. Humans should make the decisions.', colors: ['#a78bfa', '#080812'] },
  { name: 'Candidate Success', role: 'Support & Research', quote: 'Every approval flow we design asks: would a candidate thank us for this?', colors: ['#34d399', '#080812'] },
];

export const faqs: FAQItem[] = [
  { q: 'How does Automated Jobs find relevant roles?', a: 'We continuously aggregate postings from Greenhouse, Lever, Ashby, Workable, LinkedIn, Indeed, Internshala, Handshake, and direct career pages — then deduplicate and score each one against your profile.' },
  { q: 'Does it auto-submit applications without my knowledge?', a: 'Never. Every application passes through a human approval gate. The AI prepares the resume and pre-fills answers; you review and approve before anything is submitted.' },
  { q: 'Will my resume pass ATS screening?', a: 'Resumes generated in Resume Studio are structured for modern ATS parsers and tailored to each job description. We only emphasize experience that already exists in your profile — we never fabricate.' },
  { q: 'What is AI Job Matching?', a: 'Each posting is analyzed for required skills, seniority, and compensation, then scored against your resume and preferences. You can filter your dashboard by minimum match score.' },
  { q: 'Which job sources are supported?', a: 'Major ATS platforms (Greenhouse, Lever, Ashby, Workable), job boards (LinkedIn, Indeed, Wellfound), early-career networks (Internshala, Handshake), and direct company career pages.' },
  { q: 'Can I track applications I applied to manually?', a: 'Yes. The application pipeline tracks everything — automated or manual — from matched, to submitted, to active tracking, with notes and status history at every stage.' },
  { q: 'Is my data private?', a: 'Your resume, profile, and application history live in your own isolated tenant workspace. You can export or delete your data at any time from Settings.' },
  { q: 'Is there a free plan?', a: 'Yes. The Free plan includes job discovery, AI matching, and manual applications. Pro unlocks unlimited tailored resumes, automation runs, and priority job alerts.' },
];
