// Core Domain Types & State Machines for Automated Jobs

/**
 * APPLICATION STATE MACHINE
 * ─────────────────────────────────────────────────────────────────
 * DISCOVERED             → Job found/matched
 * RESUME_READY           → Tailored resume generated & verified
 * AWAITING_USER_APPROVAL → Form prepared; sensitive fields shown to user
 * SUBMITTING             → User clicked "Approve & Submit"; automation running
 * SUBMITTED              → ONLY when submissionVerification.verified === true
 * SUBMISSION_FAILED      → ATS reported error / timeout / blocked
 * EXTERNAL_CONFIRMATION_REQUIRED → Cannot verify result; user must check manually
 *
 * Legacy statuses kept for backward-compat during migration:
 * MATCHED, SELECTED, APPLICATION_READY, WAITING_FOR_APPROVAL, TRACKING
 */
export type ApplicationStatus =
  // ── Canonical states ──────────────────────────────────────
  | 'DISCOVERED'
  | 'RESUME_READY'
  | 'APPLICATION_DETECTED'
  | 'FILLING_FORM'
  | 'USER_INPUT_REQUIRED'
  | 'CAPTCHA_REQUIRED'
  | 'AWAITING_USER_APPROVAL'
  | 'READY_TO_SUBMIT'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'SUBMISSION_FAILED'
  | 'EXTERNAL_CONFIRMATION_REQUIRED'
  // ── Legacy / tracking states (kept for compat) ────────────────
  | 'MATCHED'
  | 'SELECTED'
  | 'APPLICATION_READY'
  | 'WAITING_FOR_APPROVAL'   // alias for AWAITING_USER_APPROVAL
  | 'TRACKING'
  | 'REJECTED'
  | 'INTERVIEWING'
  | 'OFFER';

/**
 * SubmissionVerification — immutable record of external ATS proof.
 * applicationStatus = "SUBMITTED"  ONLY when  verified === true.
 *
 * NEVER set verified = true based on:
 *   - HTTP 200 alone
 *   - Job listing page loading
 *   - Form fields being populated
 *   - Submit button being clicked
 *   - Internal database assumption
 */
export interface SubmissionVerification {
  /** true ONLY when an accepted external confirmation signal was detected */
  verified: boolean;
  /**
   * How verification was achieved, e.g.:
   *   "page_text_match"  – success phrase found in page text
   *   "url_pattern"      – URL contains /confirmation or /success
   *   "confirmation_id"  – unique application reference number extracted
   *   "success_modal"    – modal with success heading detected
   *   "manual"           – user manually confirmed via re-verify flow
   *   null               – not yet verified
   */
  verificationMethod: string | null;
  /** The exact text snippet from the ATS page that proves submission */
  confirmationText: string | null;
  /** Application ID / reference number issued by the external ATS */
  confirmationId: string | null;
  /** URL of the confirmation/thank-you page on the external ATS */
  confirmationUrl: string | null;
  /** ISO timestamp when external confirmation was detected */
  submittedAt: string | null;
  /** Hostname of the final external ATS, e.g. "greenhouse.io", "lever.co" */
  externalDomain: string | null;
  /** Path to Playwright screenshot of the confirmation page */
  screenshotPath: string | null;
  /** Why verification failed or is pending */
  failureReason?: string | null;
  /** CAPTCHA detected on page during workflow */
  captchaDetected?: boolean;
  /** Type of challenge detected (e.g. 'recaptcha_v2', 'hcaptcha', 'cloudflare_turnstile') */
  captchaType?: string | null;
  /** Whether the user manually completed the CAPTCHA */
  captchaResolved?: boolean;
  /** Whether manual login / MFA OTP was encountered */
  mfaDetected?: boolean;
}

export type JobPlatform =
  | 'ADZUNA'
  | 'JOOBLE'
  | 'GREENHOUSE'
  | 'LEVER'
  | 'ASHBY'
  | 'WORKABLE'
  | 'ARBEITNOW'
  | 'WELLFOUND'
  | 'LINKEDIN'
  | 'INDEED'
  | 'CAREER_PAGES'
  | 'DIRECT';

export type ApplicationMethod =
  | 'AUTOMATED_ATS'
  | 'DIRECT_CAREER_PAGE'
  | 'EXTERNAL_PORTAL_LINK';

export type RemotePreference = 'REMOTE' | 'HYBRID' | 'ONSITE' | 'REMOTE_OR_HYBRID' | 'ANY';

export interface CandidateProfileData {
  id?: string;
  userId?: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  address?: string;
  headline?: string;
  summary?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  
  // Job Search Constraints & Compensation
  desiredTitles: string[];
  preferredLocations: string[];
  remotePreference?: RemotePreference;
  minSalary?: number;
  currentSalaryLPA?: number; // In Lakhs Per Annum (e.g. 18 LPA)
  currentCTC?: string;        // Explicit string representation (e.g. "₹18,00,000")
  expectedSalaryLPA?: number; // In Lakhs Per Annum (e.g. 25 LPA)
  expectedCTC?: string;       // Explicit string representation (e.g. "₹25,00,000")
  noticePeriod?: 'IMMEDIATE' | '15_DAYS' | '30_DAYS' | '60_DAYS' | '90_DAYS' | string;
  requiresVisa?: boolean;
  workAuthorization?: string; // e.g. "Indian Citizen", "No Sponsorship Needed"
  yearsOfExperience?: number;
  relocationPreference?: 'WILLING_TO_RELOCATE' | 'NOT_WILLING' | 'NEGOTIABLE' | boolean;
  emailAlertPreferences?: boolean;
  
