// Base Job Connector Class with Rate Limiting, Caching, Resilience & Normalization Helpers
import { NormalizedJobPosting, JobPlatform, ApplicationMethod } from '@/types';
import { JobSourceAdapter, IngestionFilterOptions, ConnectorMetadata } from './types';
import { JobDeduplicator } from './deduplicator';

export abstract class BaseConnector implements JobSourceAdapter {
  abstract platform: JobPlatform;
  abstract name: string;
  abstract metadata: ConnectorMetadata;

  private cache: Map<string, { data: NormalizedJobPosting[]; timestamp: number }> = new Map();
  private cacheTtlMs: number = 5 * 60 * 1000; // 5 minutes cache

  abstract fetchRawJobs(companySlugOrBoard: string, options?: IngestionFilterOptions): Promise<any[]>;
  abstract normalizeJob(rawPayload: any, company: string): NormalizedJobPosting | null;

  public async fetchJobs(companySlugOrBoard: string, options?: IngestionFilterOptions): Promise<NormalizedJobPosting[]> {
    const cacheKey = `${this.platform}:${companySlugOrBoard.toLowerCase()}:${JSON.stringify(options || {})}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    try {
      const rawList = await this.withTimeout(this.fetchRawJobs(companySlugOrBoard, options), 6000);
      const normalized: NormalizedJobPosting[] = [];

      for (const item of rawList) {
        try {
          const job = this.normalizeJob(item, companySlugOrBoard);
          if (job) {
            // Apply filter options if provided
            if (options?.remoteOnly && !job.isRemote) continue;
            if (options?.query) {
              const q = options.query.toLowerCase();
              const matchText = `${job.title} ${job.company} ${job.location} ${(job.extractedSkills || []).join(' ')}`.toLowerCase();
              if (!matchText.includes(q)) continue;
            }
            normalized.push(job);
          }
        } catch (normError) {
          console.warn(`[${this.name}] Failed to normalize item:`, normError);
        }
      }

      this.cache.set(cacheKey, { data: normalized, timestamp: Date.now() });
      return normalized;
    } catch (err: any) {
      console.error(`[${this.name}] Connector error for "${companySlugOrBoard}":`, err.message);
      // Return empty array gracefully without breaking the entire sync runner
      return [];
    }
  }

  public async healthCheck(companySlugOrBoard: string): Promise<boolean> {
    try {
      const jobs = await this.fetchJobs(companySlugOrBoard);
      return jobs.length >= 0;
    } catch {
      return false;
    }
  }

  protected async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(`Connector timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
  }

  /**
   * Helper: Detect employment type (Internship vs Full-Time)
   */
  protected detectEmploymentType(title: string, rawText: string = ''): 'FULL_TIME' | 'INTERNSHIP' | 'CONTRACT' | 'PART_TIME' {
    const combined = `${title} ${rawText}`.toLowerCase();
    if (/\bintern\b|\binternship\b|\btrainee\b|\bco-?op\b|\bapprentice\b|\bgraduate program\b/i.test(combined)) {
      return 'INTERNSHIP';
    }
    if (/\bcontract\b|\bcontractor\b|\bfreelance\b|\btemp\b/i.test(combined)) {
      return 'CONTRACT';
    }
    if (/\bpart[\s-]?time\b/i.test(combined)) {
      return 'PART_TIME';
    }
    return 'FULL_TIME';
  }

  /**
   * Helper: Resolve country and remote type globally
   */
  protected resolveLocationAndCountry(locationStr?: string): { location: string; country: string; isRemote: boolean; remoteType: 'REMOTE' | 'HYBRID' | 'ONSITE' } {
    const loc = (locationStr && locationStr.trim()) ? locationStr.trim() : 'Not specified';
    const locLower = loc.toLowerCase();

    const hasHybrid = /\bhybrid\b/i.test(locLower);
    const hasOnsite = /\b(?:on-?site|in-?office|at\s+office|\bhq\b)\b/i.test(locLower);
    const hasRemoteKeyword = /\b(?:remote|anywhere|work\s+from\s+home|wfh|distributed|virtual)\b/i.test(locLower);

    let isRemote = false;
    let remoteType: 'REMOTE' | 'HYBRID' | 'ONSITE' = 'ONSITE';

    if (hasHybrid) {
      remoteType = 'HYBRID';
      isRemote = false;
    } else if (hasRemoteKeyword && !hasOnsite) {
      remoteType = 'REMOTE';
      isRemote = true;
    } else {
      remoteType = 'ONSITE';
      isRemote = false;
    }

    let country = 'Not specified';

    if (/india|bengaluru|bangalore|hyderabad|pune|delhi|mumbai|kolkata|chennai|noida|gurgaon|gurugram|ahmedabad|kochi/i.test(locLower)) {
      country = 'India';
    } else if (/united states|\busa\b|\bus\b|san francisco|new york|seattle|austin|chicago|boston|california|texas|washington/i.test(locLower)) {
      country = 'United States';
    } else if (/united kingdom|\buk\b|london|manchester|birmingham|edinburgh|cambridge|oxford/i.test(locLower)) {
      country = 'United Kingdom';
    } else if (/canada|toronto|vancouver|montreal|ottawa|waterloo/i.test(locLower)) {
      country = 'Canada';
    } else if (/germany|berlin|munich|frankfurt|hamburg/i.test(locLower)) {
      country = 'Germany';
    } else if (/singapore/i.test(locLower)) {
      country = 'Singapore';
    } else if (/australia|sydney|melbourne|brisbane/i.test(locLower)) {
      country = 'Australia';
    } else if (/netherlands|amsterdam|rotterdam/i.test(locLower)) {
      country = 'Netherlands';
    } else if (/ireland|dublin/i.test(locLower)) {
      country = 'Ireland';
    } else if (/uae|dubai|abu dhabi/i.test(locLower)) {
      country = 'United Arab Emirates';
    } else if (/france|paris/i.test(locLower)) {
      country = 'France';
    } else if (/japan|tokyo/i.test(locLower)) {
      country = 'Japan';
    }

    return {
      location: loc,
      country,
      isRemote,
      remoteType
    };
  }

  /**
   * Helper: Extract standard skills from title and JD
   */
  protected extractCommonSkills(title: string, jdText: string = ''): string[] {
    const text = `${title} ${jdText}`.toLowerCase();
    const commonTaxonomy = [
      'TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js', 'Go', 'Golang',
      'Python', 'Java', 'Spring Boot', 'C++', 'Rust', 'SQL', 'PostgreSQL', 'MySQL',
      'MongoDB', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
      'GraphQL', 'REST APIs', 'Tailwind CSS', 'HTML5', 'CSS3', 'Git', 'Linux',
      'Microservices', 'Distributed Systems', 'System Design'
    ];
    return commonTaxonomy.filter(skill => {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(text);
    });
  }
}
