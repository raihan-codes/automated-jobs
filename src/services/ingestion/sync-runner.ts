// Global Ingestion Registry & Real Job Search Engine (Adzuna + Jooble ONLY)
import { JobSourceAdapter, IngestionResult, IngestionFilterOptions, ConnectorMetadata } from './types';
import { AdzunaAdapter } from './adzuna';
import { JoobleAdapter } from './jooble';
import { JobDeduplicator } from './deduplicator';
import { db, StoredJobPosting } from '../../lib/db';
import { JobPlatform, NormalizedJobPosting, CandidateProfileData } from '../../types';

export class IngestionService {
  private adapters: Map<JobPlatform, JobSourceAdapter> = new Map();

  constructor() {
    this.registerAdapter(new AdzunaAdapter());
    this.registerAdapter(new JoobleAdapter());
  }

  public registerAdapter(adapter: JobSourceAdapter) {
    this.adapters.set(adapter.platform, adapter);
  }

  public getAdapter(platform: JobPlatform): JobSourceAdapter | undefined {
    return this.adapters.get(platform);
  }

  public getSupportedPlatforms(): { platform: JobPlatform; name: string; metadata?: ConnectorMetadata }[] {
    return Array.from(this.adapters.values()).map(a => ({
      platform: a.platform,
      name: a.name,
      metadata: (a as any).metadata
    }));
  }

