/**
 * GenericATSAdapter — Universal Adaptive Fallback Engine
 *
 * When an application form does not match any known ATS vendor,
 * this engine performs multi-signal heuristic DOM analysis to:
 * - detect all input fields, textareas, selects, radios, checkboxes, and file uploads
 * - extract associated labels, placeholders, aria-labels, and parent fieldsets
 * - identify required vs optional fields
 * - detect multi-step navigation controls ("Next", "Continue", "Step 1 of 3")
 * - detect submit buttons and form actions
 * - verify external confirmation pages reliably
 */

import { BaseATSAdapter, SubmissionControlInfo } from './base-adapter';
import { RawDetectedField } from '../candidate-mapper';
import { SupportedATSPlatform } from '../types';

export class GenericATSAdapter implements BaseATSAdapter {
  public platform: SupportedATSPlatform = 'GENERIC_ATS';
  public platformName = 'Universal Adaptive Form Engine';

  public canHandle(_url: string, _html?: string): boolean {
    // Universal fallback: handles any URL or page
    return true;
  }

  /**
   * Universal field extraction from page HTML or DOM text using multi-signal heuristics
   */
  public extractFields(htmlOrPage: string | any): RawDetectedField[] {
    if (typeof htmlOrPage !== 'string') {
      // If Playwright page object is passed, extraction will be handled via DOM evaluation
      return this.getDefaultHeuristicFields();
    }

    const html = htmlOrPage;
    const detected: RawDetectedField[] = [];

    // Helper to find label preceding an element at a given string index
    const findPrecedingLabel = (str: string, index: number): string | undefined => {
      const precedingChunk = str.slice(Math.max(0, index - 400), index);
      // Check for <label ...>Label Text</label> immediately before
      const matches = Array.from(precedingChunk.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi));
      if (matches.length > 0) {
        const last = matches[matches.length - 1];
        const text = last[1].replace(/<[^>]*>/g, '').trim();
        if (text && !/^(yes|no|select|choose)$/i.test(text)) return text;
      }
      // Check for <legend>Label Text</legend> inside fieldset
      const legendMatches = Array.from(precedingChunk.matchAll(/<legend\b[^>]*>([\s\S]*?)<\/legend>/gi));
      if (legendMatches.length > 0) {
        const last = legendMatches[legendMatches.length - 1];
        const text = last[1].replace(/<[^>]*>/g, '').trim();
        if (text) return text;
      }
      return undefined;
    };

    // 1. Parse select elements
    const selectRegex = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
    let selectMatch;
    while ((selectMatch = selectRegex.exec(html)) !== null) {
      const attrs = selectMatch[1];
      const optionsHtml = selectMatch[2];
      const id = this.extractAttribute(attrs, 'id');
      const name = this.extractAttribute(attrs, 'name');
      const ariaLabel = this.extractAttribute(attrs, 'aria-label');
      const isRequired = /\brequired\b/i.test(attrs) || /aria-required="true"/i.test(attrs);

      const options: string[] = [];
      const optRegex = /<option[^>]*>([\s\S]*?)<\/option>/gi;
      let optMatch;
      while ((optMatch = optRegex.exec(optionsHtml)) !== null) {
        const optText = optMatch[1].replace(/<[^>]*>/g, '').trim();
        if (optText && !/select|choose/i.test(optText)) {
          options.push(optText);
        }
      }

      let label = ariaLabel || '';
      if (id) {
        const labelRegex = new RegExp(`<label[^>]*for=["']${id}["'][^>]*>(.*?)<\\/label>`, 'i');
        const labelMatch = labelRegex.exec(html);
        if (labelMatch) label = labelMatch[1].replace(/<[^>]*>/g, '').trim();
      }
      if (!label) {
        label = findPrecedingLabel(html, selectMatch.index) || '';
      }
      if (!label && name) {
        label = name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }

      detected.push({
        id,
        name,
        label: label || name || 'Dropdown Selection',
        type: 'select',
        isRequired,
        options,
        selector: id ? `#${id}` : (name ? `select[name="${name}"]` : undefined)
      });
    }

