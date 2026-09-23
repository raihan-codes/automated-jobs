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


    // No dummy jobs - all opportunities are discovered in real-time from Adzuna & Jooble APIs
    this.jobPostings = [];

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


