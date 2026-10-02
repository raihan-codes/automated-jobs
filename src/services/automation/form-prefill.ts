// Candidate Profile to ATS Form Field Mapper
import { CandidateProfileData, ApplicationFormField, TailoredResumeContent } from '../../types';
import { FieldClassifier } from './field-classifier';

export class FormPrefillEngine {
  /**
   * Generates standard & custom application fields populated from Candidate Profile
   */
  public static mapProfileToFields(
    profile: CandidateProfileData,
    tailoredResume?: TailoredResumeContent,
    customFieldRequirements: { key: string; label: string; type: any; options?: string[] }[] = []
  ): ApplicationFormField[] {
    const nameParts = profile.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const baseFields: ApplicationFormField[] = [
      {
        fieldKey: 'first_name',
        fieldLabel: 'First Name',
        fieldType: 'text',
        fieldValue: firstName,
        isSensitive: false,
        isFilledByAI: true,
        requiresUserReview: false,
        confidenceScore: 1.0
      },
      {
        fieldKey: 'last_name',
        fieldLabel: 'Last Name',
        fieldType: 'text',
        fieldValue: lastName,
        isSensitive: false,
        isFilledByAI: true,
        requiresUserReview: false,
        confidenceScore: 1.0
      },
      {
        fieldKey: 'email',
        fieldLabel: 'Email Address',
        fieldType: 'text',
        fieldValue: profile.email,
        isSensitive: false,
        isFilledByAI: true,
        requiresUserReview: false,
        confidenceScore: 1.0
      },
      {
        fieldKey: 'phone',
        fieldLabel: 'Phone Number',
        fieldType: 'text',
        fieldValue: profile.phone || '',
        isSensitive: false,
        isFilledByAI: true,
        requiresUserReview: false,
        confidenceScore: profile.phone ? 1.0 : 0.0
      },
      {
        fieldKey: 'resume_file',
        fieldLabel: 'Resume Attachment',
        fieldType: 'file',
        fieldValue: tailoredResume ? `${profile.fullName.replace(/\s+/g, '_')}_Resume.pdf` : 'Candidate_Resume.pdf',
        isSensitive: false,
        isFilledByAI: true,
        requiresUserReview: false,
        confidenceScore: 1.0
      },
      {
        fieldKey: 'linkedin_url',
        fieldLabel: 'LinkedIn URL',
        fieldType: 'text',
        fieldValue: profile.linkedinUrl || '',
        isSensitive: false,
        isFilledByAI: true,
        requiresUserReview: false,
        confidenceScore: profile.linkedinUrl ? 1.0 : 0.5
      },
      {
        fieldKey: 'github_url',
        fieldLabel: 'GitHub URL',
        fieldType: 'text',
        fieldValue: profile.githubUrl || '',
        isSensitive: false,
        isFilledByAI: true,
        requiresUserReview: false,
        confidenceScore: profile.githubUrl ? 1.0 : 0.5
      },
      {
        fieldKey: 'location',
        fieldLabel: 'Current Location',
        fieldType: 'text',
        fieldValue: profile.location || '',
        isSensitive: false,
        isFilledByAI: true,
        requiresUserReview: false,
        confidenceScore: 1.0
      },
      {
        fieldKey: 'salary_expectation',
        fieldLabel: 'Desired Annual Salary (INR)',
        fieldType: 'text',
        fieldValue: profile.expectedSalaryLPA ? `₹${profile.expectedSalaryLPA} LPA` : (profile.minSalary ? `₹${(profile.minSalary / 100000).toFixed(0)} LPA` : ''),
        isSensitive: true,
        isFilledByAI: true,
        requiresUserReview: true,
        confidenceScore: 0.85,
        validationError: 'Please verify this compensation number before submission.'
      },
      {
        fieldKey: 'work_authorization',
        fieldLabel: 'Are you legally authorized to work in the country of this job?',
        fieldType: 'select',
        fieldValue: profile.workAuthorization || (profile.requiresVisa ? 'No' : 'Yes'),
        isSensitive: true,
        isFilledByAI: true,
        requiresUserReview: true,
        confidenceScore: 0.9,
        options: ['Yes', 'No', 'Will require sponsorship now or in the future']
      }
    ];

    // Merge custom form fields detected by scraper / form inspector
    for (const custom of customFieldRequirements) {
      const isSensitive = FieldClassifier.isSensitiveField(custom.label, custom.key);
      const isExisting = baseFields.some(b => b.fieldKey === custom.key);
      if (!isExisting) {
        baseFields.push({
          fieldKey: custom.key,
          fieldLabel: custom.label,
          fieldType: custom.type || 'text',
          fieldValue: '',
          isSensitive,
          isFilledByAI: false,
          requiresUserReview: true,
          confidenceScore: 0.0,
          options: custom.options,
          validationError: isSensitive ? 'Sensitive field detected. Explicit confirmation required.' : 'Please provide answer.'
        });
      }
    }

    return baseFields;
  }
}
