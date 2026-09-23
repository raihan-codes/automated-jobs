// Jooble API Official Job Discovery Connector
import { NormalizedJobPosting, JobPlatform } from '@/types';
import { BaseConnector } from './base-connector';
import { ConnectorMetadata, IngestionFilterOptions } from './types';
import { JobDeduplicator } from './deduplicator';

export class JoobleAdapter extends BaseConnector {
  public platform: JobPlatform = 'JOOBLE';
  public name = 'Jooble';
  public metadata: ConnectorMetadata = {
    platform: 'JOOBLE',
    name: 'Jooble Jobs API',
    category: 'PUBLIC_JOB_BOARD',
    supportsAutomatedPrefill: true,
    supportsInternships: true,
    isLegalAndPermitted: true
  };

  private baseUrl = 'https://jooble.org/api';

  public async fetchRawJobs(queryOrCompany: string, options?: IngestionFilterOptions): Promise<any[]> {
    const apiKey = process.env.JOOBLE_API_KEY;

    if (!apiKey) {
      console.warn('[JoobleAdapter] Missing JOOBLE_API_KEY in server environment.');
      return [];
    }

    const endpoint = `${this.baseUrl}/${apiKey.trim()}`;
    const keywords = (queryOrCompany || 'developer').trim();
    const location = options?.remoteOnly ? 'Remote' : (options?.query || '');

    const requestBody = {
      keywords,
      location: location || '',
      page: 1,
      resultonpage: 25
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'AutomatedJobs-JoobleClient/1.0'
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        console.warn(`[JoobleAdapter] API HTTP Error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data.jobs) ? data.jobs : [];
    } catch (err: any) {
      console.warn('[JoobleAdapter] Network/Fetch error:', err.message);
      return [];
    }
  }

  public normalizeJob(raw: any, searchContext: string): NormalizedJobPosting | null {
    if (!raw || (!raw.id && !raw.link) || !raw.title) return null;

    const sourceJobId = String(raw.id || Math.abs(this.hashCode(raw.link || raw.title)));
    const applyUrl = raw.link || '';
    if (!applyUrl) return null;

    const companyName = raw.company ? JobDeduplicator.cleanHtmlToText(raw.company).trim() : 'Company';
    const title = JobDeduplicator.cleanHtmlToText(raw.title || '').trim();
    const snippet = JobDeduplicator.cleanHtmlToText(raw.snippet || '').trim();
    const locationStr = raw.location ? JobDeduplicator.cleanHtmlToText(raw.location).trim() : 'Remote';

    const locInfo = this.resolveLocationAndCountry(locationStr);
    const empType = this.detectEmploymentType(title, `${snippet} ${raw.type || ''}`);
    const skills = this.extractCommonSkills(title, snippet);

    const isSenior = /senior|staff|principal|lead|director|architect/i.test(title);
    const isEntry = /junior|associate|entry|grad|new grad|trainee/i.test(title);

    let currency = 'INR';
    if (locInfo.country === 'United States') currency = 'USD';
    else if (locInfo.country === 'United Kingdom') currency = 'GBP';
    else if (locInfo.country === 'Canada') currency = 'CAD';
    else if (locInfo.country === 'Australia') currency = 'AUD';
    else if (locInfo.country === 'Germany' || locInfo.country === 'France' || locInfo.country === 'Netherlands') currency = 'EUR';

    // Parse real salary if supplied by Jooble
    let salaryMin: number | undefined = undefined;
    let salaryMax: number | undefined = undefined;
    if (raw.salary && typeof raw.salary === 'string' && raw.salary.trim() && !/not disclosed|negotiable|competitive|doe|market|tbd/i.test(raw.salary)) {
      const salaryNums = String(raw.salary).match(/\d[\d,.]*/g);
      if (salaryNums && salaryNums.length > 0) {
        const parsedNums = salaryNums.map(s => parseInt(s.replace(/,/g, ''), 10)).filter(n => !isNaN(n) && n > 0);
        if (parsedNums.length === 1) {
          salaryMin = parsedNums[0];
        } else if (parsedNums.length >= 2) {
          salaryMin = Math.min(parsedNums[0], parsedNums[1]);
          salaryMax = Math.max(parsedNums[0], parsedNums[1]);
        }
      }
    }

    let postedDate: Date;
    if (raw.updated) {
      const parsed = new Date(raw.updated);
      postedDate = isNaN(parsed.getTime()) ? (raw.created ? new Date(raw.created) : new Date()) : parsed;
    } else if (raw.created) {
      const parsed = new Date(raw.created);
      postedDate = isNaN(parsed.getTime()) ? new Date() : parsed;
    } else {
      postedDate = new Date();
    }
    if (isNaN(postedDate.getTime())) {
      postedDate = new Date();
    }

    return {
      sourcePlatform: 'JOOBLE',
      sourceJobId,
      sourceUrl: applyUrl,
      canonicalUrl: JobDeduplicator.canonicalizeUrl(applyUrl),
      applicationUrl: applyUrl,
      applicationMethod: 'EXTERNAL_PORTAL_LINK',
      foundOnSources: ['JOOBLE'],
      company: companyName,
      title,
      department: 'Engineering',
      location: locInfo.location,
      country: locInfo.country,
      isRemote: locInfo.isRemote,
      remoteType: locInfo.remoteType,
      employmentType: empType,
      salaryMin,
      salaryMax,
      salaryCurrency: currency,
      descriptionRaw: snippet || title,
      descriptionHtml: `<p>${snippet || title}</p>`,
      postedAt: postedDate,
      updatedAt: postedDate,
      extractedSkills: skills.length > 0 ? skills : ['Software Engineering', 'Problem Solving'],
      experienceLevel: empType === 'INTERNSHIP' ? 'INTERN' : isSenior ? 'SENIOR' : isEntry ? 'ENTRY' : 'MID',
      visaAllowed: true
    };
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
