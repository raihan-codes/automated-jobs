import { BaseATSAdapter, SubmissionControlInfo } from './base-adapter';
import { RawDetectedField } from '../candidate-mapper';
import { SupportedATSPlatform } from '../types';

export class AdzunaAdapter implements BaseATSAdapter {
  public platform: SupportedATSPlatform = 'ADZUNA';
  public platformName = 'Adzuna Application Portal';

  public canHandle(url: string, html?: string): boolean {
    const isUrl = /adzuna\.(?:com|in|co\.uk|ca|com\.au)/i.test(url);
    const isHtml = html ? /adzuna/i.test(html) : false;
    return isUrl || isHtml;
  }

  public extractFields(htmlOrPage: string | any): RawDetectedField[] {
    // If HTML string is supplied or standard Adzuna form structure
    return [
      {
        id: 'first_name',
        name: 'first_name',
        label: 'First Name',
        placeholder: 'e.g. Alex',
        type: 'text',
        isRequired: true,
        selector: 'input#first_name, input[name="first_name"]'
      },
      {
        id: 'last_name',
        name: 'last_name',
        label: 'Last Name',
        placeholder: 'e.g. Chen',
        type: 'text',
        isRequired: true,
        selector: 'input#last_name, input[name="last_name"]'
      },
      {
        id: 'email',
        name: 'email',
        label: 'Email Address',
        placeholder: 'alex.chen@example.com',
        type: 'email',
        isRequired: true,
        selector: 'input#email, input[name="email"], input[type="email"]'
      },
      {
        id: 'phone',
        name: 'phone',
        label: 'Mobile Phone Number',
        placeholder: '+91 98765 43210',
        type: 'tel',
        isRequired: true,
        selector: 'input#phone, input[name="phone"], input[type="tel"]'
      },
      {
        id: 'address',
        name: 'address',
        label: 'Current City & Location',
        placeholder: 'e.g. Bengaluru, Karnataka',
        type: 'text',
        isRequired: true,
        selector: 'input#address, input[name="location"], input[name="city"]'
      },
      {
        id: 'current_ctc',
        name: 'current_ctc',
        label: 'Current Annual CTC (INR)',
        placeholder: 'e.g. ₹18,00,000',
        type: 'text',
        isRequired: false,
        selector: 'input#current_ctc, input[name="current_ctc"]',
        helperText: 'Sensitive compensation field — requires user confirmation.'
      },
      {
        id: 'expected_ctc',
        name: 'expected_ctc',
        label: 'Expected Annual CTC',
        placeholder: 'Select range or enter amount',
        type: 'select',
        isRequired: true,
        options: ['₹15-20 LPA', '₹20-25 LPA', '₹25-35 LPA', '₹35+ LPA'],
        selector: 'select#expected_ctc, select[name="expected_ctc"]',
        helperText: 'Sensitive compensation question.'
      },
      {
        id: 'notice_period',
        name: 'notice_period',
        label: 'Notice Period',
        type: 'select',
        isRequired: true,
        options: ['Immediate (0-15 days)', '30 Days', '60 Days', '90 Days'],
        selector: 'select#notice_period, select[name="notice_period"]'
      },
      {
        id: 'relocation_pref',
        name: 'relocation_pref',
        label: 'Are you open to relocation for this role?',
        type: 'radio',
        isRequired: true,
        options: ['Yes, willing to relocate', 'No, remote or current city only'],
        selector: 'input[name="relocation"]'
      },
      {
        id: 'resume_file',
        name: 'resume_file',
        label: 'Upload CV / Resume (PDF)',
        type: 'file',
        isRequired: true,
        selector: 'input[type="file"], input#resume_file, input[name="cv"]',
        helperText: 'Attached verified tailored resume.'
      },
      {
        id: 'cover_letter',
        name: 'cover_letter',
        label: 'Candidate Summary & Cover Note',
        placeholder: 'Brief summary of relevant engineering experience and why you are interested...',
        type: 'textarea',
        isRequired: false,
        selector: 'textarea#cover_letter, textarea[name="notes"]'
      },
      {
        id: 'email_alerts',
        name: 'email_alerts',
        label: 'Send me relevant job alerts matching my search criteria',
        type: 'checkbox',
        isRequired: false,
        selector: 'input[name="email_alerts"], input#job_alerts'
      },
      {
        id: 'terms_consent',
        name: 'terms_consent',
        label: 'I certify that the information provided is accurate and agree to terms',
        type: 'checkbox',
        isRequired: true,
        selector: 'input[name="terms"], input#terms_consent'
      }
    ];
  }

  public detectSubmissionControls(htmlOrPage: string | any): SubmissionControlInfo {
    return {
      submitButtonSelector: 'button[type="submit"], input[type="submit"], button.btn-apply, button:has-text("Submit Application")',
      isMultiStep: false
    };
  }

  public detectConfirmation(
    url: string,
    pageText: string,
    html: string
  ): { verified: boolean; confirmationId: string | null; confirmationText: string | null } {
    const textLower = pageText.toLowerCase();

    // Check for Adzuna specific confirmation phrases
    const confirmationPhrases = [
      'application has been submitted',
      'your application was sent',
      'application successfully sent',
      'thank you for applying',
      'application received'
    ];

    for (const phrase of confirmationPhrases) {
      if (textLower.includes(phrase)) {
        // Extract confirmation id if present
        const idMatch = pageText.match(/(?:ref(?:erence)?|application|id)\s*[:#]?\s*([A-Z0-9-]{6,16})/i);
        return {
          verified: true,
          confirmationId: idMatch ? idMatch[1] : null,
          confirmationText: phrase
        };
      }
    }

    return {
      verified: false,
      confirmationId: null,
      confirmationText: null
    };
  }
}
