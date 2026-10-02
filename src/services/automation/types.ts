// Automation, Platform & Field Classifier Types
import { ApplicationFormField, SubmissionVerification, ApplicationStatus } from '../../types';

export type SupportedATSPlatform =
  | 'GREENHOUSE'
  | 'LEVER'
  | 'WORKABLE'
  | 'ASHBY'
  | 'SMARTRECRUITERS'
  | 'ADZUNA'
  | 'GENERIC_ATS';

export interface CaptchaDetectionResult {
  detected: boolean;
  type: 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'cloudflare_turnstile' | 'aws_waf' | 'unknown' | null;
  selector?: string;
  message?: string;
}

export interface SecurityChallengeResult {
  captcha: CaptchaDetectionResult;
  loginRequired: boolean;
  loginMessage?: string;
  mfaRequired: boolean;
  mfaMessage?: string;
}

export interface PlatformDetectionResult {
  platform: SupportedATSPlatform;
  platformName: string;
  confidence: number;
  formSelector: string;
  finalUrl: string;
  redirectChain: string[];
  isMultiStep: boolean;
  currentStep?: number;
  totalSteps?: number;
  captcha: CaptchaDetectionResult;
  loginRequired: boolean;
  mfaDetected: boolean;
}

export interface FormInspectionResult {
  formUrl: string;
  platform: SupportedATSPlatform;
  platformName: string;
  fields: ApplicationFormField[];
  sensitiveFields: ApplicationFormField[];
  missingRequiredFields: ApplicationFormField[];
  unansweredFields: ApplicationFormField[];
  requiresHumanInput: boolean;
  captcha: CaptchaDetectionResult;
  loginRequired: boolean;
  mfaRequired: boolean;
  isMultiStep: boolean;
  currentStep?: number;
  totalSteps?: number;
  hasConditionalFields?: boolean;
  screenshotUrl?: string;
}

export interface AutomationExecutionResult {
  id?: string;
  success: boolean;
  /**
   * State machine status returned by preparation or fill step:
   * DISCOVERED | RESUME_READY | APPLICATION_DETECTED | FILLING_FORM |
   * USER_INPUT_REQUIRED | CAPTCHA_REQUIRED | AWAITING_USER_APPROVAL |
   * READY_TO_SUBMIT | SUBMITTING | SUBMITTED | SUBMISSION_FAILED |
   * EXTERNAL_CONFIRMATION_REQUIRED
   */
  status: ApplicationStatus | 'FAILED';
  fields: ApplicationFormField[];
  hasSensitiveQuestions: boolean;
  missingRequiredFields?: ApplicationFormField[];
  captchaDetected?: boolean;
  captchaType?: string | null;
  loginRequired?: boolean;
  mfaRequired?: boolean;
  platform?: SupportedATSPlatform;
  humanReviewNotes?: string;
  screenshotSnapshot?: string;
  isMultiStep?: boolean;
  currentStep?: number;
  totalSteps?: number;
  error?: string;
}

/**
 * Result of the external ATS submission attempt.
 * This drives the final application status.
 *
 * RULE: applicationStatus = "SUBMITTED"  iff  submissionVerification.verified === true
 */
export interface SubmissionAttemptResult {
  /**
   * Final status after verifying with external ATS.
   * Possible values:
   *   'SUBMITTED'                      — confirmed externally, verified = true
   *   'SUBMISSION_FAILED'              — ATS returned error / blocked / validation failure
   *   'EXTERNAL_CONFIRMATION_REQUIRED' — could not detect unequivocal confirmation
   *   'CAPTCHA_REQUIRED'               — CAPTCHA blocked submission
   */
  finalStatus: 'SUBMITTED' | 'SUBMISSION_FAILED' | 'EXTERNAL_CONFIRMATION_REQUIRED' | 'CAPTCHA_REQUIRED';
  submissionVerification: SubmissionVerification;
  /** Human-readable message for notification / UI */
  message: string;
}

