// Arbeitnow Public Job Board Official Connector
// Connects to publicly accessible Arbeitnow API with genuine tech job listings & valid URLs.
import { NormalizedJobPosting, JobPlatform } from '@/types';
import { BaseConnector } from './base-connector';
import { ConnectorMetadata, IngestionFilterOptions } from './types';
import { JobDeduplicator } from './deduplicator';

export class ArbeitnowAdapter extends BaseConnector {
  public platform: JobPlatform = 'ARBEITNOW' as any;
  public name = 'Arbeitnow';
  public metadata: ConnectorMetadata = {
    platform: 'ARBEITNOW' as any,
    name: 'Arbeitnow Public Jobs API',
    category: 'PUBLIC_JOB_BOARD',
    supportsAutomatedPrefill: true,
    supportsInternships: true,
    isLegalAndPermitted: true
  };

  private apiUrl = 'https://www.arbeitnow.com/api/job-board-api';

  public async fetchRawJobs(queryOrCompany: string, options?: IngestionFilterOptions): Promise<any[]> {
    try {
      const res = await fetch(this.apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AutomatedJobs-ArbeitnowClient/1.0'
        },
        signal: AbortSignal.timeout(6000)
      });

      if (!res.ok) return [];

      const data = await res.json();
      return Array.isArray(data.data) ? data.data : [];
    } catch (err: any) {
      console.warn('[ArbeitnowAdapter] Error fetching jobs:', err.message);
      return [];
    }
  }

  public normalizeJob(raw: any, searchContext: string): NormalizedJobPosting | null {
    if (!raw || !raw.slug || !raw.title || !raw.url) return null;

    const sourceJobId = String(raw.slug);
    const applyUrl = raw.url;
    const companyName = raw.company_name ? JobDeduplicator.cleanHtmlToText(raw.company_name).trim() : 'Company';
    const title = JobDeduplicator.cleanHtmlToText(raw.title || '').trim();
    const descText = JobDeduplicator.cleanHtmlToText(raw.description || '').trim();
    const locationStr = raw.location || 'Remote';

    const locInfo = this.resolveLocationAndCountry(locationStr);
    const empType = this.detectEmploymentType(title, descText);
    const skills = Array.isArray(raw.tags) && raw.tags.length > 0
      ? raw.tags
      : this.extractCommonSkills(title, descText);

    const isSenior = /senior|staff|principal|lead|director/i.test(title);
    const isEntry = /junior|associate|entry|intern/i.test(title);

    return {
      id: `arbeitnow_${sourceJobId}`,
      tenantId: 'tenant_prod_enterprise_1',
      sourcePlatform: 'ARBEITNOW' as any,
      sourceJobId,
      sourceUrl: applyUrl,
      canonicalUrl: JobDeduplicator.canonicalizeUrl(applyUrl),
      applicationUrl: applyUrl,
      applicationMethod: 'DIRECT_CAREER_PAGE',
      foundOnSources: ['ARBEITNOW' as any, 'CAREER_PAGES'],
      fingerprint: JobDeduplicator.generateFingerprint({ company: companyName, title, location: locInfo.location, sourcePlatform: 'ARBEITNOW' as any, sourceJobId }),
      company: companyName,
      title,
      department: 'Engineering',
      location: locInfo.location,
      country: locInfo.country,
      isRemote: Boolean(raw.remote) || locInfo.isRemote,
      remoteType: raw.remote ? 'REMOTE' : locInfo.remoteType,
      employmentType: empType,
      salaryCurrency: locInfo.country === 'India' ? 'INR' : 'USD',
      descriptionRaw: descText || `${title} at ${companyName}. Location: ${locInfo.location}.`,
      descriptionHtml: raw.description || `<p>${title} at ${companyName}.</p>`,
      postedAt: raw.created_at ? new Date(raw.created_at * 1000) : new Date(),
      updatedAt: raw.created_at ? new Date(raw.created_at * 1000) : new Date(),
      lastSyncedAt: new Date().toISOString(),
      extractedSkills: skills,
      experienceLevel: isSenior ? 'SENIOR' : (isEntry ? 'ENTRY' : 'MID'),
      visaAllowed: true
    };
  }
}
