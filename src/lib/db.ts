// Multi-tenant Store & Database Access Layer with Auto-seeding
import {
  CandidateProfileData,
  NormalizedJobPosting,
  MatchAnalysisResult,
  TailoredResumeContent,
  ApplicationFormField,
  ApplicationStatus,
  SubmissionVerification
} from '@/types';

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

  /**
   * THE canonical application state.
   *
   * INVARIANT: status === 'SUBMITTED'  iff  submissionVerification.verified === true.
   *
   * No code path may set status = 'SUBMITTED' without first obtaining a
   * SubmissionVerification with verified = true from the external ATS.
   */
  status: ApplicationStatus;

  automationEngine: 'PLAYWRIGHT' | 'API' | 'MANUAL';
  formUrl?: string;
  fields: ApplicationFormField[];
  hasSensitiveQuestions: boolean;
  requiresHumanInput: boolean;
  humanReviewNotes?: string;

  /** Timestamp when the user explicitly clicked "Approve & Submit" */
  approvedAt?: string;

  /**
   * Timestamp when submission was EXTERNALLY confirmed.
   * Must always equal submissionVerification.submittedAt.
   * DO NOT set from internal logic.
   */
  submittedAt?: string;

  screenshotSnapshot?: string;

  /**
   * External ATS confirmation record.
   * This is the SOLE authority for whether a submission is real.
   * status = 'SUBMITTED'  ←→  submissionVerification.verified === true
   */
  submissionVerification: SubmissionVerification;

  /** Post-submission tracking stage; only meaningful once SUBMITTED */
  stage: 'PENDING' | 'SUBMITTED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredNotification {
  id: string;
  userId: string;
  type:
    | 'JOB_DISCOVERED'
    | 'RESUME_READY'
    | 'APPROVAL_REQUIRED'
    | 'SUBMISSION_STARTED'
    | 'APPLICATION_SUBMITTED'
    | 'SUBMISSION_FAILED'
    | 'EXTERNAL_CONFIRMATION_REQUIRED'
    | 'SYSTEM';
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

/**
 * Ordered audit trail steps for the full application lifecycle.
 *
 * Step 9  (EXTERNAL_CONFIRMATION_DETECTED) MUST occur before step 10.
 * If step 9 never happens, step 10 must NEVER be written.
 */
export type AuditStep =
  // ── Pipeline steps ─────────────────────────────────────────────
  | 'JOB_DISCOVERED'                   // 1
  | 'RESUME_GENERATED'                 // 2
  | 'APPLICATION_FORM_PREPARED'        // 3
  | 'SENSITIVE_FIELDS_DETECTED'        // 4
  | 'USER_APPROVED'                    // 5
  | 'SUBMISSION_STARTED'               // 6
  | 'EXTERNAL_ATS_REACHED'            // 7
  | 'FINAL_SUBMIT_ACTION_PERFORMED'    // 8
  | 'EXTERNAL_CONFIRMATION_DETECTED'   // 9 — gates step 10
  | 'APPLICATION_MARKED_SUBMITTED'     // 10 — only after step 9
  // ── Failure / pending steps ────────────────────────────────────
  | 'SUBMISSION_FAILED'
  | 'EXTERNAL_CONFIRMATION_REQUIRED'
  // ── Legacy compat ──────────────────────────────────────────────
  | 'APPLICATION_PREPARED_FOR_APPROVAL'
  | 'APPLICATION_APPROVED_AND_SUBMITTED';

// ── Default empty SubmissionVerification ────────────────────────────────────
export function unverifiedSubmission(): SubmissionVerification {
  return {
    verified: false,
    verificationMethod: null,
    confirmationText: null,
    confirmationId: null,
    confirmationUrl: null,
    submittedAt: null,
    externalDomain: null,
    screenshotPath: null,
    failureReason: null
  };
}

import { getDefaultJobPostings } from '@/data/default-jobs';

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

  public ensureJobsLoaded(): StoredJobPosting[] {
    if (!this.jobPostings || this.jobPostings.length === 0) {
      this.seedDefaultData();
    }
    return this.jobPostings;
  }

  public seedDefaultData() {
    const tenantId = 'tenant_prod_enterprise_1';

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

    // Never seed fake or invented job listings as a fallback. Real jobs are discovered only from
    // authorized sources or the live API ingestion pipeline.
    this.jobPostings = [];

    // No default matches
    this.matches = [];

    // No default tailored resumes
    this.resumes = [];

    // No pre-seeded applications — avoids phantom SUBMITTED states
    this.applications = [];
    this.notifications = [];
    this.auditLogs = [];
  }
}

export const db = StoreService.getInstance();