  // Structured Sections
  skills: CandidateSkillData[];
  experiences: ExperienceData[];
  educations: EducationData[];
  projects: ProjectData[];
  achievements?: AchievementData[];
  certifications?: CertificationData[];
}

export interface CandidateSkillData {
  id?: string;
  name: string;
  category: 'TECHNICAL' | 'FRAMEWORK' | 'TOOL' | 'SOFT';
  years?: number;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | 'NOT_SPECIFIED';
}

export interface ExperienceData {
  id?: string;
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string;
  bullets: string[];
  technologies?: string[];
}

export interface EducationData {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  gradeGpa?: string;
  highlights?: string[];
}

export interface ProjectData {
  id?: string;
  title: string;
  description: string;
  role?: string;
  link?: string;
  technologies: string[];
  bullets: string[];
}

export interface AchievementData {
  id?: string;
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}

export interface CertificationData {
  id?: string;
  name: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  credentialUrl?: string;
}

export interface NormalizedJobPosting {
  sourcePlatform: JobPlatform;
  sourceJobId: string;
  sourceUrl: string;
  canonicalUrl?: string;
  applicationUrl?: string;
  applicationMethod?: ApplicationMethod;
  foundOnSources?: JobPlatform[];
  company: string;
  companyLogo?: string;
  title: string;
  department?: string;
  location: string;
  country?: string;
  isRemote: boolean;
  remoteType?: 'REMOTE' | 'HYBRID' | 'ONSITE';
  employmentType: 'FULL_TIME' | 'INTERNSHIP' | 'CONTRACT' | 'PART_TIME';
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  descriptionRaw: string;
  descriptionHtml?: string;
  postedAt: Date;
  updatedAt: Date;
  extractedSkills?: string[];
  experienceLevel?: 'INTERN' | 'ENTRY' | 'MID' | 'SENIOR' | 'LEAD';
  visaAllowed?: boolean;
}

export interface MatchAnalysisResult {
  overallScore: number; // 0-100
  matchTier?: 'EXCELLENT' | 'STRONG' | 'GOOD' | 'MODERATE' | 'PARTIAL' | 'LOW';
  matchTierLabel?: string; // e.g. 'Excellent Match (92%)'
  hardFilterPassed: boolean;
  hardFilterReason?: string;
  skillsScore: number;
  experienceScore: number;
  domainScore: number;
  educationScore?: number;
  semanticScore?: number;
  matchedSkills: string[];
  missingSkills: string[];
  whyMatchReason: string;
  potentialConcerns?: string;
  suggestedAngle?: string;
}

export interface TailoredResumeContent {
  title: string;
  targetRole: string;
  targetCompany: string;
  summary: string;
  skillsSection: {
    category: string;
    skills: string[];
  }[];
  experienceSection: {
    company: string;
    role: string;
    location?: string;
    period: string;
    bullets: string[];
  }[];
  projectsSection: {
    title: string;
    role?: string;
    technologies: string[];
    bullets: string[];
    link?: string;
  }[];
  educationSection: {
    institution: string;
    degree: string;
    period?: string;
    highlights?: string[];
  }[];
  isVerifiedTruthful: boolean;
  verificationReport?: {
    verifiedSkillsCount: number;
    flaggedClaimsCount: number;
    auditItems: { claim: string; sourceNode: string; verified: boolean }[];
  };
}

export type FormFieldStatus =
  | 'AUTO_FILLED'
  | 'USER_INPUT_REQUIRED'
  | 'SENSITIVE_REVIEW_REQUIRED'
  | 'MANUALLY_EDITED'
  | 'UNSUPPORTED';

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'number'
  | 'date'
  | 'tel'
  | 'email';

export interface ApplicationFormField {
  fieldKey: string;
  fieldLabel: string;
  fieldType: FormFieldType;
  fieldValue?: string;
  isSensitive: boolean;
  isFilledByAI: boolean;
  requiresUserReview: boolean;
  confidenceScore: number;
  options?: string[];
  validationError?: string;
  isRequired?: boolean;
  status?: FormFieldStatus;
  category?: 'PERSONAL' | 'CONTACT' | 'COMPENSATION' | 'AUTHORIZATION' | 'EXPERIENCE' | 'PREFERENCE' | 'CUSTOM' | 'CONSENT' | 'FILE';
  helperText?: string;
  detectedSelector?: string;
}

export type OAuthProvider = 'google' | 'github' | 'demo';

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  provider?: OAuthProvider;
  providerId?: string;
  createdAt?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

