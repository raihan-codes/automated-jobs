// Sensitive Field Classifier & Guardrail Engine
import { ApplicationFormField } from '../../types';

export class FieldClassifier {
  private static sensitiveKeywords = [
    'salary', 'compensation', 'pay', 'rate', 'expected', 'ctc',
    'notice', 'notice period', 'relocate', 'relocation',
    'visa', 'sponsorship', 'authorized', 'citizenship', 'work authorization', 'greencard', 'cpt', 'opt', 'h1b',
    'race', 'gender', 'ethnicity', 'veteran', 'disability', 'sexual orientation',
    'clearance', 'security clearance', 'background check', 'felony', 'convict',
    'nda', 'non-compete', 'agreement', 'declaration', 'legal'
  ];

  /**
   * Evaluates whether an ATS form field requires explicit human review / is sensitive
   */
  public static isSensitiveField(label: string, key: string): boolean {
    const combined = `${label} ${key}`.toLowerCase();
    return this.sensitiveKeywords.some(keyword => combined.includes(keyword));
  }

  /**
   * Classifies confidence score for AI auto-filled data
   */
  public static calculateConfidence(
    fieldKey: string,
    fieldValue: string | undefined,
    isSensitive: boolean
  ): { confidence: number; requiresReview: boolean } {
    if (!fieldValue || fieldValue.trim() === '') {
      return { confidence: 0.0, requiresReview: true };
    }

    if (isSensitive) {
      return { confidence: 0.85, requiresReview: true };
    }

    // Standard fields (name, email, phone, links)
    const highConfidenceKeys = ['first_name', 'last_name', 'email', 'phone', 'linkedin_url', 'github_url', 'website', 'resume_file'];
    if (highConfidenceKeys.includes(fieldKey)) {
      return { confidence: 1.0, requiresReview: false };
    }

    return { confidence: 0.9, requiresReview: false };
  }
}
