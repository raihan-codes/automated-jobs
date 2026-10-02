/**
 * CAPTCHA & Anti-Bot Challenge Detection Engine
 *
 * CRITICAL SAFETY RULES (NEVER VIOLATE):
 * 1. DO NOT attempt to bypass CAPTCHA.
 * 2. DO NOT attempt to solve it programmatically.
 * 3. DO NOT fake a successful CAPTCHA completion.
 * 4. STOP and pause the Playwright automation when detected.
 * 5. Require manual completion by the human user.
 * 6. Never mark an application as SUBMITTED merely because CAPTCHA was solved.
 */

import { CaptchaDetectionResult } from './types';

export class CaptchaDetector {
  /**
   * Known CAPTCHA DOM selectors across web application forms
   */
  private static CAPTCHA_SELECTORS = [
    // Google reCAPTCHA
    'iframe[src*="google.com/recaptcha"]',
    'iframe[src*="recaptcha/api2"]',
    'iframe[title*="reCAPTCHA"]',
    '.g-recaptcha',
    '#g-recaptcha',
    '[data-sitekey]',
    '#g-recaptcha-response',
    
    // hCaptcha
    'iframe[src*="hcaptcha.com"]',
    'iframe[title*="hCaptcha"]',
    '.h-captcha',
    '[data-hcaptcha-widget-id]',
    
    // Cloudflare Turnstile / Challenges
    'iframe[src*="challenges.cloudflare.com"]',
    '.cf-turnstile',
    '#cf-turnstile',
    '[name="cf-turnstile-response"]',
    '#challenge-stage',
    '#cf-challenge-running',
    
    // AWS WAF Captcha
    '#aws-waf-captcha',
    'iframe[src*="awswaf"]',
    
    // Geetest & Arkose
    '.geetest_holder',
    'iframe[src*="arkoselabs"]'
  ];

  /**
   * Keywords indicating anti-bot or human challenge in page text/headings
   */
  private static CHALLENGE_TEXT_PATTERNS = [
    /i'm not a robot/i,
    /recaptcha/i,
    /hcaptcha/i,
    /security check.*verify/i,
    /verify you are human/i,
    /confirm you are not a bot/i,
    /please complete the security check/i,
    /cloudflare.*challenge/i,
    /unusual traffic from your network/i,
    /bot verification/i
  ];

  /**
   * Inspects HTML content or DOM text for anti-bot / CAPTCHA signals
   */
  public static detectInHtmlOrText(
    html: string,
    text: string
  ): CaptchaDetectionResult {
    // 1. Check for Cloudflare Turnstile
    if (
      html.includes('challenges.cloudflare.com') ||
      html.includes('cf-turnstile') ||
      html.includes('cf-challenge')
    ) {
      return {
        detected: true,
        type: 'cloudflare_turnstile',
        selector: '.cf-turnstile, iframe[src*="cloudflare.com"]',
        message: 'Cloudflare Turnstile challenge detected. Please complete it manually to continue.'
      };
    }

    // 2. Check for hCaptcha
    if (html.includes('hcaptcha.com') || html.includes('h-captcha') || html.includes('hcaptcha')) {
      return {
        detected: true,
        type: 'hcaptcha',
        selector: '.h-captcha, iframe[src*="hcaptcha.com"]',
        message: 'hCaptcha verification detected. Please complete it manually to continue.'
      };
    }

    // 3. Check for Google reCAPTCHA
    if (
      html.includes('google.com/recaptcha') ||
      html.includes('g-recaptcha') ||
      html.includes('recaptcha/api') ||
      html.includes('recaptcha') ||
      /g-recaptcha-response/i.test(html) ||
      (/data-sitekey/i.test(html) && !html.includes('h-captcha') && !html.includes('cf-turnstile'))
    ) {
      return {
        detected: true,
        type: 'recaptcha_v2',
        selector: '.g-recaptcha, iframe[src*="recaptcha"]',
        message: 'Google reCAPTCHA detected. Please complete the CAPTCHA manually to continue.'
      };
    }

    // 4. Check for AWS WAF Captcha
    if (html.includes('aws-waf-captcha') || html.includes('awswaf')) {
      return {
        detected: true,
        type: 'aws_waf',
        selector: '#aws-waf-captcha',
        message: 'AWS WAF CAPTCHA detected. Please complete it manually to continue.'
      };
    }

    // 5. Inspect visible text patterns
    for (const pattern of this.CHALLENGE_TEXT_PATTERNS) {
      if (pattern.test(text)) {
        return {
          detected: true,
          type: 'unknown',
          message: 'Security challenge / anti-bot verification detected. Please complete it manually to continue.'
        };
      }
    }

    return {
      detected: false,
      type: null
    };
  }

