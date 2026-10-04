// Global Multi-Platform Ingestion Registry & Real Job Search Engine
import { JobSourceAdapter, IngestionResult, IngestionFilterOptions, ConnectorMetadata } from './types';
import { AdzunaAdapter } from './adzuna';
import { JoobleAdapter } from './jooble';
import { GreenhouseAdapter } from './greenhouse';
import { AshbyAdapter } from './ashby';
import { LeverAdapter } from './lever';
import { ArbeitnowAdapter } from './arbeitnow';
import { JobDeduplicator } from './deduplicator';
import { db, StoredJobPosting } from '../../lib/db';
import { JobPlatform, NormalizedJobPosting, CandidateProfileData } from '../../types';
import { UrlValidator } from '../validation/url-validator';

export class IngestionService {
  private adapters: Map<JobPlatform, JobSourceAdapter> = new Map();

  constructor() {
    this.registerAdapter(new GreenhouseAdapter());
    this.registerAdapter(new AshbyAdapter());
    this.registerAdapter(new LeverAdapter());
    this.registerAdapter(new ArbeitnowAdapter());
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
   * Searches REAL jobs across legitimate platforms concurrently based on query or Candidate Profile.
   * Cross-source deduplication, real-time URL validation, and zero mock data generation.
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

    const uniqueQueries = Array.from(new Set(searchQueries)).slice(0, 2);
    // Resume recommendations are sourced only from the configured public job APIs.
    // Company-board adapters have their own board catalogs and must not leak unrelated
    // hardcoded companies into this profile-specific feed.
    const platforms: JobPlatform[] = ['ADZUNA', 'JOOBLE'];

    const searchPromises: Promise<NormalizedJobPosting[]>[] = [];

    for (const platform of platforms) {
      const adapter = this.getAdapter(platform);
      if (!adapter) continue;

      for (const query of uniqueQueries) {
        searchPromises.push(
          adapter.fetchJobs(query, {
            ...options,
            location: locationFilter || options?.location
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

    const deduplicatedList: NormalizedJobPosting[] = [];

    // Filter real jobs and perform URL validation
    const candidateList = allFetchedJobs;
    const validatedJobs = await UrlValidator.filterActiveJobs(candidateList, 6);
    const jobsToProcess = validatedJobs;

    for (const job of jobsToProcess) {
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
   * Syncs jobs across ALL registered platforms
   */
  public async syncAllSources(
    searchTarget: string = 'software engineer',
    tenantId: string = 'tenant_prod_enterprise_1',
    options?: IngestionFilterOptions
  ): Promise<{ totalSynced: number; platformResults: IngestionResult[] }> {
    const promises = Array.from(this.adapters.keys()).map(platform =>
      this.syncCompanyJobs(platform, searchTarget, tenantId, options).catch(err => ({
        platform,
        success: false,
        jobsFetched: 0,
        jobsUpserted: 0,
        errors: [err.message]
      }))
    );

    const platformResults = await Promise.all(promises);
    const totalSynced = platformResults.reduce((acc, r) => acc + (r.jobsUpserted || 0), 0);

    return { totalSynced, platformResults };
  }

  /**
   * Syncs a single platform
   */
  public async syncCompanyJobs(
    platform: JobPlatform,
    searchTarget: string,
    tenantId: string = 'tenant_prod_enterprise_1',
    options?: IngestionFilterOptions
  ): Promise<IngestionResult> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      return {
        platform,
        success: false,
        jobsFetched: 0,
        jobsUpserted: 0,
        errors: [`Adapter for platform "${platform}" not registered.`]
      };
    }

    try {
      const rawJobs = await adapter.fetchJobs(searchTarget, options);
      const validatedJobs = await UrlValidator.filterActiveJobs(rawJobs, 6);
      let upsertCount = 0;

      for (const job of validatedJobs) {
        const fingerprint = JobDeduplicator.generateFingerprint(job);
        const crossKey = JobDeduplicator.generateCrossSourceKey(job);

        const existingIdx = db.jobPostings.findIndex(
          p => p.fingerprint === fingerprint || (JobDeduplicator.generateCrossSourceKey(p) === crossKey && p.company.toLowerCase() === job.company.toLowerCase())
        );

        if (existingIdx >= 0) {
          const existing = db.jobPostings[existingIdx];
          db.jobPostings[existingIdx] = {
            ...JobDeduplicator.mergePostings(existing, job),
            id: existing.id,
            tenantId,
            fingerprint,
            lastSyncedAt: new Date().toISOString()
          };
          upsertCount++;
        } else {
          db.jobPostings.unshift({
            ...job,
            id: `job_${platform.toLowerCase()}_${job.sourceJobId.replace(/[^a-z0-9_-]/gi, '')}`,
            tenantId,
            fingerprint,
            lastSyncedAt: new Date().toISOString()
          });
          upsertCount++;
        }
      }

      return {
        platform,
        success: true,
        jobsFetched: rawJobs.length,
        jobsUpserted: upsertCount,
        errors: []
      };
    } catch (err: any) {
      return {
        platform,
        success: false,
        jobsFetched: 0,
        jobsUpserted: 0,
        errors: [err.message]
      };
    }
  }
}

export const ingestionService = new IngestionService();
