import { BaseATSAdapter, SubmissionControlInfo } from './base-adapter';
import { RawDetectedField } from '../candidate-mapper';
import { SupportedATSPlatform } from '../types';

export class SmartRecruitersAdapter implements BaseATSAdapter {
  public platform: SupportedATSPlatform = 'SMARTRECRUITERS';
  public platformName = 'SmartRecruiters ATS';

  public canHandle(url: string, html?: string): boolean {
    return /smartrecruiters\.com/i.test(url) || (html ? /smartrecruiters/i.test(html) : false);
  }

  public extractFields(htmlOrPage: string | any): RawDetectedField[] {
    return [
      { id: 'firstName', name: 'firstName', label: 'First Name', type: 'text', isRequired: true, selector: 'input[name="firstName"]' },
      { id: 'lastName', name: 'lastName', label: 'Last Name', type: 'text', isRequired: true, selector: 'input[name="lastName"]' },
      { id: 'email', name: 'email', label: 'Email', type: 'email', isRequired: true, selector: 'input[name="email"]' },
      { id: 'phoneNumber', name: 'phoneNumber', label: 'Phone Number', type: 'tel', isRequired: true, selector: 'input[name="phoneNumber"]' },
      { id: 'resume', name: 'resume', label: 'Resume', type: 'file', isRequired: true, selector: 'input[type="file"]' }
    ];
  }

  public detectSubmissionControls(htmlOrPage: string | any): SubmissionControlInfo {
    return {
      submitButtonSelector: 'button[data-test="apply-button"], button[type="submit"]',
      isMultiStep: false
    };
  }

  public detectConfirmation(
    url: string,
    pageText: string,
    html: string
  ): { verified: boolean; confirmationId: string | null; confirmationText: string | null } {
    const textLower = pageText.toLowerCase();
    if (textLower.includes('thank you for applying') || textLower.includes('application submitted')) {
      return { verified: true, confirmationId: null, confirmationText: 'application submitted' };
    }
    return { verified: false, confirmationId: null, confirmationText: null };
  }
}
