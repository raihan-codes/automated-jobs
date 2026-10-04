// Adzuna API Official Job Discovery Connector
import { NormalizedJobPosting, JobPlatform } from '@/types';
import { BaseConnector } from './base-connector';
import { ConnectorMetadata, IngestionFilterOptions } from './types';
import { JobDeduplicator } from './deduplicator';

export class AdzunaAdapter extends BaseConnector {
  public platform: JobPlatform = 'ADZUNA';
  public name = 'Adzuna';
  public metadata: ConnectorMetadata = {
    platform: 'ADZUNA',
    name: 'Adzuna Jobs API',
    category: 'PUBLIC_JOB_BOARD',
    supportsAutomatedPrefill: true,
    supportsInternships: true,
    isLegalAndPermitted: true
  };

  private baseUrl = 'https://api.adzuna.com/v1/api/jobs';

  /**
   * Resolves appropriate 2-letter ISO country code for Adzuna API
   */
  private resolveCountryCode(locationOrCountry?: string): string {
    if (!locationOrCountry) return 'in'; // Default to India tech ecosystem
    const loc = locationOrCountry.toLowerCase();
    if (/india|bengaluru|bangalore|hyderabad|pune|delhi|mumbai|kolkata|chennai|noida|gurgaon|gurugram/i.test(loc)) return 'in';
    if (/united states|\busa\b|\bus\b|san francisco|new york|seattle|austin|chicago|california|texas/i.test(loc)) return 'us';
    if (/united kingdom|\buk\b|london|manchester|edinburgh|birmingham/i.test(loc)) return 'gb';
    if (/canada|toronto|vancouver|montreal|waterloo/i.test(loc)) return 'ca';
    if (/australia|sydney|melbourne|brisbane/i.test(loc)) return 'au';
    if (/germany|berlin|munich|frankfurt/i.test(loc)) return 'de';
    if (/france|paris/i.test(loc)) return 'fr';
    if (/netherlands|amsterdam/i.test(loc)) return 'nl';
    if (/singapore/i.test(loc)) return 'sg';
    return 'in';
  }

  public async fetchRawJobs(queryOrCompany: string, options?: IngestionFilterOptions): Promise<any[]> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {
      console.warn('[AdzunaAdapter] Missing ADZUNA_APP_ID or ADZUNA_APP_KEY in server environment.');
      return [];
    }

    const country = this.resolveCountryCode(options?.location || queryOrCompany);
    const searchTerms = (queryOrCompany || 'developer').trim();
    const page = 1;
    const resultsPerPage = 25;

    const url = new URL(`${this.baseUrl}/${country}/search/${page}`);
    url.searchParams.set('app_id', appId.trim());
    url.searchParams.set('app_key', appKey.trim());
    url.searchParams.set('what', searchTerms);
    url.searchParams.set('results_per_page', String(resultsPerPage));
    url.searchParams.set('content-type', 'application/json');
    url.searchParams.set('sort_by', 'date');
    url.searchParams.set('max_days_old', '30');

    if (options?.remoteOnly) {
      url.searchParams.set('where', 'remote');
    } else if (options?.location) {
      url.searchParams.set('where', options.location);
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AutomatedJobs-AdzunaClient/1.0'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        console.warn(`[AdzunaAdapter] API HTTP Error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data.results) ? data.results : [];
    } catch (err: any) {
      console.warn('[AdzunaAdapter] Network/Fetch error:', err.message);
      return [];
    }
  }

  public normalizeJob(raw: any, searchContext: string): NormalizedJobPosting | null {
    if (!raw || !raw.id || !raw.title) return null;

    const sourceJobId = String(raw.id);
    const applyUrl = raw.redirect_url || '';
    if (!applyUrl) return null;

    const companyName = raw.company?.display_name?.trim() || 'Company';
    const title = JobDeduplicator.cleanHtmlToText(raw.title || '').trim();
    const descriptionRaw = JobDeduplicator.cleanHtmlToText(raw.description || '').trim();
    const locationStr = raw.location?.display_name?.trim() || 'Not specified';

    const locInfo = this.resolveLocationAndCountry(locationStr);
    const empType = this.detectEmploymentType(title, descriptionRaw);
    const skills = this.extractCommonSkills(title, descriptionRaw);

    const isSenior = /senior|staff|principal|lead|director|architect/i.test(title);
    const isEntry = /junior|associate|entry|grad|new grad|trainee/i.test(title);

    let currency = 'INR';
    if (locInfo.country === 'United States') currency = 'USD';
    else if (locInfo.country === 'United Kingdom') currency = 'GBP';
    else if (locInfo.country === 'Canada') currency = 'CAD';
    else if (locInfo.country === 'Australia') currency = 'AUD';
    else if (locInfo.country === 'Germany' || locInfo.country === 'France' || locInfo.country === 'Netherlands') currency = 'EUR';

    const isPredicted = raw.salary_is_predicted === '1' || raw.salary_is_predicted === 1 || raw.salary_is_predicted === true;
    const salaryMin = !isPredicted && typeof raw.salary_min === 'number' && raw.salary_min > 0 ? Math.round(raw.salary_min) : undefined;
    const salaryMax = !isPredicted && typeof raw.salary_max === 'number' && raw.salary_max > 0 ? Math.round(raw.salary_max) : undefined;

    let postedDate: Date;
    if (raw.created) {
      const parsed = new Date(raw.created);
      postedDate = isNaN(parsed.getTime()) ? new Date() : parsed;
    } else {
      postedDate = new Date();
    }

    return {
      sourcePlatform: 'ADZUNA',
      sourceJobId,
      sourceUrl: applyUrl,
      canonicalUrl: JobDeduplicator.canonicalizeUrl(applyUrl),
      applicationUrl: applyUrl,
      applicationMethod: 'EXTERNAL_PORTAL_LINK',
      foundOnSources: ['ADZUNA'],
      company: companyName,
      title,
      department: raw.category?.label || 'Engineering',
      location: locInfo.location,
      country: locInfo.country,
      isRemote: locInfo.isRemote,
      remoteType: locInfo.remoteType,
      employmentType: empType,
      salaryMin,
      salaryMax,
      salaryCurrency: currency,
      descriptionRaw: descriptionRaw || title,
      descriptionHtml: `<p>${descriptionRaw || title}</p>`,
      postedAt: postedDate,
      updatedAt: postedDate,
      extractedSkills: skills,
      experienceLevel: empType === 'INTERNSHIP' ? 'INTERN' : isSenior ? 'SENIOR' : isEntry ? 'ENTRY' : 'MID',
      visaAllowed: true
    };
  }
}
