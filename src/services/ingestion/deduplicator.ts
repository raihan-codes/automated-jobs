// Job Deduplication & Fingerprinting Engine
import crypto from 'crypto';
import { NormalizedJobPosting } from '@/types';

export class JobDeduplicator {
  /**
   * Generates a deterministic SHA256 fingerprint for a job posting.
   * Based on normalized company name, cleaned job title, location, and platform ID.
   */
  public static generateFingerprint(job: Partial<NormalizedJobPosting>): string {
    const cleanCompany = (job.company || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTitle = (job.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanLocation = (job.location || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const platform = (job.sourcePlatform || 'UNKNOWN').toUpperCase();
    const sourceId = (job.sourceJobId || '').trim();

    const rawString = `${cleanCompany}::${cleanTitle}::${cleanLocation}::${platform}::${sourceId}`;
    return crypto.createHash('sha256').update(rawString).digest('hex');
  }

  /**
   * Cleans and canonicalizes job URL (strips tracking parameters, utm_source, gh_jid, etc.)
   */
  public static canonicalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const searchParams = new URLSearchParams(parsed.search);
      
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'gh_jid', 'lever-source', 'ref', 'source', 'trk', 'fbclid', 'gclid'
      ];
      
      trackingParams.forEach(param => searchParams.delete(param));
      
      parsed.search = searchParams.toString();
      return parsed.toString();
    } catch {
      return url;
    }
  }

  /**
   * Generates a semantic cross-platform matching key.
   * Matches identical job openings across Adzuna and Jooble.
   */
  public static generateCrossSourceKey(job: Partial<NormalizedJobPosting>): string {
    const cleanCompany = (job.company || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTitle = (job.title || '')
      .toLowerCase()
      .replace(/\b(senior|sr|lead|staff|principal|junior|jr|intern|internship)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
    const cleanCountry = (job.country || (job.isRemote ? 'remote' : job.location || ''))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();

    return `${cleanCompany}::${cleanTitle}::${cleanCountry}`;
  }

  /**
   * Merges two job postings detected across Adzuna and Jooble.
   * Combines foundOnSources list (e.g. ['ADZUNA', 'JOOBLE']) and preserves the best available application URL.
   */
  public static mergePostings(existing: NormalizedJobPosting, incoming: NormalizedJobPosting): NormalizedJobPosting {
    const combinedSources = Array.from(
      new Set([...(existing.foundOnSources || [existing.sourcePlatform]), ...(incoming.foundOnSources || [incoming.sourcePlatform])])
    );

    const preferIncomingUrl = Boolean(incoming.applicationUrl && !existing.applicationUrl);

    return {
      ...existing,
      foundOnSources: combinedSources,
      sourceUrl: preferIncomingUrl ? incoming.sourceUrl : existing.sourceUrl,
      canonicalUrl: preferIncomingUrl ? incoming.canonicalUrl : existing.canonicalUrl,
      applicationUrl: preferIncomingUrl ? incoming.applicationUrl : (existing.applicationUrl || incoming.applicationUrl),
      applicationMethod: preferIncomingUrl ? incoming.applicationMethod : (existing.applicationMethod || incoming.applicationMethod),
      descriptionRaw: (incoming.descriptionRaw && incoming.descriptionRaw.length > existing.descriptionRaw.length)
        ? incoming.descriptionRaw
        : existing.descriptionRaw,
      extractedSkills: Array.from(
        new Set([...(existing.extractedSkills || []), ...(incoming.extractedSkills || [])])
      ),
      updatedAt: new Date(Math.max(new Date(existing.updatedAt).getTime(), new Date(incoming.updatedAt).getTime()))
    };
  }

  /**
   * Extracts clean plain text from HTML JD descriptions
   */
  public static cleanHtmlToText(html: string): string {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }
}