  /**
   * Playwright Page inspection (when real browser page is active)
   */
  public static async detectInPlaywrightPage(page: any): Promise<CaptchaDetectionResult> {
    try {
      for (const sel of this.CAPTCHA_SELECTORS) {
        const el = await page.$(sel).catch(() => null);
        if (el) {
          const isVisible = await el.isVisible().catch(() => true);
          if (isVisible) {
            let type: CaptchaDetectionResult['type'] = 'unknown';
            if (sel.includes('cloudflare')) type = 'cloudflare_turnstile';
            else if (sel.includes('recaptcha') || sel.includes('sitekey')) type = 'recaptcha_v2';
            else if (sel.includes('hcaptcha')) type = 'hcaptcha';
            else if (sel.includes('awswaf')) type = 'aws_waf';

            return {
              detected: true,
              type,
              selector: sel,
              message: 'CAPTCHA detected on application page. Please complete the CAPTCHA manually to continue.'
            };
          }
        }
      }

      // Check text in body
      const bodyText = await page.innerText('body').catch(() => '');
      for (const pattern of this.CHALLENGE_TEXT_PATTERNS) {
        if (pattern.test(bodyText)) {
          return {
            detected: true,
            type: 'unknown',
            message: 'CAPTCHA / anti-bot challenge detected. Please complete it manually to continue.'
          };
        }
      }
    } catch {
      // In case of execution timeout
    }

    return {
      detected: false,
      type: null
    };
  }

  /**
   * Detects if the page requires candidate authentication / account login
   */
  public static detectLoginRequired(html: string = '', text: string = ''): { detected: boolean; message?: string } {
    const combined = `${html} ${text}`.toLowerCase();
    const loginPatterns = [
      /sign in to apply/i,
      /log in to apply/i,
      /please log in/i,
      /create an account or log in/i,
      /account required to apply/i,
      /already have an account\? sign in/i,
      /enter your password/i,
      /<input[^>]*type=["']password["']/i
    ];

    for (const pattern of loginPatterns) {
      if (pattern.test(combined)) {
        return {
          detected: true,
          message: 'Employer application portal requires account login. Please log in manually to proceed.'
        };
      }
    }

    return { detected: false };
  }

  /**
   * Detects Multi-Factor Authentication (MFA / 2FA / OTP) challenges
   */
  public static detectMfa(html: string = '', text: string = ''): { detected: boolean; message?: string } {
    const combined = `${html} ${text}`.toLowerCase();
    const mfaPatterns = [
      /two-factor/i,
      /\b2fa\b/i,
      /multi-factor/i,
      /verification code.*sent/i,
      /enter the 6-digit code/i,
      /enter verification code/i,
      /one-time password/i,
      /\botp\b/i,
      /authenticator app/i,
      /security code sent to your (phone|email)/i
    ];

    for (const pattern of mfaPatterns) {
      if (pattern.test(combined)) {
        return {
          detected: true,
          message: 'Multi-Factor Authentication (MFA / OTP) verification requested. Please enter your code manually.'
        };
      }
    }

    return { detected: false };
  }
}

