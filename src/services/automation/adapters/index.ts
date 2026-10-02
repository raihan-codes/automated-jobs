import { BaseATSAdapter } from './base-adapter';
import { AdzunaAdapter } from './adzuna-adapter';
import { GreenhouseAdapter } from './greenhouse-adapter';
import { LeverAdapter } from './lever-adapter';
import { WorkableAdapter } from './workable-adapter';
import { AshbyAdapter } from './ashby-adapter';
import { SmartRecruitersAdapter } from './smartrecruiters-adapter';
import { GenericATSAdapter } from './generic-adapter';
import { CaptchaDetector } from '../captcha-detector';
import { PlatformDetectionResult, SupportedATSPlatform } from '../types';

export class AdapterRegistry {
  private static adapters: BaseATSAdapter[] = [
    new AdzunaAdapter(),
    new GreenhouseAdapter(),
    new LeverAdapter(),
    new WorkableAdapter(),
    new AshbyAdapter(),
    new SmartRecruitersAdapter(),
  ];

  private static genericAdapter = new GenericATSAdapter();

  /**
   * Discovers and selects the best matching ATS adapter, or falls back to GenericATSAdapter
   */
  public static getAdapterForUrl(url: string, html?: string): BaseATSAdapter {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(url, html)) {
        return adapter;
      }
    }
    return this.genericAdapter;
  }

  /**
   * Resolves redirect chains from job aggregators (Adzuna/Indeed) to the final employer ATS
   */
  public static resolveRedirectChain(url: string, html: string = ''): { finalUrl: string; redirectChain: string[] } {
    const chain: string[] = [url];
    let currentUrl = url;

    // 1. Check URL query parameters for embedded target URL
    try {
      const parsed = new URL(url);
      const targetParam =
        parsed.searchParams.get('url') ||
        parsed.searchParams.get('target') ||
        parsed.searchParams.get('redirect_url') ||
        parsed.searchParams.get('dest');
      if (targetParam && /^https?:\/\//i.test(targetParam)) {
        currentUrl = targetParam;
        chain.push(currentUrl);
      }
    } catch {}

    // 2. Check HTML for meta refresh or direct external ATS links
    if (html) {
      const metaRefresh = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i);
      if (metaRefresh && metaRefresh[1]) {
        currentUrl = metaRefresh[1].trim();
        chain.push(currentUrl);
      } else {
        const atsLinkMatch = html.match(
          /<a[^>]*href=["'](https?:\/\/(?:boards\.greenhouse\.io|jobs\.lever\.co|apply\.workable\.com|jobs\.ashbyhq\.com|smartrecruiters\.com|[^"']+\.workday\.com)[^"']*)["']/i
        );
        if (atsLinkMatch && atsLinkMatch[1]) {
          currentUrl = atsLinkMatch[1].trim();
          chain.push(currentUrl);
        }
      }
    }

    return { finalUrl: currentUrl, redirectChain: chain };
  }

  /**
   * Performs full platform detection including CAPTCHA, multi-step structure, and redirect resolution
   */
  public static detectPlatform(url: string, html: string = ''): PlatformDetectionResult {
    const { finalUrl, redirectChain } = this.resolveRedirectChain(url, html);
    const adapter = this.getAdapterForUrl(finalUrl, html);
    const captcha = CaptchaDetector.detectInHtmlOrText(html, html);
    const login = CaptchaDetector.detectLoginRequired(html, html);
    const mfa = CaptchaDetector.detectMfa(html, html);
    const controls = adapter.detectSubmissionControls(html);

    return {
      platform: adapter.platform,
      platformName: adapter.platformName,
      confidence: adapter.platform === 'GENERIC_ATS' ? 0.7 : 0.98,
      formSelector: controls.submitButtonSelector,
      finalUrl,
      redirectChain,
      isMultiStep: controls.isMultiStep,
      currentStep: controls.currentStep || 1,
      totalSteps: controls.totalSteps || (controls.isMultiStep ? 2 : 1),
      captcha,
      loginRequired: login.detected,
      mfaDetected: mfa.detected
    };
  }
}


export * from './base-adapter';
export * from './adzuna-adapter';
export * from './greenhouse-adapter';
export * from './lever-adapter';
export * from './workable-adapter';
export * from './ashby-adapter';
export * from './smartrecruiters-adapter';
export * from './generic-adapter';
