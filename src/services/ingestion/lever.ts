// Lever Public Postings Official Connector
// Connects to publicly accessible Lever Job Board APIs with genuine job listings & direct application URLs.
import { NormalizedJobPosting, JobPlatform } from '@/types';
import { BaseConnector } from './base-connector';
import { ConnectorMetadata, IngestionFilterOptions } from './types';
import { JobDeduplicator } from './deduplicator';

export class LeverAdapter extends BaseConnector {
  public platform: JobPlatform = 'LEVER';
  public name = 'Lever';
  public metadata: ConnectorMetadata = {
    platform: 'LEVER',
    name: 'Lever Job Boards',
    category: 'COMPANY_CAREER_SITE',
    supportsAutomatedPrefill: true,
    supportsInternships: true,
    isLegalAndPermitted: true
  };

  private defaultCompanies = ['spotify', 'netflix', 'palantir', 'twitch'];

  public async fetchRawJobs(queryOrCompany: string, options?: IngestionFilterOptions): Promise<any[]> {
    const searchTerms = (queryOrCompany || '').trim().toLowerCase();

    let targetCompanies = this.defaultCompanies;
    if (this.defaultCompanies.includes(searchTerms)) {
      targetCompanies = [searchTerms];
    } else {
      targetCompanies = this.defaultCompanies.slice(0, 2);
    }

    const allRaw: any[] = [];

    for (const company of targetCompanies) {
      try {
        const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`;
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AutomatedJobs-LeverClient/1.0'
          },
          signal: AbortSignal.timeout(6000)
        });

        if (!res.ok) continue;

        const data = await res.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            item._companyName = company.charAt(0).toUpperCase() + company.slice(1);
            item._companySlug = company;
            allRaw.push(item);
          }
        }
      } catch (err: any) {
        console.warn(`[LeverAdapter] Failed fetching company ${company}:`, err.message);
      }
    }

    return allRaw;
  }

  public normalizeJob(raw: any, searchContext: string): NormalizedJobPosting | null {
    if (!raw || !raw.id || !raw.text) return null;

    const sourceJobId = String(raw.id);
    const applyUrl = raw.applyUrl || raw.hostedUrl || `https://jobs.lever.co/${raw._companySlug}/${raw.id}/apply`;
    if (!applyUrl) return null;

    const companyName = raw._companyName || (raw._companySlug ? raw._companySlug.charAt(0).toUpperCase() + raw._companySlug.slice(1) : 'Company');
    const title = JobDeduplicator.cleanHtmlToText(raw.text || '').trim();
    const description = JobDeduplicator.cleanHtmlToText(raw.descriptionPlain || raw.description || '').trim();
    const locationStr = raw.categories?.location || 'Remote';

    const locInfo = this.resolveLocationAndCountry(locationStr);
    const empType = this.detectEmploymentType(title, `${description} ${raw.categories?.commitment || ''}`);
    const skills = this.extractCommonSkills(title, `${description} ${raw.categories?.team || ''}`);

    const isSenior = /senior|staff|principal|lead|director|architect/i.test(title);
    const isEntry = /junior|associate|entry|grad|new grad|trainee/i.test(title);

    return {
      id: `lever_${raw._companySlug || 'comp'}_${sourceJobId}`,
      tenantId: 'tenant_prod_enterprise_1',
      sourcePlatform: 'LEVER',
      sourceJobId,
      sourceUrl: applyUrl,
      canonicalUrl: JobDeduplicator.canonicalizeUrl(applyUrl),
      applicationUrl: applyUrl,
      applicationMethod: 'DIRECT_CAREER_PAGE',
      foundOnSources: ['LEVER', 'CAREER_PAGES'],
      fingerprint: JobDeduplicator.generateFingerprint({ company: companyName, title, location: locInfo.location, sourcePlatform: 'LEVER', sourceJobId }),
      company: companyName,
      title,
      department: raw.categories?.department || raw.categories?.team || 'Engineering',
      location: locInfo.location,
      country: locInfo.country,
      isRemote: locInfo.isRemote || raw.workplaceType === 'remote',
      remoteType: locInfo.remoteType,
      employmentType: empType,
      salaryCurrency: locInfo.country === 'India' ? 'INR' : 'USD',
      descriptionRaw: description || `${title} at ${companyName}. Location: ${locInfo.location}.`,
      descriptionHtml: raw.description ? raw.description : `<p>${title} at ${companyName}.</p>`,
      postedAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      updatedAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      lastSyncedAt: new Date().toISOString(),
      extractedSkills: skills.length > 0 ? skills : ['Software Engineering', 'System Architecture'],
      experienceLevel: isSenior ? 'SENIOR' : (isEntry ? 'ENTRY' : 'MID'),
      visaAllowed: true
    };
  }
}
