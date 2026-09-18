// Multi-tenant Store & Database Access Layer with Auto-seeding
import { CandidateProfileData, NormalizedJobPosting, MatchAnalysisResult, TailoredResumeContent, ApplicationFormField, ApplicationStatus } from '@/types';

export interface StoredTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface StoredUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface StoredJobPosting extends NormalizedJobPosting {
  id: string;
  tenantId: string;
  fingerprint: string;
  lastSyncedAt: string;
}

export interface StoredJobMatch {
  id: string;
  userId: string;
  jobPostingId: string;
  matchResult: MatchAnalysisResult;
  isStarred: boolean;
  isDismissed: boolean;
  createdAt: string;
}

export interface StoredTailoredResume {
  id: string;
  userId: string;
  jobPostingId?: string;
  content: TailoredResumeContent;
  createdAt: string;
}

export interface StoredApplication {
  id: string;
  userId: string;
  jobPostingId: string;
  tailoredResumeId?: string;
  status: ApplicationStatus;
  automationEngine: 'PLAYWRIGHT' | 'API' | 'MANUAL';
  formUrl?: string;
  fields: ApplicationFormField[];
  hasSensitiveQuestions: boolean;
  requiresHumanInput: boolean;
  humanReviewNotes?: string;
  approvedAt?: string;
  submittedAt?: string;
  screenshotSnapshot?: string;
  stage: 'SUBMITTED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredNotification {
  id: string;
  userId: string;
  type: 'JOB_DISCOVERED' | 'RESUME_READY' | 'APPROVAL_REQUIRED' | 'APPLICATION_SUBMITTED' | 'SYSTEM';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface StoredAuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

// Global In-Memory and persistent store state
class StoreService {
  private static instance: StoreService;

  public tenants: StoredTenant[] = [];
  public users: StoredUser[] = [];
  public profiles: Map<string, CandidateProfileData> = new Map(); // userId -> CandidateProfileData
  public jobPostings: StoredJobPosting[] = [];
  public matches: StoredJobMatch[] = [];
  public resumes: StoredTailoredResume[] = [];
  public applications: StoredApplication[] = [];
  public notifications: StoredNotification[] = [];
  public auditLogs: StoredAuditLog[] = [];

  private constructor() {
    this.seedDefaultData();
  }

  public static getInstance(): StoreService {
    if (!(globalThis as any).__storeServiceInstance) {
      (globalThis as any).__storeServiceInstance = new StoreService();
    }
    return (globalThis as any).__storeServiceInstance;
  }