    // 2. Parse textareas
    const textareaRegex = /<textarea\b([^>]*)>[\s\S]*?<\/textarea>/gi;
    let textareaMatch;
    while ((textareaMatch = textareaRegex.exec(html)) !== null) {
      const attrs = textareaMatch[1];
      const id = this.extractAttribute(attrs, 'id');
      const name = this.extractAttribute(attrs, 'name');
      const placeholder = this.extractAttribute(attrs, 'placeholder');
      const ariaLabel = this.extractAttribute(attrs, 'aria-label');
      const isRequired = /\brequired\b/i.test(attrs);

      let label = ariaLabel || placeholder || '';
      if (id) {
        const labelRegex = new RegExp(`<label[^>]*for=["']${id}["'][^>]*>(.*?)<\\/label>`, 'i');
        const labelMatch = labelRegex.exec(html);
        if (labelMatch) label = labelMatch[1].replace(/<[^>]*>/g, '').trim();
      }
      if (!label) {
        label = findPrecedingLabel(html, textareaMatch.index) || '';
      }
      if (!label && name) {
        label = name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }

      detected.push({
        id,
        name,
        label: label || name || 'Detailed Response',
        type: 'textarea',
        placeholder,
        isRequired,
        selector: id ? `#${id}` : (name ? `textarea[name="${name}"]` : undefined)
      });
    }

    // 3. Parse input fields with radio grouping
    const radioGroups: Map<string, { label?: string; options: string[]; isRequired: boolean; selector?: string }> = new Map();
    const inputRegex = /<input\b([^>]*)>/gi;
    let match;

    while ((match = inputRegex.exec(html)) !== null) {
      const attrs = match[1];
      const type = (this.extractAttribute(attrs, 'type') || 'text').toLowerCase();
      if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) {
        continue;
      }

      const id = this.extractAttribute(attrs, 'id');
      const name = this.extractAttribute(attrs, 'name');
      const placeholder = this.extractAttribute(attrs, 'placeholder');
      const ariaLabel = this.extractAttribute(attrs, 'aria-label');
      const value = this.extractAttribute(attrs, 'value');
      const isRequired = /\brequired\b/i.test(attrs) || /aria-required="true"/i.test(attrs);

      // Handle radio button grouping
      if (type === 'radio' && name) {
        let group = radioGroups.get(name);
        if (!group) {
          let groupLabel = findPrecedingLabel(html, match.index) || '';
          if (!groupLabel && id) {
            const labelRegex = new RegExp(`<label[^>]*for=["']${id}["'][^>]*>(.*?)<\\/label>`, 'i');
            const labelMatch = labelRegex.exec(html);
            if (labelMatch) groupLabel = labelMatch[1].replace(/<[^>]*>/g, '').trim();
          }
          if (!groupLabel) {
            groupLabel = name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }
          group = { label: groupLabel, options: [], isRequired, selector: `input[name="${name}"]` };
          radioGroups.set(name, group);
        }
        if (value && !group.options.includes(value)) {
          group.options.push(value);
        }
        if (isRequired) group.isRequired = true;
        continue;
      }

      // Search for associated label by id or preceding text
      let label = ariaLabel || placeholder || '';
      if (id) {
        const labelRegex = new RegExp(`<label[^>]*for=["']${id}["'][^>]*>(.*?)<\\/label>`, 'i');
        const labelMatch = labelRegex.exec(html);
        if (labelMatch) {
          label = labelMatch[1].replace(/<[^>]*>/g, '').trim();
        }
      }
      if (!label) {
        label = findPrecedingLabel(html, match.index) || '';
      }
      if (!label && name) {
        label = name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }

