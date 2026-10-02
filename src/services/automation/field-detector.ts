/**
 * Universal Form Detection & Inspection Engine
 *
 * Inspects any target web application page and extracts:
 * - platform / ATS type
 * - visible input controls (text, textarea, number, date, select, radio, checkbox, file)
 * - required vs optional flags
 * - multi-step navigation controls
 * - CAPTCHA / anti-bot challenges
 * - maps detected fields to candidate verified profile
 */

import {
  CandidateProfileData,
  ApplicationFormField,
  TailoredResumeContent,
  NormalizedJobPosting
} from '../../types';
import { AdapterRegistry } from './adapters';
import { CaptchaDetector } from './captcha-detector';
import { CandidateMapper, RawDetectedField } from './candidate-mapper';
import { FormInspectionResult, SupportedATSPlatform } from './types';

export class FieldDetector {
  /**
   * Universal inspection of a job application page from HTML content and URL
   */
  public static async inspectForm(
    url: string,
    html: string = '',
    profile: CandidateProfileData,
    tailoredResume?: TailoredResumeContent,
    job?: NormalizedJobPosting
  ): Promise<FormInspectionResult> {
    const adapter = AdapterRegistry.getAdapterForUrl(url, html);
    const captcha = CaptchaDetector.detectInHtmlOrText(html, html);
    const login = CaptchaDetector.detectLoginRequired(html, html);
    const mfa = CaptchaDetector.detectMfa(html, html);
    const controls = adapter.detectSubmissionControls(html);

    // Multi-step detection
    const isMultiStep = controls.isMultiStep ||
      /step\s*\d+\s*of\s*\d+/i.test(html) ||
      /progress[-_]step|steps[-_]indicator/i.test(html) ||
      /\b(next\s*step|continue\s*to\s*step|step\s*2)\b/i.test(html);

    let currentStep = controls.currentStep || 1;
    let totalSteps = controls.totalSteps || (isMultiStep ? 2 : 1);
    const stepMatch = html.match(/step\s*(\d+)\s*(?:of|\/)\s*(\d+)/i);
    if (stepMatch) {
      currentStep = parseInt(stepMatch[1], 10);
      totalSteps = parseInt(stepMatch[2], 10);
    }

    // Conditional fields detection
    const hasConditionalFields = /data-conditional|data-depends-on|conditional[-_]field|style=["']display:\s*none["']/i.test(html);

    // 1. Extract raw fields from adapter
    let rawFields: RawDetectedField[] = await adapter.extractFields(html);

    // If HTML contains additional fields not in adapter's list, merge dynamic fields
    if (html && (html.includes('<input') || html.includes('<select') || html.includes('<textarea'))) {
      const genericAdapter = AdapterRegistry.getAdapterForUrl('https://generic.portal', html);
      const dynamicFields = await genericAdapter.extractFields(html);
      for (const df of dynamicFields) {
        const key = (df.name || df.id || '').toLowerCase();
        const exists = rawFields.some(rf => (rf.name || rf.id || '').toLowerCase() === key);
        if (!exists && key) {
          rawFields.push(df);
        }
      }
    }

    // 2. Map raw fields to candidate profile as single source of truth
    const mappedFields: ApplicationFormField[] = CandidateMapper.mapDetectedFieldsToProfile(
      rawFields,
      profile,
      tailoredResume,
      job
    );

    // 3. Partition fields for human governance
    const sensitiveFields = mappedFields.filter(f => f.isSensitive || f.status === 'SENSITIVE_REVIEW_REQUIRED');
    const missingRequiredFields = mappedFields.filter(f => f.status === 'USER_INPUT_REQUIRED' && f.isRequired);
    const unansweredFields = mappedFields.filter(f => !f.fieldValue || f.fieldValue.trim() === '');

    const requiresHumanInput =
      missingRequiredFields.length > 0 ||
      sensitiveFields.length > 0 ||
      captcha.detected ||
      login.detected ||
      mfa.detected;

    return {
      formUrl: url,
      platform: adapter.platform,
      platformName: adapter.platformName,
      fields: mappedFields,
      sensitiveFields,
      missingRequiredFields,
      unansweredFields,
      requiresHumanInput,
      captcha,
      loginRequired: login.detected,
      mfaRequired: mfa.detected,
      isMultiStep,
      currentStep,
      totalSteps,
      hasConditionalFields
    };
  }


  /**
   * Direct Playwright Page inspection (when browser session is active)
   */
  public static async inspectPlaywrightPage(
    page: any,
    profile: CandidateProfileData,
    tailoredResume?: TailoredResumeContent,
    job?: NormalizedJobPosting
  ): Promise<FormInspectionResult> {
    const url = page.url();
    const html = await page.content().catch(() => '');
    const adapter = AdapterRegistry.getAdapterForUrl(url, html);
    const captcha = await CaptchaDetector.detectInPlaywrightPage(page);

    // Extract dynamic DOM elements from active page
    let rawFields: RawDetectedField[] = [];
    try {
      rawFields = await page.evaluate(() => {
        const results: any[] = [];
        const inputs = Array.from(document.querySelectorAll('input, select, textarea'));

        for (const el of inputs) {
          const tag = el.tagName.toLowerCase();
          const type = (el.getAttribute('type') || (tag === 'textarea' ? 'textarea' : (tag === 'select' ? 'select' : 'text'))).toLowerCase();

          if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) continue;

          const id = el.id || '';
          const name = el.getAttribute('name') || '';
          const placeholder = el.getAttribute('placeholder') || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          const isRequired = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';

          let label = ariaLabel || placeholder || '';
          if (id) {
            const labelEl = document.querySelector(`label[for="${id}"]`);
            if (labelEl) label = labelEl.textContent?.trim() || label;
          }
          if (!label) {
            const parentLabel = el.closest('label');
            if (parentLabel) label = parentLabel.textContent?.trim() || label;
          }

          let options: string[] | undefined = undefined;
          if (tag === 'select') {
            options = Array.from((el as HTMLSelectElement).options)
              .map(o => o.text.trim())
              .filter(t => t && !/select|choose/i.test(t));
          }

          results.push({
            id,
            name,
            label: label || name || id || 'Input',
            placeholder,
            ariaLabel,
            type,
            isRequired,
            options,
            selector: id ? `#${id}` : (name ? `${tag}[name="${name}"]` : undefined)
          });
        }
        return results;
      });
    } catch {
      rawFields = await adapter.extractFields(html);
    }

    if (rawFields.length === 0) {
      rawFields = await adapter.extractFields(html);
    }

    const mappedFields = CandidateMapper.mapDetectedFieldsToProfile(
      rawFields,
      profile,
      tailoredResume,
      job
    );

    const sensitiveFields = mappedFields.filter(f => f.isSensitive || f.status === 'SENSITIVE_REVIEW_REQUIRED');
    const missingRequiredFields = mappedFields.filter(f => f.status === 'USER_INPUT_REQUIRED' && f.isRequired);
    const unansweredFields = mappedFields.filter(f => !f.fieldValue || f.fieldValue.trim() === '');
    const controls = adapter.detectSubmissionControls(html);

    const login = CaptchaDetector.detectLoginRequired(html, html);
    const mfa = CaptchaDetector.detectMfa(html, html);
    const isMultiStep = controls.isMultiStep ||
      /step\s*\d+\s*of\s*\d+/i.test(html) ||
      /\b(next\s*step|continue\s*to\s*step)\b/i.test(html);

    let currentStep = controls.currentStep || 1;
    let totalSteps = controls.totalSteps || (isMultiStep ? 2 : 1);
    const stepMatch = html.match(/step\s*(\d+)\s*(?:of|\/)\s*(\d+)/i);
    if (stepMatch) {
      currentStep = parseInt(stepMatch[1], 10);
      totalSteps = parseInt(stepMatch[2], 10);
    }

    return {
      formUrl: url,
      platform: adapter.platform,
      platformName: adapter.platformName,
      fields: mappedFields,
      sensitiveFields,
      missingRequiredFields,
      unansweredFields,
      requiresHumanInput: missingRequiredFields.length > 0 || sensitiveFields.length > 0 || captcha.detected || login.detected || mfa.detected,
      captcha,
      loginRequired: login.detected,
      mfaRequired: mfa.detected,
      isMultiStep,
      currentStep,
      totalSteps
    };
  }
}