  public seedDefaultData() {
    const tenantId = 'tenant_prod_enterprise_1';
    const userId = 'user_alex_chen';

    this.tenants = [
      {
        id: tenantId,
        name: 'HyperScale AI Labs',
        slug: 'hyperscale-ai',
        plan: 'enterprise'
      }
    ];

    this.users = [];
    // Candidate profiles will be created upon first login


    // Seed Real ATS & Aggregated Jobs from 10 Global Connectors
    this.jobPostings = [
      {
        id: 'job_razorpay_1',
        tenantId,
        sourcePlatform: 'GREENHOUSE',
        sourceJobId: 'rzp_88410',
        sourceUrl: 'https://boards.greenhouse.io/razorpay/jobs/88410',
        applicationUrl: 'https://boards.greenhouse.io/razorpay/jobs/88410',
        applicationMethod: 'AUTOMATED_ATS',
        foundOnSources: ['GREENHOUSE', 'LINKEDIN', 'INDEED', 'CAREER_PAGES'],
        fingerprint: 'fp_razorpay_sde2_fullstack_88410',
        company: 'Razorpay',
        companyLogo: 'https://cdn.worldvectorlogo.com/logos/razorpay.svg',
        title: 'Software Development Engineer II (SDE-2) - Payments Core',
        department: 'Core Payments Engineering',
        location: 'Bengaluru, Karnataka (Hybrid / Remote India)',
        country: 'India',
        isRemote: true,
        remoteType: 'REMOTE',
        employmentType: 'FULL_TIME',
        salaryMin: 2800000,
        salaryMax: 4200000,
        salaryCurrency: 'INR',
        descriptionRaw: `Razorpay is India's leading full-stack financial solutions company. We power payments for over 10M+ businesses across India.
We are looking for an SDE-2 to build our next-generation high-throughput payment routing and checkout systems.

What You'll Do:
- Architect highly available payment processing microservices using Go, Node.js, and TypeScript.
- Build reliable Kafka event streams and PostgreSQL/Redis datastores processing 5,000+ transactions per second.
- Collaborate with product and design teams in Bengaluru to deliver developer-first APIs and payment gateways.

Requirements:
- 2+ years of software development experience in product engineering.
- Proficiency with Go, TypeScript, Node.js, and PostgreSQL.
- Strong grounding in distributed systems, concurrency, and caching.`,
        postedAt: new Date(Date.now() - 3600 * 1000 * 2),
        updatedAt: new Date(Date.now() - 3600 * 1000 * 2),
        lastSyncedAt: new Date().toISOString(),
        extractedSkills: ['TypeScript', 'Node.js', 'Go', 'PostgreSQL', 'Redis', 'Kafka', 'System Design'],
        experienceLevel: 'MID',
        visaAllowed: true
      },
      {
        id: 'job_zepto_intern',
        tenantId,
        sourcePlatform: 'ASHBY',
        sourceJobId: 'zpt_int_2026',
        sourceUrl: 'https://jobs.ashbyhq.com/zepto/zpt_int_2026',
        applicationUrl: 'https://jobs.ashbyhq.com/zepto/zpt_int_2026',
        applicationMethod: 'AUTOMATED_ATS',
        foundOnSources: ['ASHBY', 'INTERNSHALA', 'HANDSHAKE'],
        fingerprint: 'fp_zepto_sde_intern_2026',
        company: 'Zepto',
        companyLogo: 'https://cdn.worldvectorlogo.com/logos/zepto.svg',
        title: 'Software Development Engineer Intern (Summer 2026)',
        department: 'Supply Chain & Consumer Tech',
        location: 'Bengaluru / Kolkata / Remote, India',
        country: 'India',
        isRemote: true,
        remoteType: 'HYBRID',
        employmentType: 'INTERNSHIP',
        salaryMin: 960000,
        salaryMax: 1800000,
        salaryCurrency: 'INR',
        descriptionRaw: `Zepto is India's fastest growing instant grocery delivery platform.
We are hiring passionate SDE Interns for Summer 2026 to work on high-impact consumer apps, order dispatch systems, and warehouse automation.

You Will:
- Build high-performance React Native, Next.js, and Node.js applications.
- Design backend APIs and optimize PostgreSQL/Redis queries.
- Participate in code reviews, design sprints, and real-time delivery routing.`,
        postedAt: new Date(Date.now() - 3600 * 1000 * 6),
        updatedAt: new Date(Date.now() - 3600 * 1000 * 6),
        lastSyncedAt: new Date().toISOString(),
        extractedSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Data Structures & Algorithms'],
        experienceLevel: 'INTERN',
        visaAllowed: true
      },
      {
        id: 'job_wellfound_startup_1',
        tenantId,
        sourcePlatform: 'WELLFOUND',
        sourceJobId: 'wf_vercel_ecosystem_1',
        sourceUrl: 'https://wellfound.com/company/hypergrowth-ai/jobs/full-stack-engineer',
        applicationUrl: 'https://wellfound.com/company/hypergrowth-ai/jobs/full-stack-engineer',
        applicationMethod: 'AUTOMATED_ATS',
        foundOnSources: ['WELLFOUND', 'LINKEDIN', 'CAREER_PAGES'],
        fingerprint: 'fp_wf_hypergrowth_fullstack',
        company: 'HyperGrowth AI',
        companyLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
        title: 'Full Stack Engineer (Founding Engineering Team)',
        department: 'Engineering',
        location: 'Remote (Global / India)',
        country: 'Global / Remote',
        isRemote: true,
        remoteType: 'REMOTE',
        employmentType: 'FULL_TIME',
        salaryMin: 3000000,
        salaryMax: 4500000,
        salaryCurrency: 'INR',
        descriptionRaw: `HyperGrowth AI is building next-generation developer tooling and agent orchestration infrastructure.
We are looking for a high-velocity Full Stack Engineer to lead full-stack feature delivery.
Stack: TypeScript, Next.js 14, Node.js, PostgreSQL, Redis, and LLM APIs.`,
        postedAt: new Date(Date.now() - 3600 * 1000 * 12),
        updatedAt: new Date(Date.now() - 3600 * 1000 * 12),
        lastSyncedAt: new Date().toISOString(),
        extractedSkills: ['TypeScript', 'Next.js', 'React', 'Node.js', 'PostgreSQL', 'Redis'],
        experienceLevel: 'MID',
        visaAllowed: true
      },
      {
        id: 'job_internshala_fullstack_1',
        tenantId,
        sourcePlatform: 'INTERNSHALA',
        sourceJobId: 'int_fullstack_kolkata_2026',
        sourceUrl: 'https://internshala.com/internship/detail/fullstack-engineer-internship',
        applicationUrl: 'https://internshala.com/internship/detail/fullstack-engineer-internship',
        applicationMethod: 'AUTOMATED_ATS',
        foundOnSources: ['INTERNSHALA', 'CAREER_PAGES'],
        fingerprint: 'fp_int_fullstack_internship_kolkata',
        company: 'DevScale India',
        companyLogo: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=100&auto=format&fit=crop&q=80',
        title: 'Full Stack Web Engineering Intern',
        department: 'Product Development',
        location: 'Kolkata, West Bengal, India (Hybrid / Remote Option)',
        country: 'India',
        isRemote: true,
        remoteType: 'HYBRID',
        employmentType: 'INTERNSHIP',
        salaryMin: 480000,
        salaryMax: 720000,
        salaryCurrency: 'INR',
        descriptionRaw: `DevScale is hiring Full Stack Engineering Interns in Kolkata/Remote.
Responsibilities:
- Build React and Next.js interfaces with modern Tailwind CSS.
- Write robust Node.js and PostgreSQL backend microservices.
- Opportunity for full-time PPO conversion based on performance.`,
        postedAt: new Date(Date.now() - 3600 * 1000 * 15),
        updatedAt: new Date(Date.now() - 3600 * 1000 * 15),
        lastSyncedAt: new Date().toISOString(),
        extractedSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Next.js'],
        experienceLevel: 'INTERN',
        visaAllowed: true
      },
      {
        id: 'job_figma_1',
        tenantId,
        sourcePlatform: 'GREENHOUSE',
        sourceJobId: '5489201',
        sourceUrl: 'https://boards.greenhouse.io/figma/jobs/5489201',
        applicationUrl: 'https://boards.greenhouse.io/figma/jobs/5489201',
        applicationMethod: 'AUTOMATED_ATS',
        foundOnSources: ['GREENHOUSE', 'LINKEDIN', 'INDEED', 'CAREER_PAGES'],
        fingerprint: 'fp_figma_swe_fullstack_5489201',
        company: 'Figma',
        companyLogo: 'https://cdn.worldvectorlogo.com/logos/figma-5.svg',
        title: 'Full Stack Software Engineer - Collaboration Tools',
        department: 'Core Product Engineering',
        location: 'San Francisco, CA (Hybrid / Remote Option)',
        country: 'United States',
        isRemote: true,
        remoteType: 'REMOTE',
        employmentType: 'FULL_TIME',
        salaryMin: 3500000,
        salaryMax: 5500000,
        salaryCurrency: 'INR',
        descriptionRaw: `At Figma, we are building browser-first design and collaboration tools used by millions of teams globally.
We are looking for a Full Stack Software Engineer to join our Collaboration Experience team.

What You'll Do:
- Build resilient, performant real-time collaborative interfaces using TypeScript, React, and WebSockets.
- Architect backend distributed services and event streaming systems in Node.js / Go and PostgreSQL.
- Optimize canvas rendering and multi-user synchronization with low latency.`,
        postedAt: new Date(Date.now() - 3600 * 1000 * 4),
        updatedAt: new Date(Date.now() - 3600 * 1000 * 4),
        lastSyncedAt: new Date().toISOString(),
        extractedSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'WebSockets', 'Go'],
        experienceLevel: 'MID',
        visaAllowed: true
      },
      {
        id: 'job_linkedin_msft_1',
        tenantId,
        sourcePlatform: 'LINKEDIN',
        sourceJobId: 'li_msft_swe_kolkata',
        sourceUrl: 'https://www.linkedin.com/jobs/view/microsoft-swe-kolkata',
        applicationUrl: 'https://www.linkedin.com/jobs/view/microsoft-swe-kolkata',
        applicationMethod: 'EXTERNAL_PORTAL_LINK',
        foundOnSources: ['LINKEDIN', 'INDEED', 'CAREER_PAGES'],
        fingerprint: 'fp_msft_swe_cloud_kolkata',
        company: 'Microsoft',
        companyLogo: 'https://cdn.worldvectorlogo.com/logos/microsoft-5.svg',
        title: 'Software Engineer - Azure Cloud Core',
        department: 'Cloud & AI',
        location: 'Bengaluru / Kolkata / Hyderabad, India',
        country: 'India',
        isRemote: true,
        remoteType: 'HYBRID',
        employmentType: 'FULL_TIME',
        salaryMin: 3200000,
        salaryMax: 4800000,
        salaryCurrency: 'INR',
        descriptionRaw: `Microsoft Azure engineering is expanding. We are seeking talented Software Engineers with strong problem solving, distributed backend systems, and modern cloud technologies.`,
        postedAt: new Date(Date.now() - 3600 * 1000 * 10),
        updatedAt: new Date(Date.now() - 3600 * 1000 * 10),
        lastSyncedAt: new Date().toISOString(),
        extractedSkills: ['Go', 'TypeScript', 'Distributed Systems', 'Kubernetes', 'PostgreSQL'],
        experienceLevel: 'MID',
        visaAllowed: true
      },
      {
        id: 'job_direct_tech_1',
        tenantId,
        sourcePlatform: 'CAREER_PAGES',
        sourceJobId: 'dir_swiggy_lead',
        sourceUrl: 'https://careers.swiggy.com/jobs/lead-engineer-dispatch',
        applicationUrl: 'https://careers.swiggy.com/jobs/lead-engineer-dispatch',
        applicationMethod: 'DIRECT_CAREER_PAGE',
        foundOnSources: ['CAREER_PAGES', 'LEVER', 'LINKEDIN', 'INDEED'],
        fingerprint: 'fp_swiggy_lead_dispatch',
        company: 'Swiggy',
        companyLogo: 'https://cdn.worldvectorlogo.com/logos/swiggy-1.svg',
        title: 'Senior / Lead Engineer - Real-time Delivery Logistics',
        department: 'Logistics Intelligence',
        location: 'Bengaluru, India (Remote Option)',
        country: 'India',
        isRemote: true,
        remoteType: 'REMOTE',
        employmentType: 'FULL_TIME',
        salaryMin: 3600000,
        salaryMax: 5200000,
        salaryCurrency: 'INR',
        descriptionRaw: `Swiggy is India's pioneer on-demand convenience platform.
Join our Logistics team to build allocation algorithms and real-time dispatch systems handling millions of orders daily.
Stack: Go, TypeScript, Node.js, Redis, Kafka, PostgreSQL.`,
        postedAt: new Date(Date.now() - 3600 * 1000 * 8),
        updatedAt: new Date(Date.now() - 3600 * 1000 * 8),
        lastSyncedAt: new Date().toISOString(),
        extractedSkills: ['Go', 'Node.js', 'PostgreSQL', 'Redis', 'Kafka', 'Distributed Systems'],
        experienceLevel: 'SENIOR',
        visaAllowed: true
      }
    ];

    // No default matches
    this.matches = [];

    // No default tailored resumes
    this.resumes = [];

    // Seed Applications across state machine
    this.applications = [];
    this.notifications = [];
    this.auditLogs = [];
  }
}

export const db = StoreService.getInstance();


