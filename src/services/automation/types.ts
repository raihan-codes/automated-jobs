// Automation & Field Classifier Types
import { ApplicationFormField } from '@/types';

export interface FormInspectionResult {
  formUrl: string;
  platform: string;
  fields: ApplicationFormField[];
  sensitiveFields: ApplicationFormField[];
  unansweredFields: ApplicationFormField[];
  requiresHumanInput: boolean;
  screenshotUrl?: string;
}

export interface AutomationExecutionResult {
  id?: string;
  success: boolean;
  status: 'WAITING_FOR_APPROVAL' | 'APPLICATION_READY' | 'FAILED';
  fields: ApplicationFormField[];
  hasSensitiveQuestions: boolean;
  humanReviewNotes?: string;
  screenshotSnapshot?: string;
  error?: string;
}
