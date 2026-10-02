import { BaseATSAdapter, SubmissionControlInfo } from './base-adapter';
import { RawDetectedField } from '../candidate-mapper';
import { SupportedATSPlatform } from '../types';

export class AshbyAdapter implements BaseATSAdapter {
  public platform: SupportedATSPlatform = 'ASHBY';
  public platformName = 'Ashby ATS';

  public canHandle(url: string, html?: string): boolean {
    return /ashbyhq\.com|jobs\.ashby/i.test(url) || (html ? /ashbyhq/i.test(html) : false);
  }

  public extractFields(htmlOrPage: string | any): RawDetectedField[] {
    return [
      { id: 'name', name: 'name', label: 'Full Name', type: 'text', isRequired: true, selector: 'input[name="name"]' },
      { id: 'email', name: 'email', label: 'Email', type: 'email', isRequired: true, selector: 'input[name="email"]' },
      { id: 'phone', name: 'phone', label: 'Phone', type: 'tel', isRequired: true, selector: 'input[name="phoneNumber"]' },
      { id: 'resume', name: 'resume', label: 'Resume', type: 'file', isRequired: true, selector: 'input[type="file"]' }
    ];
  }

  public detectSubmissionControls(htmlOrPage: string | any): SubmissionControlInfo {
    return {
      submitButtonSelector: 'button[type="submit"], button:has-text("Submit Application")',
      isMultiStep: false
    };
  }

  public detectConfirmation(
    url: string,
    pageText: string,
    html: string
  ): { verified: boolean; confirmationId: string | null; confirmationText: string | null } {
    const textLower = pageText.toLowerCase();
    if (textLower.includes('application submitted') || textLower.includes('thank you for applying')) {
      return { verified: true, confirmationId: null, confirmationText: 'application submitted' };
    }
    return { verified: false, confirmationId: null, confirmationText: null };
  }
}
