// Core Domain Types & State Machines for Automated Jobs

export type ApplicationStatus =
  | 'DISCOVERED'
  | 'MATCHED'
  | 'SELECTED'
  | 'RESUME_READY'
  | 'APPLICATION_READY'
  | 'WAITING_FOR_APPROVAL'
  | 'SUBMITTED'
  | 'TRACKING'
  | 'REJECTED'
  | 'INTERVIEWING'
  | 'OFFER';

export type JobPlatform =
  | 'ADZUNA'
  | 'JOOBLE'
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
  headline?: string;
  summary?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  
  // Job Search Constraints
  desiredTitles: string[];
  preferredLocations: string[];
  remotePreference: RemotePreference;
  minSalary?: number;
  expectedSalaryLPA?: number; // In Lakhs Per Annum (e.g. 18, 25, 45 LPA)
  noticePeriod?: 'IMMEDIATE' | '15_DAYS' | '30_DAYS' | '60_DAYS' | '90_DAYS';
  requiresVisa: boolean;
  workAuthorization?: string; // e.g. "Indian Citizen", "No Sponsorship Needed"
  yearsOfExperience: number;
  
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
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
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

export interface ApplicationFormField {
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file';
  fieldValue?: string;
  isSensitive: boolean;
  isFilledByAI: boolean;
  requiresUserReview: boolean;
  confidenceScore: number;
  options?: string[];
  validationError?: string;
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

