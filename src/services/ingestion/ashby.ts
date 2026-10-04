// Ashby Public Job Board Official Connector
// Connects to publicly accessible Ashby Job Board APIs with genuine job listings & direct application URLs.
import { NormalizedJobPosting, JobPlatform } from '@/types';
import { BaseConnector } from './base-connector';
import { ConnectorMetadata, IngestionFilterOptions } from './types';
import { JobDeduplicator } from './deduplicator';

export class AshbyAdapter extends BaseConnector {
  public platform: JobPlatform = 'ASHBY';
  public name = 'Ashby';
  public metadata: ConnectorMetadata = {
    platform: 'ASHBY',
    name: 'Ashby Job Boards',
    category: 'COMPANY_CAREER_SITE',
    supportsAutomatedPrefill: true,
    supportsInternships: true,
    isLegalAndPermitted: true
  };

  private defaultBoards = ['linear', 'ramp', 'vercel', 'deel'];

  public async fetchRawJobs(queryOrBoard: string, options?: IngestionFilterOptions): Promise<any[]> {
    const searchTerms = (queryOrBoard || '').trim().toLowerCase();
    
    let targetBoards = this.defaultBoards;
    if (this.defaultBoards.includes(searchTerms)) {
      targetBoards = [searchTerms];
    } else {
      targetBoards = this.defaultBoards.slice(0, 2);
    }

    const allRaw: any[] = [];

    for (const board of targetBoards) {
      try {
        const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`;
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AutomatedJobs-AshbyClient/1.0'
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
        console.warn(`[AshbyAdapter] Failed fetching board ${board}:`, err.message);
      }
    }

    return allRaw;
  }

  public normalizeJob(raw: any, searchContext: string): NormalizedJobPosting | null {
    if (!raw || !raw.id || !raw.title) return null;

    const sourceJobId = String(raw.id);
    const applyUrl = raw.jobUrl || `https://jobs.ashbyhq.com/${raw._boardToken}/${raw.id}`;
    if (!applyUrl) return null;

    const companyName = raw._companyName || (raw._boardToken ? raw._boardToken.charAt(0).toUpperCase() + raw._boardToken.slice(1) : 'Company');
    const title = JobDeduplicator.cleanHtmlToText(raw.title || '').trim();
    const locationStr = raw.location || 'Remote';

    const locInfo = this.resolveLocationAndCountry(locationStr);
    const empType = this.detectEmploymentType(title, raw.employmentType || '');
    const skills = this.extractCommonSkills(title, `${raw.department || ''} ${raw.team || ''}`);

    const isSenior = /senior|staff|principal|lead|director|architect/i.test(title);
    const isEntry = /junior|associate|entry|grad|new grad|trainee/i.test(title);

    let currency = 'USD';
    if (locInfo.country === 'India') currency = 'INR';
    else if (locInfo.country === 'United Kingdom') currency = 'GBP';

    return {
      id: `ashby_${raw._boardToken || 'board'}_${sourceJobId}`,
      tenantId: 'tenant_prod_enterprise_1',
      sourcePlatform: 'ASHBY',
      sourceJobId,
      sourceUrl: applyUrl,
      canonicalUrl: JobDeduplicator.canonicalizeUrl(applyUrl),
      applicationUrl: applyUrl,
      applicationMethod: 'DIRECT_CAREER_PAGE',
      foundOnSources: ['ASHBY', 'CAREER_PAGES'],
      fingerprint: JobDeduplicator.generateFingerprint({ company: companyName, title, location: locInfo.location, sourcePlatform: 'ASHBY', sourceJobId }),
      company: companyName,
      title,
      department: raw.department || 'Engineering',
      location: locInfo.location,
      country: locInfo.country,
      isRemote: locInfo.isRemote || Boolean(raw.isRemote),
      remoteType: locInfo.remoteType,
      employmentType: empType,
      salaryCurrency: currency,
      descriptionRaw: `${title} at ${companyName}. Team: ${raw.team || raw.department || 'Engineering'}. Location: ${locInfo.location}.`,
      descriptionHtml: `<p>${title} at ${companyName}. Department: ${raw.department || 'Engineering'}.</p>`,
      postedAt: raw.publishedAt ? new Date(raw.publishedAt) : new Date(),
      updatedAt: raw.publishedAt ? new Date(raw.publishedAt) : new Date(),
      lastSyncedAt: new Date().toISOString(),
      extractedSkills: skills.length > 0 ? skills : ['Product Engineering', 'TypeScript', 'Fullstack'],
      experienceLevel: isSenior ? 'SENIOR' : (isEntry ? 'ENTRY' : 'MID'),
      visaAllowed: true
    };
  }
}
