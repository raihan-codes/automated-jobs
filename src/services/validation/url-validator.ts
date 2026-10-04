// Real-time URL Validator for Job Postings
// Validates that external job application and posting URLs are active, non-expired, and not 404.

interface CacheEntry {
  isValid: boolean;
  checkedAt: number;
}

const URL_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export class UrlValidator {
  /**
   * Reject placeholder, dummy, and non-job URLs before we ever render a listing.
   */
  public static isAllowedExternalJobUrl(urlStr?: string): boolean {
    if (!urlStr || !this.isValidUrlFormat(urlStr)) return false;

    const hostname = new URL(urlStr.trim()).hostname.toLowerCase();
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.local')) return false;
    if (hostname === 'example.com' || hostname.endsWith('.example.com')) return false;

    const allowedPatterns = [
      /(^|\.)greenhouse\.io$/,
      /(^|\.)adzuna\.[a-z.]+$/,
      /(^|\.)jooble\.org$/,
      /(^|\.)lever\.co$/,
      /(^|\.)ashbyhq\.com$/,
      /(^|\.)workable\.com$/,
      /(^|\.)smartrecruiters\.com$/,
      /(^|\.)linkedin\.com$/,
      /(^|\.)wellfound\.com$/,
      /(^|\.)indeed\.com$/,
      /(^|\.)glassdoor\.com$/,
      /(^|\.)jobvite\.com$/,
      /(^|\.)recruitee\.com$/,
      /(^|\.)greenhouse\.io$/,
      /(^|\.)careerarc\.com$/,
      /(^|\.)jobs\.com$/,
      /(^|\.)jobs\./,
      /(^|\.)careers\./,
      /(^|\.)hire\.com$/
    ];

    const isKnownAtsHost = allowedPatterns.some(pattern => pattern.test(hostname));
    if (isKnownAtsHost) return true;

    return hostname.includes('careers') || hostname.includes('jobs');
  }

  /**
   * Fast check if a URL is syntactically valid and uses http/https.
   */
  public static isValidUrlFormat(urlStr?: string): boolean {
    if (!urlStr || typeof urlStr !== 'string') return false;
    const trimmed = urlStr.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
    try {
      const parsed = new URL(trimmed);
      return Boolean(parsed.hostname && parsed.hostname.includes('.'));
    } catch {
      return false;
    }
  }

  /**
   * Validates if a job URL is active and reachable via HTTP HEAD/GET request.
   * Filters out 404 Not Found, 410 Gone, and DNS failures.
   * Considers 200-399 and anti-bot challenge responses (403/429/503 from Cloudflare) as valid active domains.
   */
  public static async isJobUrlActive(urlStr: string, timeoutMs: number = 3000): Promise<boolean> {
    if (!this.isValidUrlFormat(urlStr)) return false;

    const trimmed = urlStr.trim();
    const cached = URL_CACHE.get(trimmed);
    const now = Date.now();
    if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
      return cached.isValid;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // Perform HEAD first (faster, low bandwidth)
      let response: Response;
      try {
        response = await fetch(trimmed, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          signal: controller.signal,
          redirect: 'follow'
        });
      } catch (headErr: any) {
        // If HEAD was rejected or method not allowed, try GET with range header
        response = await fetch(trimmed, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Range': 'bytes=0-1024'
          },
          signal: controller.signal,
          redirect: 'follow'
        });
      } finally {
        clearTimeout(timer);
      }

      // Check status: 404 and 410 mean the job was removed or deleted
      if (response.status === 404 || response.status === 410) {
        URL_CACHE.set(trimmed, { isValid: false, checkedAt: now });
        return false;
      }

      // Legitimate ATS and company career pages may return 403/429/503 to anti-bot checks;
      // those still indicate a live posting domain and should not be discarded.
      if (response.status === 403 || response.status === 429 || response.status === 503) {
        URL_CACHE.set(trimmed, { isValid: this.isAllowedExternalJobUrl(trimmed), checkedAt: now });
        return this.isAllowedExternalJobUrl(trimmed);
      }

      // Successful 2xx or redirects 3xx are valid
      if (response.status >= 200 && response.status < 400) {
        URL_CACHE.set(trimmed, { isValid: true, checkedAt: now });
        return true;
      }

      // Bot protection status codes (403, 429) mean the URL exists on a protected site (e.g. Cloudflare / LinkedIn)
      if (response.status === 403 || response.status === 429 || response.status === 503) {
        URL_CACHE.set(trimmed, { isValid: true, checkedAt: now });
        return true;
      }

      const isValid = response.status < 500;
      URL_CACHE.set(trimmed, { isValid, checkedAt: now });
      return isValid;
    } catch (err: any) {
      // Abort timeout or network error: if it has valid format from known reputable ATS/platforms, treat as valid
      const isKnownPlatform = /greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|adzuna\.[a-z.]+|jooble\.org|arbeitnow\.com|remotive\.com/i.test(trimmed);
      URL_CACHE.set(trimmed, { isValid: isKnownPlatform, checkedAt: now });
      return isKnownPlatform;
    }
  }

  /**
   * Batch validates an array of jobs concurrently with limit.
   * Returns only jobs whose application/source URLs are active and verified.
   */
  public static async filterActiveJobs<T extends { applicationUrl?: string; sourceUrl?: string; canonicalUrl?: string }>(
    jobs: T[],
    maxConcurrent: number = 8
  ): Promise<T[]> {
    if (!Array.isArray(jobs) || jobs.length === 0) return [];

    const results: T[] = [];
    const chunks: T[][] = [];

    for (let i = 0; i < jobs.length; i += maxConcurrent) {
      chunks.push(jobs.slice(i, i + maxConcurrent));
    }

    for (const chunk of chunks) {
      const validations = await Promise.all(
        chunk.map(async (job) => {
          const targetUrl = job.applicationUrl || job.sourceUrl || job.canonicalUrl;
          if (!targetUrl || !this.isAllowedExternalJobUrl(targetUrl)) {
            return { job, valid: false };
          }
          const valid = await this.isJobUrlActive(targetUrl);
          return { job, valid };
        })
      );

      for (const item of validations) {
        if (item.valid) {
          results.push(item.job);
        }
      }
    }

    return results;
  }
}
