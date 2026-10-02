import { BaseATSAdapter, SubmissionControlInfo } from './base-adapter';
import { RawDetectedField } from '../candidate-mapper';
import { SupportedATSPlatform } from '../types';

export class GreenhouseAdapter implements BaseATSAdapter {
  public platform: SupportedATSPlatform = 'GREENHOUSE';
  public platformName = 'Greenhouse ATS';

  public canHandle(url: string, html?: string): boolean {
    return /greenhouse\.io|boards\.greenhouse/i.test(url) || (html ? /greenhouse/i.test(html) : false);
  }

  public extractFields(htmlOrPage: string | any): RawDetectedField[] {
    return [
      { id: 'first_name', name: 'first_name', label: 'First Name', type: 'text', isRequired: true, selector: '#first_name' },
      { id: 'last_name', name: 'last_name', label: 'Last Name', type: 'text', isRequired: true, selector: '#last_name' },
      { id: 'email', name: 'email', label: 'Email', type: 'email', isRequired: true, selector: '#email' },
      { id: 'phone', name: 'phone', label: 'Phone', type: 'tel', isRequired: true, selector: '#phone' },
      { id: 'resume', name: 'resume', label: 'Resume/CV', type: 'file', isRequired: true, selector: 'input[data-qa="resume-upload"], input#resume' },
      { id: 'linkedin', name: 'job_application[answers_attributes][0][text_value]', label: 'LinkedIn Profile', type: 'text', isRequired: false, selector: 'input[autocomplete="custom-question-linkedin"]' },
      { id: 'website', name: 'job_application[answers_attributes][1][text_value]', label: 'Website / Portfolio', type: 'text', isRequired: false, selector: 'input[autocomplete="custom-question-website"]' }
    ];
  }

  public detectSubmissionControls(htmlOrPage: string | any): SubmissionControlInfo {
    return {
      submitButtonSelector: '#submit_app, button[data-qa="submit-app"], input[type="submit"]',
      isMultiStep: false
    };
  }

  public detectConfirmation(
    url: string,
    pageText: string,
    html: string
  ): { verified: boolean; confirmationId: string | null; confirmationText: string | null } {
    const textLower = pageText.toLowerCase();
    const isConfirmationUrl = /greenhouse\.io\/.*(?:\/confirmation|\/thanks)/i.test(url);
    const phrases = ['thank you for applying', 'application submitted', 'we have received your application'];

    for (const p of phrases) {
      if (textLower.includes(p) || isConfirmationUrl) {
        const idMatch = pageText.match(/application\s*(?:id|#)\s*([A-Z0-9-]{6,12})/i);
        return {
          verified: true,
          confirmationId: idMatch ? idMatch[1] : null,
          confirmationText: p
        };
      }
    }

    return { verified: false, confirmationId: null, confirmationText: null };
  }
}