      detected.push({
        id,
        name,
        label: label || name || 'Input Field',
        placeholder,
        ariaLabel,
        type,
        isRequired,
        selector: id ? `#${id}` : (name ? `input[name="${name}"]` : undefined)
      });
    }

    // Add grouped radio buttons
    for (const [name, group] of Array.from(radioGroups.entries())) {
      detected.push({
        id: name,
        name,
        label: group.label || name,
        type: 'radio',
        options: group.options.length > 0 ? group.options : ['Yes', 'No'],
        isRequired: group.isRequired,
        selector: group.selector || `input[name="${name}"]`
      });
    }

    return detected.length > 0 ? detected : this.getDefaultHeuristicFields();
  }

  /**
   * Fallback fields representing standard candidate application components
   */
  public getDefaultHeuristicFields(): RawDetectedField[] {
    return [
      { id: 'first_name', name: 'first_name', label: 'First Name', type: 'text', isRequired: true, selector: 'input[name*="first"], input[id*="first"]' },
      { id: 'last_name', name: 'last_name', label: 'Last Name', type: 'text', isRequired: true, selector: 'input[name*="last"], input[id*="last"]' },
      { id: 'email', name: 'email', label: 'Email Address', type: 'email', isRequired: true, selector: 'input[type="email"], input[name*="email"]' },
      { id: 'phone', name: 'phone', label: 'Phone Number', type: 'tel', isRequired: true, selector: 'input[type="tel"], input[name*="phone"]' },
      { id: 'location', name: 'location', label: 'Current Location', type: 'text', isRequired: false, selector: 'input[name*="city"], input[name*="location"]' },
      { id: 'resume_file', name: 'resume_file', label: 'Resume / CV', type: 'file', isRequired: true, selector: 'input[type="file"]' },
      { id: 'expected_ctc', name: 'expected_ctc', label: 'Expected Salary / CTC', type: 'text', isRequired: false, selector: 'input[name*="salary"], input[name*="ctc"]' },
      { id: 'notice_period', name: 'notice_period', label: 'Notice Period', type: 'select', isRequired: false, options: ['Immediate', '15 Days', '30 Days', '60 Days', '90 Days'] },
      { id: 'work_authorization', name: 'work_authorization', label: 'Authorized to work in country?', type: 'radio', isRequired: true, options: ['Yes', 'No'] },
      { id: 'cover_letter', name: 'cover_letter', label: 'Summary or Notes', type: 'textarea', isRequired: false, selector: 'textarea' }
    ];
  }

  public detectSubmissionControls(htmlOrPage: string | any): SubmissionControlInfo {
    let html = typeof htmlOrPage === 'string' ? htmlOrPage : '';
    const hasNextStep = /next\s*step|continue|proceed|step\s*2/i.test(html);

    return {
      submitButtonSelector: 'button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Apply")',
      isMultiStep: hasNextStep,
      nextStepSelector: hasNextStep ? 'button:has-text("Next"), button:has-text("Continue"), .btn-next' : undefined
    };
  }

  public detectConfirmation(
    url: string,
    pageText: string,
    html: string
  ): { verified: boolean; confirmationId: string | null; confirmationText: string | null } {
    const textLower = pageText.toLowerCase();

    // Universal confirmation phrases
    const phrases = [
      'thank you for applying',
      'your application has been submitted',
      'application successfully submitted',
      'application received',
      'we have received your application',
      'thanks for applying',
      'application sent successfully'
    ];

    for (const phrase of phrases) {
      if (textLower.includes(phrase)) {
        const idMatch = pageText.match(/(?:confirmation|reference|application|ref)\s*(?:#|id|no\.?)?\s*[:\s]?\s*([A-Z0-9-]{6,20})/i);
        return {
          verified: true,
          confirmationId: idMatch ? idMatch[1] : null,
          confirmationText: phrase
        };
      }
    }

    // Check confirmation URL pattern
    if (/confirmation|thank[-_]?you|app[-_]?success|submitted/i.test(url)) {
      return {
        verified: true,
        confirmationId: null,
        confirmationText: 'Confirmation page URL detected'
      };
    }

    return { verified: false, confirmationId: null, confirmationText: null };
  }

  private extractAttribute(attrs: string, attrName: string): string | undefined {
    const regex = new RegExp(`${attrName}=["']([^"']*)["']`, 'i');
    const match = regex.exec(attrs);
    return match ? match[1] : undefined;
  }
}
