import { BaseATSAdapter, SubmissionControlInfo } from './base-adapter';
import { RawDetectedField } from '../candidate-mapper';
import { SupportedATSPlatform } from '../types';

export class WorkableAdapter implements BaseATSAdapter {
  public platform: SupportedATSPlatform = 'WORKABLE';
  public platformName = 'Workable ATS';

  public canHandle(url: string, html?: string): boolean {
    return /workable\.com|apply\.workable/i.test(url) || (html ? /workable/i.test(html) : false);
  }

  public extractFields(htmlOrPage: string | any): RawDetectedField[] {
    return [
      { id: 'firstname', name: 'firstname', label: 'First Name', type: 'text', isRequired: true, selector: 'input[data-ui="firstname"]' },
      { id: 'lastname', name: 'lastname', label: 'Last Name', type: 'text', isRequired: true, selector: 'input[data-ui="lastname"]' },
      { id: 'email', name: 'email', label: 'Email', type: 'email', isRequired: true, selector: 'input[data-ui="email"]' },
      { id: 'phone', name: 'phone', label: 'Phone', type: 'tel', isRequired: true, selector: 'input[data-ui="phone"]' },
      { id: 'resume', name: 'resume', label: 'Resume', type: 'file', isRequired: true, selector: 'input[data-ui="resume"]' },
      { id: 'address', name: 'address', label: 'Address', type: 'text', isRequired: false, selector: 'input[data-ui="address"]' }
    ];
  }

  public detectSubmissionControls(htmlOrPage: string | any): SubmissionControlInfo {
    return {
      submitButtonSelector: 'button[data-ui="submit-application"], button[type="submit"]',
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