  /**
   * Searches REAL jobs across Adzuna + Jooble concurrently based on query or Candidate Profile.
   * Cross-source deduplication, error isolation, and zero mock data generation.
   */
  public async searchRealJobs(
    queryOrProfile: string | CandidateProfileData,
    tenantId: string = 'tenant_prod_enterprise_1',
    options?: IngestionFilterOptions
  ): Promise<NormalizedJobPosting[]> {
    let searchQueries: string[] = [];
    let locationFilter: string | undefined = undefined;

    if (typeof queryOrProfile === 'string') {
      const q = queryOrProfile.trim();
      if (q) searchQueries.push(q);
    } else if (queryOrProfile && typeof queryOrProfile === 'object') {
      const profile = queryOrProfile;
      // Extract target titles
      if (profile.desiredTitles && profile.desiredTitles.length > 0) {
        searchQueries.push(...profile.desiredTitles.slice(0, 2));
      }
      // Extract top technical skills
      const topSkills = (profile.skills || [])
        .slice(0, 3)
        .map(s => typeof s === 'string' ? s : s.name);
      if (topSkills.length > 0) {
        searchQueries.push(topSkills.join(' '));
      }
      if (profile.location) {
        locationFilter = profile.location;
      }
    }

    if (searchQueries.length === 0) {
      searchQueries = ['Software Engineer', 'Developer'];
    }

    // Combine distinct search keywords
    const uniqueQueries = Array.from(new Set(searchQueries)).slice(0, 3);
    const platforms: JobPlatform[] = ['ADZUNA', 'JOOBLE'];

    const searchPromises: Promise<NormalizedJobPosting[]>[] = [];

    for (const platform of platforms) {
      const adapter = this.getAdapter(platform);
      if (!adapter) continue;

      for (const query of uniqueQueries) {
        searchPromises.push(
          adapter.fetchJobs(query, {
            ...options,
            query: locationFilter || options?.query
          }).catch(err => {
            console.warn(`[IngestionService] Error fetching from ${platform} for "${query}":`, err.message);
            return [];
          })
        );
      }
    }

    const settledResults = await Promise.allSettled(searchPromises);
    const allFetchedJobs: NormalizedJobPosting[] = [];

    for (const res of settledResults) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        allFetchedJobs.push(...res.value);
      }
    }

    // Deduplicate and insert into runtime memory store
    const deduplicatedList: NormalizedJobPosting[] = [];

    for (const job of allFetchedJobs) {
      const fingerprint = JobDeduplicator.generateFingerprint(job);
      const crossSourceKey = JobDeduplicator.generateCrossSourceKey(job);

      // Check if already in current search batch
      const existingInBatchIdx = deduplicatedList.findIndex(
        j => JobDeduplicator.generateFingerprint(j) === fingerprint ||
             (JobDeduplicator.generateCrossSourceKey(j) === crossSourceKey && j.company.toLowerCase() === job.company.toLowerCase())
      );

      if (existingInBatchIdx >= 0) {
        const existing = deduplicatedList[existingInBatchIdx];
        deduplicatedList[existingInBatchIdx] = JobDeduplicator.mergePostings(existing, job);
      } else {
        deduplicatedList.push(job);
      }

      // Sync with global runtime store
      const exactDbIdx = db.jobPostings.findIndex(
        p => p.fingerprint === fingerprint || (p.sourcePlatform === job.sourcePlatform && p.sourceJobId === job.sourceJobId)
      );
      const crossDbIdx = db.jobPostings.findIndex(
        p => JobDeduplicator.generateCrossSourceKey(p) === crossSourceKey && p.company.toLowerCase() === job.company.toLowerCase()
      );

      if (exactDbIdx >= 0) {
        const existing = db.jobPostings[exactDbIdx];
        db.jobPostings[exactDbIdx] = {
          ...JobDeduplicator.mergePostings(existing, job),
          id: existing.id,
          tenantId,
          fingerprint,
          lastSyncedAt: new Date().toISOString()
        };
      } else if (crossDbIdx >= 0) {
        const existing = db.jobPostings[crossDbIdx];
        db.jobPostings[crossDbIdx] = {
          ...JobDeduplicator.mergePostings(existing, job),
          id: existing.id,
          tenantId,
          fingerprint: existing.fingerprint,
          lastSyncedAt: new Date().toISOString()
        };
      } else {
        const newPosting: StoredJobPosting = {
          ...job,
          id: `job_${job.sourcePlatform.toLowerCase()}_${job.sourceJobId.replace(/[^a-z0-9_-]/gi, '')}`,
          tenantId,
          fingerprint,
          foundOnSources: job.foundOnSources || [job.sourcePlatform],
          lastSyncedAt: new Date().toISOString()
        };
        db.jobPostings.unshift(newPosting);
      }
    }

    return deduplicatedList;
  }

  /**
   * Syncs jobs across ALL registered platforms (Adzuna + Jooble)
   */
  public async syncAllSources(
    searchTarget: string = 'software engineer',
    tenantId: string = 'tenant_prod_enterprise_1',
    options?: IngestionFilterOptions
  ): Promise<{ totalSynced: number; platformResults: IngestionResult[] }> {
    const promises = Array.from(this.adapters.keys()).map(platform =>
      this.syncCompanyJobs(platform, searchTarget, tenantId, options).catch(err => ({
        sourcePlatform: platform,
        company: searchTarget,
        totalFetched: 0,
        newJobsCount: 0,
        updatedJobsCount: 0,
        skippedDuplicatesCount: 0,
        jobs: [],
        errors: [err.message],
        syncedAt: new Date()
      }))
    );

    const results = await Promise.all(promises);
    const totalSynced = results.reduce((sum, r) => sum + r.newJobsCount + r.updatedJobsCount, 0);

    return {
      totalSynced,
      platformResults: results
    };
  }

  /**
   * Runs sync for a specific platform (ADZUNA or JOOBLE)
   */
  public async syncCompanyJobs(
    platform: JobPlatform,
    companyOrKeyword: string,
    tenantId: string = 'tenant_prod_enterprise_1',
    options?: IngestionFilterOptions
  ): Promise<IngestionResult> {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      throw new Error(`Unsupported platform adapter: ${platform}. Only ADZUNA and JOOBLE are supported.`);
    }

    const startTime = new Date();
    let normalizedList: NormalizedJobPosting[] = [];

    try {
      normalizedList = await adapter.fetchJobs(companyOrKeyword, options);
    } catch (err: any) {
      console.warn(`[IngestionService] Connector error for ${platform}:`, err.message);
      return {
        sourcePlatform: platform,
        company: companyOrKeyword,
        totalFetched: 0,
        newJobsCount: 0,
        updatedJobsCount: 0,
        skippedDuplicatesCount: 0,
        jobs: [],
        errors: [err.message],
        syncedAt: startTime
      };
    }

    let newJobsCount = 0;
    let updatedJobsCount = 0;
    let skippedDuplicatesCount = 0;

    for (const job of normalizedList) {
      const fingerprint = JobDeduplicator.generateFingerprint(job);
      const crossSourceKey = JobDeduplicator.generateCrossSourceKey(job);

      const exactIdx = db.jobPostings.findIndex(
        p => p.fingerprint === fingerprint || (p.sourcePlatform === job.sourcePlatform && p.sourceJobId === job.sourceJobId)
      );

      const crossIdx = db.jobPostings.findIndex(
        p => JobDeduplicator.generateCrossSourceKey(p) === crossSourceKey && p.company.toLowerCase() === job.company.toLowerCase()
      );

      if (exactIdx >= 0) {
        const existing = db.jobPostings[exactIdx];
        if (new Date(job.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
          const merged = JobDeduplicator.mergePostings(existing, job);
          db.jobPostings[exactIdx] = {
            ...merged,
            id: existing.id,
            tenantId,
            fingerprint,
            lastSyncedAt: new Date().toISOString()
          };
          updatedJobsCount++;
        } else {
          skippedDuplicatesCount++;
        }
      } else if (crossIdx >= 0) {
        const existing = db.jobPostings[crossIdx];
        const merged = JobDeduplicator.mergePostings(existing, job);
        db.jobPostings[crossIdx] = {
          ...merged,
          id: existing.id,
          tenantId,
          fingerprint: existing.fingerprint,
          lastSyncedAt: new Date().toISOString()
        };
        updatedJobsCount++;
      } else {
        const newPosting: StoredJobPosting = {
          ...job,
          id: `job_${platform.toLowerCase()}_${job.sourceJobId.replace(/[^a-z0-9_-]/gi, '')}`,
          tenantId,
          fingerprint,
          foundOnSources: job.foundOnSources || [job.sourcePlatform],
          lastSyncedAt: new Date().toISOString()
        };
        db.jobPostings.unshift(newPosting);
        newJobsCount++;
      }
    }

    // Record audit log
    db.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      tenantId,
      action: 'JOB_INGESTION_SYNC',
      resourceType: 'JobSource',
      details: {
        platform,
        companyOrKeyword,
        totalFetched: normalizedList.length,
        newJobsCount,
        updatedJobsCount,
        skippedDuplicatesCount
      },
      createdAt: new Date().toISOString()
    });

    return {
      sourcePlatform: platform,
      company: companyOrKeyword,
      totalFetched: normalizedList.length,
      newJobsCount,
      updatedJobsCount,
      skippedDuplicatesCount,
      jobs: normalizedList,
      syncedAt: startTime
    };
  }
}

export const ingestionService = new IngestionService();
