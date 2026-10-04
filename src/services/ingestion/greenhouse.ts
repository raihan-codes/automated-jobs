// Greenhouse Public Job Boards Official Connector
// Connects to publicly accessible Greenhouse Job Board APIs with genuine job listings & direct application URLs.
import { NormalizedJobPosting, JobPlatform } from '@/types';
import { BaseConnector } from './base-connector';
import { ConnectorMetadata, IngestionFilterOptions } from './types';
import { JobDeduplicator } from './deduplicator';

export class GreenhouseAdapter extends BaseConnector {
  public platform: JobPlatform = 'GREENHOUSE';
  public name = 'Greenhouse';
  public metadata: ConnectorMetadata = {
    platform: 'GREENHOUSE',
    name: 'Greenhouse Job Boards',
    category: 'COMPANY_CAREER_SITE',
    supportsAutomatedPrefill: true,
    supportsInternships: true,
    isLegalAndPermitted: true
  };

  // Known public tech companies with active Greenhouse boards
  private defaultBoards = ['canonical', 'cloudflare', 'figma', 'gitlab', 'datadog', 'postman', 'airbyte'];

  public async fetchRawJobs(queryOrBoard: string, options?: IngestionFilterOptions): Promise<any[]> {
    const searchTerms = (queryOrBoard || '').trim().toLowerCase();
    
    // Determine which boards to query
    let targetBoards = this.defaultBoards;
    if (this.defaultBoards.includes(searchTerms)) {
      targetBoards = [searchTerms];
    } else {
      // Pick up to 3 boards per search cycle
      targetBoards = this.defaultBoards.slice(0, 3);
    }

    const allRaw: any[] = [];

    for (const board of targetBoards) {
      try {
        const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`;
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AutomatedJobs-GreenhouseClient/1.0'
          },
          signal: AbortSignal.timeout(6000)
        });

        if (!res.ok) continue;

        const data = await res.json();
        if (Array.isArray(data.jobs)) {
          for (const item of data.jobs) {
            item._companyName = board.charAt(0).toUpperCase() + board.slice(1);
            item._boardToken = board;
            allRaw.push(item);
          }
        }
      } catch (err: any) {
        console.warn(`[GreenhouseAdapter] Failed fetching board ${board}:`, err.message);
      }
    }

    return allRaw;
  }

  public normalizeJob(raw: any, searchContext: string): NormalizedJobPosting | null {
    if (!raw || !raw.id || !raw.title) return null;

    const sourceJobId = String(raw.id);
    const applyUrl = raw.absolute_url || `https://boards.greenhouse.io/${raw._boardToken}/jobs/${raw.id}`;
    if (!applyUrl) return null;

    const companyName = raw._companyName || (raw._boardToken ? raw._boardToken.charAt(0).toUpperCase() + raw._boardToken.slice(1) : 'Company');
    const title = JobDeduplicator.cleanHtmlToText(raw.title || '').trim();
    const content = JobDeduplicator.cleanHtmlToText(raw.content || '').trim();
    const locationStr = raw.location?.name || 'Remote';

    const locInfo = this.resolveLocationAndCountry(locationStr);
    const empType = this.detectEmploymentType(title, content);
    const skills = this.extractCommonSkills(title, content);

    const isSenior = /senior|staff|principal|lead|director|architect/i.test(title);
    const isEntry = /junior|associate|entry|grad|new grad|trainee/i.test(title);

    let currency = 'USD';
    if (locInfo.country === 'India') currency = 'INR';
    else if (locInfo.country === 'United Kingdom') currency = 'GBP';
    else if (locInfo.country === 'Germany' || locInfo.country === 'France' || locInfo.country === 'Netherlands') currency = 'EUR';

    return {
      id: `gh_${raw._boardToken || 'board'}_${sourceJobId}`,
      tenantId: 'tenant_prod_enterprise_1',
      sourcePlatform: 'GREENHOUSE',
      sourceJobId,
      sourceUrl: applyUrl,
      canonicalUrl: JobDeduplicator.canonicalizeUrl(applyUrl),
      applicationUrl: applyUrl,
      applicationMethod: 'DIRECT_CAREER_PAGE',
      foundOnSources: ['GREENHOUSE', 'CAREER_PAGES'],
      fingerprint: JobDeduplicator.generateFingerprint({ company: companyName, title, location: locInfo.location, sourcePlatform: 'GREENHOUSE', sourceJobId }),
      company: companyName,
      title,
      department: raw.departments?.[0]?.name || 'Engineering',
      location: locInfo.location,
      country: locInfo.country,
      isRemote: locInfo.isRemote,
      remoteType: locInfo.remoteType,
      employmentType: empType,
      salaryCurrency: currency,
      descriptionRaw: content || `${title} at ${companyName}. Location: ${locInfo.location}.`,
      descriptionHtml: raw.content ? raw.content : `<p>${title} at ${companyName}.</p>`,
      postedAt: raw.updated_at ? new Date(raw.updated_at) : new Date(),
      updatedAt: raw.updated_at ? new Date(raw.updated_at) : new Date(),
      lastSyncedAt: new Date().toISOString(),
      extractedSkills: skills.length > 0 ? skills : ['Software Engineering', 'Problem Solving'],
      experienceLevel: isSenior ? 'SENIOR' : (isEntry ? 'ENTRY' : 'MID'),
      visaAllowed: true
    };
  }
}
