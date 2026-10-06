// Pluggable Job Source Adapter Interface
import { NormalizedJobPosting, JobPlatform } from '@/types';

export interface IngestionFilterOptions {
  query?: string;
  department?: string;
  location?: string;
  remoteOnly?: boolean;
  minSalary?: number;
}

export interface IngestionResult {
  platform?: JobPlatform;
  sourcePlatform?: JobPlatform;
  company?: string;
  success?: boolean;
  jobsFetched?: number;
  jobsUpserted?: number;
  totalFetched?: number;
  newJobsCount?: number;
  updatedJobsCount?: number;
  skippedDuplicatesCount?: number;
  jobs?: NormalizedJobPosting[];
  errors?: string[];
  syncedAt?: Date;
}

export interface ConnectorMetadata {
  platform: JobPlatform;
  name: string;
  category: 'ATS' | 'STARTUP_FEED' | 'INTERNSHIP_PORTAL' | 'PUBLIC_JOB_BOARD' | 'CAREER_PAGE' | 'COMPANY_CAREER_SITE';
  supportsAutomatedPrefill: boolean;
  supportsInternships: boolean;
  isLegalAndPermitted: boolean;
}

export interface JobSourceAdapter {
  platform: JobPlatform;
  name: string;
  metadata?: ConnectorMetadata;
  
  /**
   * Fetches postings from target company board/endpoint
   */
  fetchJobs(companySlugOrBoard: string, options?: IngestionFilterOptions): Promise<NormalizedJobPosting[]>;

  /**
   * Normalizes raw ATS/feed payload into standard schema
   */
  normalizeJob(rawPayload: any, company: string): NormalizedJobPosting | null;

  /**
   * Health check on source endpoint
   */
  healthCheck(companySlugOrBoard: string): Promise<boolean>;
}
