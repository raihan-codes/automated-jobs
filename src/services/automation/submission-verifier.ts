/**
 * ExternalSubmissionVerifier
 *
 * Inspects a Playwright page AFTER the final submit button is clicked and
 * determines whether the external ATS has provided reliable confirmation
 * that the application was submitted.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CRITICAL RULES:
 *  1. NEVER return verified = true based solely on HTTP 200 or URL opening.
 *  2. NEVER return verified = true for a job listing page (e.g. Adzuna listing).
 *  3. NEVER return verified = true because a form was filled or button clicked.
 *  4. NEVER fabricate confirmationId or confirmationText.
 *  5. Only return verified = true when one of the ACCEPTANCE_SIGNALS patterns
 *     is matched in the actual page content after submission.
 *  6. If Adzuna redirects to another ATS, follow to that ATS and verify there.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * In production this class would import and drive a real Playwright Browser.
 * In the current environment (no Playwright installed), it operates in
 * ANALYSIS_ONLY mode — inspecting page URL + text that was already captured
 * and returning the appropriate status with zero fabrication.
 */

import { SubmissionVerification } from '../../types';
import { SubmissionAttemptResult } from './types';

// ── ATS domain registry ──────────────────────────────────────────────────────

/** Known ATS platforms and their domains */
const ATS_DOMAINS: Record<string, string> = {
  'greenhouse.io': 'Greenhouse',
  'boards.greenhouse.io': 'Greenhouse',
  'lever.co': 'Lever',
  'jobs.lever.co': 'Lever',
  'workable.com': 'Workable',
  'apply.workable.com': 'Workable',
  'ashbyhq.com': 'Ashby',
  'jobs.ashbyhq.com': 'Ashby',
  'myworkdayjobs.com': 'Workday',
  'icims.com': 'iCIMS',
  'taleo.net': 'Taleo',
  'successfactors.com': 'SAP SuccessFactors',
  'smartrecruiters.com': 'SmartRecruiters',
  'breezy.hr': 'Breezy HR',
  'recruitee.com': 'Recruitee',
  'jobvite.com': 'Jobvite',
  'bamboohr.com': 'BambooHR',
  'rippling.com': 'Rippling',
  'dover.com': 'Dover',
  'uscareers.usbank.com': 'U.S. Bank Careers',
  'usbank.com': 'U.S. Bank',
};

/** Adzuna and job-board domains that are NOT the final application destination */
const JOB_BOARD_DOMAINS = [
  'adzuna.com',
  'adzuna.in',
  'jooble.org',
  'indeed.com',
  'glassdoor.com',
  'linkedin.com',
  'monster.com',
  'careerbuilder.com',
  'ziprecruiter.com',
];

// ── Confirmation signal patterns ─────────────────────────────────────────────

/**
 * Text patterns that constitute reliable external ATS confirmation.
 * All matching is case-insensitive against the full page text.
 */
const ACCEPTANCE_TEXT_SIGNALS = [
  'application submitted',
  'application received',
  'thank you for applying',
  'thank you for your application',
  'successfully submitted',
  'successfully applied',
  'application complete',
  'application was submitted',
  'your application has been received',
  'we have received your application',
  'your application is complete',
  'application confirmation',
  'you have applied',
  'your application has been submitted',
  'application id:',
  'reference number:',
  'confirmation number:',
  'submission id:',
  'reference id:',
];

/**
 * URL patterns that indicate a confirmation page (supplement to text signals).
 * These alone are NOT sufficient — must be combined with text signal OR confId.
 */
const CONFIRMATION_URL_PATTERNS = [
  '/confirmation',
  '/thank-you',
  '/thankyou',
  '/success',
  '/applied',
  '/application-submitted',
  '/complete',
];

/**
 * Patterns that conclusively mean we are NOT on a confirmation page,
 * even if the page returned HTTP 200.
 */
const NON_CONFIRMATION_SIGNALS = [
  'apply for this job',
  'apply now',
  'submit application',
  'create an account',
  'sign in to apply',
  'jobs near you',
  'similar jobs',
  'job description',
  'about the role',
];

/**
 * Patterns that conclusively mean the external platform reported submission failure
 */
export const EXPLICIT_FAILURE_SIGNALS = [
  'submission failed',
  'application failed',
  'error submitting',
  'could not submit your application',
  'please correct the errors below',
  'required fields are missing',
  'session has expired',
  'session expired',
  'application closed',
  'no longer accepting applications',
  'an error occurred while processing',
  'failed to upload',
  'submission error'
];


// ── Confirmation ID extraction ────────────────────────────────────────────────

