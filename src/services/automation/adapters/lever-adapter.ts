import { BaseATSAdapter, SubmissionControlInfo } from './base-adapter';
import { RawDetectedField } from '../candidate-mapper';
import { SupportedATSPlatform } from '../types';

export class LeverAdapter implements BaseATSAdapter {
  public platform: SupportedATSPlatform = 'LEVER';
  public platformName = 'Lever ATS';

  public canHandle(url: string, html?: string): boolean {
    return /lever\.co|jobs\.lever/i.test(url) || (html ? /lever\.co/i.test(html) : false);
  }

  public extractFields(htmlOrPage: string | any): RawDetectedField[] {
    return [
      { id: 'name', name: 'name', label: 'Full Name', type: 'text', isRequired: true, selector: 'input[name="name"]' },
      { id: 'email', name: 'email', label: 'Email', type: 'email', isRequired: true, selector: 'input[name="email"]' },
      { id: 'phone', name: 'phone', label: 'Phone', type: 'tel', isRequired: true, selector: 'input[name="phone"]' },
      { id: 'org', name: 'org', label: 'Current Company', type: 'text', isRequired: false, selector: 'input[name="org"]' },
      { id: 'urls[LinkedIn]', name: 'urls[LinkedIn]', label: 'LinkedIn URL', type: 'text', isRequired: false, selector: 'input[name="urls[LinkedIn]"]' },
      { id: 'urls[GitHub]', name: 'urls[GitHub]', label: 'GitHub URL', type: 'text', isRequired: false, selector: 'input[name="urls[GitHub]"]' },
      { id: 'urls[Portfolio]', name: 'urls[Portfolio]', label: 'Portfolio URL', type: 'text', isRequired: false, selector: 'input[name="urls[Portfolio]"]' },
      { id: 'resume', name: 'resume', label: 'Resume/CV', type: 'file', isRequired: true, selector: 'input[name="resume"]' },
      { id: 'comments', name: 'comments', label: 'Additional Information', type: 'textarea', isRequired: false, selector: 'textarea[name="comments"]' }
    ];
  }

  public detectSubmissionControls(htmlOrPage: string | any): SubmissionControlInfo {
    return {
      submitButtonSelector: 'button#btn-submit, button[type="submit"].template-btn-submit',
      isMultiStep: false
    };
  }

  public detectConfirmation(
    url: string,
    pageText: string,
    html: string
  ): { verified: boolean; confirmationId: string | null; confirmationText: string | null } {
    const textLower = pageText.toLowerCase();
    const isThanks = /lever\.co\/.*\/thanks/i.test(url);
    const phrases = ['thank you for submitting', 'application submitted', 'we have received your application'];

    for (const p of phrases) {
      if (textLower.includes(p) || isThanks) {
        return {
          verified: true,
          confirmationId: null,
          confirmationText: p
        };
      }
    }

    return { verified: false, confirmationId: null, confirmationText: null };
  }
}
