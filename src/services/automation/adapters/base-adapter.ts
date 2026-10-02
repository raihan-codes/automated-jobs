import { RawDetectedField } from '../candidate-mapper';
import { SupportedATSPlatform, CaptchaDetectionResult } from '../types';

export interface SubmissionControlInfo {
  submitButtonSelector: string;
  isMultiStep: boolean;
  nextStepSelector?: string;
  currentStep?: number;
  totalSteps?: number;
}

export interface BaseATSAdapter {
  platform: SupportedATSPlatform;
  platformName: string;

  /**
   * Evaluates if this adapter handles the target URL or HTML markup
   */
  canHandle(url: string, html?: string): boolean;

  /**
   * Discovers and extracts all form fields from HTML or page context
   */
  extractFields(htmlOrPage: string | any): Promise<RawDetectedField[]> | RawDetectedField[];

  /**
   * Detects submission and step controls
   */
  detectSubmissionControls(htmlOrPage: string | any): SubmissionControlInfo;

  /**
   * Checks whether the page displays unequivocal confirmation of submission
   */
  detectConfirmation(
    url: string,
    pageText: string,
    html: string
  ): { verified: boolean; confirmationId: string | null; confirmationText: string | null };
}