/**
 * Attempts to extract a confirmation / application reference ID from page text.
 * Returns null if no recognizable pattern is found.
 * NEVER fabricates an ID.
 */
function extractConfirmationId(pageText: string): string | null {
  const patterns = [
    /(?:application\s*id|app\s*id)[:\s#]+([A-Z0-9\-]{4,30})/i,
    /(?:reference|ref)\s*(?:number|no|#|id)[:\s]+([A-Z0-9\-]{4,30})/i,
    /(?:confirmation|submission)\s*(?:number|no|#|id)[:\s]+([A-Z0-9\-]{4,30})/i,
    /\b([A-Z]{2,5}-\d{4,12})\b/,   // e.g. APP-20240924, REF-123456
  ];

  for (const pattern of patterns) {
    const match = pageText.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

// ── Domain helpers ────────────────────────────────────────────────────────────

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isJobBoardDomain(url: string): boolean {
  const host = extractHostname(url);
  return JOB_BOARD_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
}

function getAtsName(url: string): string | null {
  const host = extractHostname(url);
  for (const [domain, name] of Object.entries(ATS_DOMAINS)) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return name;
    }
  }
  return null;
}

// ── Core verifier ─────────────────────────────────────────────────────────────

export interface PageSnapshot {
  /** Final URL after all redirects */
  url: string;
  /** Full visible text of the page (document.body.innerText) */
  text: string;
  /** Page title */
  title?: string;
  /** Optional: path to screenshot file captured by Playwright */
  screenshotPath?: string;
}

export class ExternalSubmissionVerifier {
  /**
   * Verifies whether a page snapshot represents genuine external ATS confirmation.
   *
   * Call this AFTER clicking the final submit button in Playwright and
   * waiting for navigation to settle.
   *
   * @param snapshot — page state after submit click
   * @param jobApplicationUrl — the original job apply URL (for context)
   */
  static verify(snapshot: PageSnapshot, jobApplicationUrl?: string): SubmissionVerification {
    const { url, text, screenshotPath } = snapshot;
    const normalizedText = text.toLowerCase();
    const hostname = extractHostname(url);

    // ── Guard: job board URL means we're still on the listing page ───────────
    if (isJobBoardDomain(url)) {
      return {
        verified: false,
        verificationMethod: null,
        confirmationText: null,
        confirmationId: null,
        confirmationUrl: null,
        submittedAt: null,
        externalDomain: hostname,
        screenshotPath: screenshotPath ?? null,
        failureReason:
          `Page is on a job-board domain (${hostname}), not an employer ATS. ` +
          `If Adzuna is showing "Apply for this job", the application was NOT submitted.`,
      };
    }

    // ── Guard: explicit failure signals from external platform ───────────────
    const explicitFailure = EXPLICIT_FAILURE_SIGNALS.find(s => normalizedText.includes(s));
    if (explicitFailure) {
      return {
        verified: false,
        verificationMethod: null,
        confirmationText: null,
        confirmationId: null,
        confirmationUrl: null,
        submittedAt: null,
        externalDomain: hostname,
        screenshotPath: screenshotPath ?? null,
        failureReason: `External platform reported submission failure: "${explicitFailure}".`,
      };
    }

    // ── Guard: explicit non-confirmation signals ──────────────────────────────
    const nonConfSignal = NON_CONFIRMATION_SIGNALS.find(s => normalizedText.includes(s));
    if (nonConfSignal) {
      return {
        verified: false,
        verificationMethod: null,
        confirmationText: null,
        confirmationId: null,
        confirmationUrl: null,
        submittedAt: null,
        externalDomain: hostname,
        screenshotPath: screenshotPath ?? null,
        failureReason: `Page contains non-confirmation signal: "${nonConfSignal}". Application is NOT submitted.`,
      };
    }


    // ── Check: text-based confirmation signal ─────────────────────────────────
    const matchedSignal = ACCEPTANCE_TEXT_SIGNALS.find(s => normalizedText.includes(s));

    // ── Check: URL-based confirmation pattern (supplementary only) ────────────
    const matchedUrlPattern = CONFIRMATION_URL_PATTERNS.find(p =>
      url.toLowerCase().includes(p)
    );

    // ── Extract confirmation ID from page text ────────────────────────────────
    const confirmationId = extractConfirmationId(text);

    // ── Determine verification result ─────────────────────────────────────────
    if (matchedSignal) {
      // Find the actual sentence containing the signal for confirmationText
      const sentences = text.split(/[.\n!?]+/);
      const matchingSentence = sentences.find(s =>
        s.toLowerCase().includes(matchedSignal)
      )?.trim() ?? matchedSignal;

      return {
        verified: true,
        verificationMethod: confirmationId ? 'confirmation_id' : 'page_text_match',
        confirmationText: matchingSentence.slice(0, 300),
        confirmationId,
        confirmationUrl: url,
        submittedAt: new Date().toISOString(),
        externalDomain: hostname,
        screenshotPath: screenshotPath ?? null,
        failureReason: null,
      };
    }

    if (matchedUrlPattern && confirmationId) {
      // URL pattern + confirmation ID is strong enough
      return {
        verified: true,
        verificationMethod: 'confirmation_id',
        confirmationText: `Confirmation ID detected at ${url}`,
        confirmationId,
        confirmationUrl: url,
        submittedAt: new Date().toISOString(),
        externalDomain: hostname,
        screenshotPath: screenshotPath ?? null,
        failureReason: null,
      };
    }

    // ── No confirmed signal found → EXTERNAL_CONFIRMATION_REQUIRED ────────────
    return {
      verified: false,
      verificationMethod: null,
      confirmationText: null,
      confirmationId: null,
      confirmationUrl: null,
      submittedAt: null,
      externalDomain: hostname || null,
      screenshotPath: screenshotPath ?? null,
      failureReason:
        'No accepted confirmation signal detected on the final page. ' +
        'Please verify the application status on the external ATS manually.',
    };
  }

  /**
   * Re-verifies an application that was previously marked SUBMITTED.
   * If the stored submissionVerification lacks required evidence,
   * this downgrades the status to EXTERNAL_CONFIRMATION_REQUIRED.
   *
   * This is called by the "Re-verify Submission" button flow.
   */
  static reVerify(existing: SubmissionVerification): {
    shouldDowngrade: boolean;
    reason: string;
  } {
    if (!existing.verified) {
      return {
        shouldDowngrade: false, // already not verified
        reason: 'Application is already not marked as SUBMITTED.',
      };
    }

    const issues: string[] = [];

    if (!existing.confirmationText && !existing.confirmationId) {
      issues.push('No confirmation text or ID stored.');
    }

    if (!existing.confirmationUrl) {
      issues.push('No external confirmation URL stored.');
    }

    if (!existing.externalDomain) {
      issues.push('No external ATS domain recorded.');
    }

    if (existing.externalDomain && isJobBoardDomain(`https://${existing.externalDomain}`)) {
      issues.push(`Stored domain "${existing.externalDomain}" is a job board, not an ATS.`);
    }

    if (!existing.verificationMethod) {
      issues.push('No verification method recorded.');
    }

    if (issues.length > 0) {
      return {
        shouldDowngrade: true,
        reason: `Insufficient confirmation evidence: ${issues.join(' ')}`,
      };
    }

    return {
      shouldDowngrade: false,
      reason: 'Existing verification evidence is intact.',
    };
  }

  /**
   * Checks if page text contains explicit external platform failure signals
   */
  static isConfirmedFailure(text: string): boolean {
    const lower = text.toLowerCase();
    return EXPLICIT_FAILURE_SIGNALS.some(s => lower.includes(s));
  }

  /**
   * Evaluates the attempt snapshot and returns the accurate final status:
   *   'SUBMITTED'                      iff verified === true
   *   'SUBMISSION_FAILED'              iff explicit failure signal reported by external ATS
   *   'EXTERNAL_CONFIRMATION_REQUIRED' iff result could not be proven
   */
  static evaluateAttemptResult(snapshot: PageSnapshot, jobApplicationUrl?: string): SubmissionAttemptResult {
    const normalizedText = snapshot.text.toLowerCase();
    const explicitFailure = EXPLICIT_FAILURE_SIGNALS.find(s => normalizedText.includes(s));
    const verification = this.verify(snapshot, jobApplicationUrl);

    if (verification.verified) {
      return {
        finalStatus: 'SUBMITTED',
        submissionVerification: verification,
        message: 'Application successfully completed and verified by external platform.',
      };
    }

    if (explicitFailure) {
      return {
        finalStatus: 'SUBMISSION_FAILED',
        submissionVerification: verification,
        message: verification.failureReason || `External ATS confirmed failure: ${explicitFailure}`,
      };
    }

    return {
      finalStatus: 'EXTERNAL_CONFIRMATION_REQUIRED',
      submissionVerification: verification,
      message: verification.failureReason || 'Automated submit clicked, but confirmation proof was not detected.',
    };
  }

  /**
   * Returns a human-readable label for an ATS domain.
   */
  static getAtsLabel(url: string): string {
    return getAtsName(url) ?? extractHostname(url) ?? 'External ATS';
  }
}

