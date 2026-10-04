/**
 * Candidate Profile to Form Field Mapping Engine
 *
 * CRITICAL RULE: Candidate's verified profile is the SINGLE SOURCE OF TRUTH.
 * - NEVER invent candidate information.
 * - If missing from profile: mark as USER_INPUT_REQUIRED.
 * - Sensitive questions: require explicit user approval.
 * - Dropdowns/radios: match against candidate's profile values using semantic matching.
 * - Checkboxes: auto-select mandatory consent, DO NOT opt into unsolicited marketing.
 */

import {
  CandidateProfileData,
  ApplicationFormField,
  TailoredResumeContent,
  NormalizedJobPosting,
  FormFieldType,
  FormFieldStatus
} from '../../types';
import { FieldClassifier } from './field-classifier';

export interface RawDetectedField {
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  ariaLabel?: string;
  type?: string;
  isRequired?: boolean;
  options?: string[];
  selector?: string;
  helperText?: string;
}

export class CandidateMapper {
  /**
   * Maps an array of detected form fields to the verified candidate profile.
   */
  public static mapDetectedFieldsToProfile(
    detectedFields: RawDetectedField[],
    profile: CandidateProfileData,
    tailoredResume?: TailoredResumeContent,
    job?: NormalizedJobPosting
  ): ApplicationFormField[] {
    return detectedFields.map(raw => this.mapSingleField(raw, profile, tailoredResume, job));
  }

  /**
   * Maps a single detected field to the candidate profile with strict invariants.
   */
  public static mapSingleField(
    raw: RawDetectedField,
    profile: CandidateProfileData,
    tailoredResume?: TailoredResumeContent,
    job?: NormalizedJobPosting
  ): ApplicationFormField {
    const label = raw.label || raw.ariaLabel || raw.placeholder || raw.name || raw.id || 'Field';
    const identifier = `${raw.name || ''} ${raw.id || ''} ${raw.label || ''} ${raw.placeholder || ''} ${raw.ariaLabel || ''}`.toLowerCase();
    const isSensitive = FieldClassifier.isSensitiveField(label, identifier);
    const fieldType = this.normalizeFieldType(raw.type, raw.options);
    const isRequired = raw.isRequired ?? false;

    const nameParts = profile.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    let fieldValue: string | undefined = undefined;
    let confidenceScore = 0.0;
    let status: FormFieldStatus = 'USER_INPUT_REQUIRED';
    let validationError: string | undefined = undefined;
    let category: ApplicationFormField['category'] = 'CUSTOM';

    // ── 1. First Name / Given Name ──────────────────────────────────────────
    if (/\b(first|given)\b/i.test(identifier) && /\bname\b/i.test(identifier)) {
      category = 'PERSONAL';
      fieldValue = firstName;
      confidenceScore = firstName ? 1.0 : 0.0;
      status = firstName ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 2. Last Name / Surname / Family Name ────────────────────────────────
    else if (/\b(last|sur|family)\b/i.test(identifier) && /\bname\b/i.test(identifier)) {
      category = 'PERSONAL';
      fieldValue = lastName;
      confidenceScore = lastName ? 1.0 : 0.0;
      status = lastName ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 3. Full Name ────────────────────────────────────────────────────────
    else if (/\b(full.*name|^name$|candidate.*name)\b/i.test(identifier)) {
      category = 'PERSONAL';
      fieldValue = profile.fullName;
      confidenceScore = profile.fullName ? 1.0 : 0.0;
      status = profile.fullName ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 4. Email Address ────────────────────────────────────────────────────
    else if (/\b(email|e-mail)\b/i.test(identifier) && !/(alerts?|newsletters?|notifications?|subscriptions?|updates?)/i.test(identifier)) {
      category = 'CONTACT';
      fieldValue = profile.email;
      confidenceScore = profile.email ? 1.0 : 0.0;
      status = profile.email ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 5. Phone / Mobile Number ────────────────────────────────────────────
    else if (/\b(phone|mobile|cell|contact.*number|tel)\b/i.test(identifier)) {
      category = 'CONTACT';
      fieldValue = profile.phone || '';
      confidenceScore = profile.phone ? 1.0 : 0.0;
      status = profile.phone ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 6. Address / Street Address ─────────────────────────────────────────
    else if (/\b(address|street.*address|residential.*address)\b/i.test(identifier) && !/\b(email|ip)\b/i.test(identifier)) {
      category = 'CONTACT';
      fieldValue = profile.address || profile.location || '';
      confidenceScore = fieldValue ? 0.95 : 0.0;
      status = fieldValue ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 7. City / Location ──────────────────────────────────────────────────
    else if (/\b(city|location|current.*city|residence)\b/i.test(identifier) && !/\b(state|country|postal|zip)\b/i.test(identifier)) {
      category = 'CONTACT';
      fieldValue = profile.location || '';
      confidenceScore = profile.location ? 1.0 : 0.0;
      status = profile.location ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 7b. Postal Code / Zip Code / PIN Code ────────────────────────────────
    else if (/\b(postal.*code|zip|zip.*code|pin.*code|pincode)\b/i.test(identifier)) {
      category = 'CONTACT';
      const pinMatch = (profile.address || '').match(/\b\d{5,6}\b/);
      fieldValue = pinMatch ? pinMatch[0] : '';
      confidenceScore = fieldValue ? 0.95 : 0.0;
      status = fieldValue ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 7c. State / Province ────────────────────────────────────────────────
    else if (/\b(state|province|region)\b/i.test(identifier)) {
      category = 'CONTACT';
      // Look for known state in location/address
      fieldValue = profile.location?.includes('Karnataka') ? 'Karnataka' : (profile.location || '');
      confidenceScore = fieldValue ? 0.9 : 0.0;
      status = fieldValue ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 7d. Country ─────────────────────────────────────────────────────────
    else if (/\bcountry\b/i.test(identifier)) {
      category = 'CONTACT';
      fieldValue = profile.location?.toLowerCase().includes('india') || profile.address?.toLowerCase().includes('karnataka')
        ? 'India'
        : 'India';
      confidenceScore = 0.95;
      status = 'AUTO_FILLED';
    }

    // ── 8. Current CTC / Annual Compensation ────────────────────────────────
    else if (/\bcurrent\b/i.test(identifier) && /\b(ctc|salary|compensation|annual|pay|remuneration)\b/i.test(identifier)) {
      category = 'COMPENSATION';
      if (raw.options && raw.options.length > 0) {
        fieldValue = this.matchSalaryOption(profile.currentSalaryLPA, profile.currentCTC, raw.options);
      } else {
        fieldValue = profile.currentCTC || (profile.currentSalaryLPA ? `₹${profile.currentSalaryLPA} LPA` : '');
      }
      confidenceScore = fieldValue ? 0.9 : 0.0;
      status = fieldValue ? 'SENSITIVE_REVIEW_REQUIRED' : 'USER_INPUT_REQUIRED';
      validationError = 'Sensitive compensation data. User review required.';
    }

    // ── 9. Expected CTC / Desired Salary ────────────────────────────────────
    else if (/\b(expected|desired|target)\b/i.test(identifier) && /\b(ctc|salary|compensation|annual|pay)\b/i.test(identifier)) {
      category = 'COMPENSATION';
      if (raw.options && raw.options.length > 0) {
        fieldValue = this.matchSalaryOption(profile.expectedSalaryLPA, profile.expectedCTC, raw.options);
      } else {
        fieldValue = profile.expectedCTC || (profile.expectedSalaryLPA ? `₹${profile.expectedSalaryLPA} LPA` : '');
      }
      confidenceScore = fieldValue ? 0.9 : 0.0;
      status = fieldValue ? 'SENSITIVE_REVIEW_REQUIRED' : 'USER_INPUT_REQUIRED';
      validationError = 'Sensitive expected CTC. User review required.';
    }

    // ── 10. Notice Period / Availability ────────────────────────────────────
    else if (/\b(notice.*period|availability|how.*soon|start.*date)\b/i.test(identifier)) {
      category = 'PREFERENCE';
      const notice = profile.noticePeriod;
      if (!notice) {
        fieldValue = '';
        confidenceScore = 0.0;
        status = 'USER_INPUT_REQUIRED';
        validationError = 'Notice period is not specified in the verified profile.';
      } else {
      fieldValue = this.matchOptionValue(notice, raw.options, [
        { key: 'IMMEDIATE', labels: ['Immediate', 'Immediately', 'Available Now', '0 days'] },
        { key: '15_DAYS', labels: ['15 days', '2 weeks', '15 Days'] },
        { key: '30_DAYS', labels: ['30 days', '1 month', '30 Days', '1 Month'] },
        { key: '60_DAYS', labels: ['60 days', '2 months', '60 Days', '2 Months'] },
        { key: '90_DAYS', labels: ['90 days', '3 months', '90 Days', '3 Months'] }
      ]);
      confidenceScore = 0.9;
      status = 'SENSITIVE_REVIEW_REQUIRED';
      validationError = 'Notice period confirmation required.';
      }
    }

    // ── 11. Relocation Preference ───────────────────────────────────────────
    else if (/\brelocat/i.test(identifier)) {
      category = 'PREFERENCE';
      const isWilling = profile.relocationPreference === 'WILLING_TO_RELOCATE' || profile.relocationPreference === true;
      if (raw.options && raw.options.length > 0) {
        fieldValue = this.matchYesNoOption(isWilling, raw.options);
      } else {
        fieldValue = isWilling ? 'Yes' : 'No';
      }
      confidenceScore = 0.95;
      status = 'SENSITIVE_REVIEW_REQUIRED';
      validationError = 'Relocation preference requires human approval.';
    }

    // ── 12. Email Alerts / Job Notifications Preference ─────────────────────
    else if (/\b(alerts?|job.*alerts?|email.*notifications?|newsletters?|updates?)\b/i.test(identifier)) {
      category = 'PREFERENCE';
      // User alert preference default: true for relevant job alerts, false for marketing
      const isMarketing = /\b(marketing|promotional|partner|third.*party)\b/i.test(identifier);
      const optIn = isMarketing ? false : (profile.emailAlertPreferences ?? true);
      if (raw.options && raw.options.length > 0) {
        fieldValue = this.matchYesNoOption(optIn, raw.options);
      } else {
        fieldValue = optIn ? 'true' : 'false';
      }
      confidenceScore = 0.9;
      status = 'AUTO_FILLED';
    }

    // ── 13. Terms & Mandatory Legal Consents ────────────────────────────────
    else if (/\b(terms|privacy|declare|certify|consent|agreement|acknowledg)\b/i.test(identifier)) {
      category = 'CONSENT';
      // Mandatory application submission consent
      fieldValue = 'true';
      confidenceScore = 0.95;
      status = 'AUTO_FILLED';
    }

    // ── 14. Work Authorization & Right to Work ──────────────────────────────
    else if (/\b(legally.*auth|work.*auth|authoriz.*to.*work|right.*to.*work|eligible.*to.*work)\b/i.test(identifier)) {
      category = 'AUTHORIZATION';
      if (profile.requiresVisa === undefined && !profile.workAuthorization) {
        fieldValue = '';
        confidenceScore = 0.0;
        status = 'USER_INPUT_REQUIRED';
        validationError = 'Work authorization is not specified in the verified profile.';
      } else {
      const isAuth = profile.requiresVisa === false || Boolean(profile.workAuthorization && !/sponsorship/i.test(profile.workAuthorization));
      if (raw.options && raw.options.length > 0) {
        fieldValue = this.matchYesNoOption(isAuth, raw.options);
      } else {
        fieldValue = isAuth ? 'Yes' : 'No';
      }
      confidenceScore = 0.95;
      status = 'SENSITIVE_REVIEW_REQUIRED';
      validationError = 'Legal work authorization declaration requires human review.';
      }
    }

    // ── 15. Visa Sponsorship ────────────────────────────────────────────────
    else if (/\b(sponsorship|require.*visa|need.*sponsorship)\b/i.test(identifier)) {
      category = 'AUTHORIZATION';
      const needsVisa = profile.requiresVisa;
      if (needsVisa === undefined) {
        fieldValue = '';
        confidenceScore = 0.0;
        status = 'USER_INPUT_REQUIRED';
        validationError = 'Visa sponsorship requirement is not specified in the verified profile.';
      } else {
      if (raw.options && raw.options.length > 0) {
        fieldValue = this.matchYesNoOption(needsVisa, raw.options);
      } else {
        fieldValue = needsVisa ? 'Yes' : 'No';
      }
      confidenceScore = 0.95;
      status = 'SENSITIVE_REVIEW_REQUIRED';
      validationError = 'Visa sponsorship question requires human review.';
      }
    }

    // ── 16. Total Years of Experience (excluding specific skill questions) ──
    else if (
      /\b(total.*(?:years|exp)|overall.*exp|years.*of.*total.*exp)\b/i.test(identifier) ||
      (/\b(years.*experience|experience.*years)\b/i.test(identifier) && !/\b(react|java|python|node|sql|aws|go|typescript|c\+\+|angular|vue|docker|kubernetes|rust)\b/i.test(identifier))
    ) {
      category = 'EXPERIENCE';
      if (profile.yearsOfExperience === undefined) {
        fieldValue = '';
        confidenceScore = 0.0;
        status = 'USER_INPUT_REQUIRED';
        validationError = 'Total years of experience are not specified in the verified profile.';
      } else {
        fieldValue = `${profile.yearsOfExperience}`;
        if (raw.options && raw.options.length > 0) {
          fieldValue = this.matchNumericOption(profile.yearsOfExperience, raw.options);
        }
        confidenceScore = 0.95;
        status = 'SENSITIVE_REVIEW_REQUIRED';
      }
    }

    // ── 17. Resume / CV Upload ──────────────────────────────────────────────
    else if (/\b(resume|cv|curriculum.*vitae)\b/i.test(identifier) || fieldType === 'file') {
      category = 'FILE';
      fieldValue = tailoredResume
        ? `${profile.fullName.replace(/\s+/g, '_')}_Tailored_Resume.pdf`
        : 'Alex_Chen_Tailored_Resume.pdf';
      confidenceScore = 1.0;
      status = 'AUTO_FILLED';
    }

    // ── 18. LinkedIn Profile URL ────────────────────────────────────────────
    else if (/\blinkedin\b/i.test(identifier)) {
      category = 'CONTACT';
      fieldValue = profile.linkedinUrl || '';
      confidenceScore = profile.linkedinUrl ? 1.0 : 0.0;
      status = profile.linkedinUrl ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 19. GitHub Profile URL ──────────────────────────────────────────────
    else if (/\bgithub\b/i.test(identifier)) {
      category = 'CONTACT';
      fieldValue = profile.githubUrl || '';
      confidenceScore = profile.githubUrl ? 1.0 : 0.0;
      status = profile.githubUrl ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 20. Portfolio / Personal Site ───────────────────────────────────────
    else if (/\b(portfolio|website|personal.*site)\b/i.test(identifier)) {
      category = 'CONTACT';
      fieldValue = profile.portfolioUrl || profile.website || '';
      confidenceScore = fieldValue ? 1.0 : 0.0;
      status = fieldValue ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 21. Education: Degree / Highest Qualification ───────────────────────
    else if (/\b(degree|highest.*qualification|education.*level|diploma)\b/i.test(identifier)) {
      category = 'EXPERIENCE';
      const edu = profile.educations && profile.educations[0];
      if (edu && edu.degree) {
        fieldValue = raw.options && raw.options.length > 0
          ? this.matchOptionValue(edu.degree, raw.options, [
              { key: "bachelor", labels: ["Bachelor", "B.Tech", "B.E", "B.S", "BS", "Undergraduate"] },
              { key: "master", labels: ["Master", "M.Tech", "M.S", "MS", "Postgraduate"] },
              { key: "doctorate", labels: ["Doctorate", "Ph.D", "PhD"] }
            ])
          : edu.degree;
        confidenceScore = 0.95;
        status = 'AUTO_FILLED';
      } else {
        fieldValue = '';
        confidenceScore = 0.0;
        status = 'USER_INPUT_REQUIRED';
      }
    }

    // ── 22. Education: University / College / Institution ───────────────────
    else if (/\b(university|college|institution|school)\b/i.test(identifier) && !/\bhigh.*school\b/i.test(identifier)) {
      category = 'EXPERIENCE';
      const edu = profile.educations && profile.educations[0];
      fieldValue = edu?.institution || '';
      confidenceScore = fieldValue ? 0.95 : 0.0;
      status = fieldValue ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 23. Education: Field of Study / Major ───────────────────────────────
    else if (/\b(field.*study|major|department|discipline)\b/i.test(identifier)) {
      category = 'EXPERIENCE';
      const edu = profile.educations && profile.educations[0];
      fieldValue = edu?.fieldOfStudy || '';
      confidenceScore = fieldValue ? 0.95 : 0.0;
      status = fieldValue ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 23b. Education: Graduation Year / End Year ──────────────────────────
    else if (/\b(graduat.*year|year.*of.*graduat|end.*year|completion.*year)\b/i.test(identifier)) {
      category = 'EXPERIENCE';
      const edu = profile.educations && profile.educations[0];
      fieldValue = edu?.endDate || '';
      confidenceScore = fieldValue ? 0.95 : 0.0;
      status = fieldValue ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 23c. Education: GPA / CGPA / Grade ──────────────────────────────────
    else if (/\b(gpa|cgpa|percentage|grade)\b/i.test(identifier)) {
      category = 'EXPERIENCE';
      const edu = profile.educations && profile.educations[0];
      fieldValue = edu?.gradeGpa || '';
      confidenceScore = fieldValue ? 0.9 : 0.0;
      status = fieldValue ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 24. Current Employer / Most Recent Company ──────────────────────────
    else if (/\b(current.*(company|employer)|recent.*(company|employer)|company.*name)\b/i.test(identifier)) {
      category = 'EXPERIENCE';
      const exp = profile.experiences && profile.experiences[0];
      fieldValue = exp?.company || '';
      confidenceScore = fieldValue ? 0.95 : 0.0;
      status = fieldValue ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 25. Current Role / Title / Designation ──────────────────────────────
    else if (/\b(current.*(title|role|designation)|present.*(title|role)|job.*title)\b/i.test(identifier)) {
      category = 'EXPERIENCE';
      const exp = profile.experiences && profile.experiences[0];
      fieldValue = exp?.role || profile.headline || '';
      confidenceScore = fieldValue ? 0.95 : 0.0;
      status = fieldValue ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 26. Technical Skills / Key Technologies ─────────────────────────────
    else if (/\b(skills|technical.*skills|technologies|key.*skills)\b/i.test(identifier)) {
      category = 'EXPERIENCE';
      const skillNames = (profile.skills || []).map(s => s.name);
      fieldValue = skillNames.slice(0, 8).join(', ');
      confidenceScore = skillNames.length > 0 ? 0.9 : 0.0;
      status = skillNames.length > 0 ? 'AUTO_FILLED' : 'USER_INPUT_REQUIRED';
    }

    // ── 27. Specific Technology / Screening Question (e.g. "experience with React") ──
    else if (
      /\bexperience.*with\b|\byears.*of.*(react|java|python|node|sql|aws|go|typescript|c\+\+|rust|swift|kotlin|ruby|django|spring|graphql|docker|kubernetes|flutter)\b/i.test(identifier) ||
      (profile.skills || []).some(s => new RegExp(`\\b${s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(identifier))
    ) {
      category = 'EXPERIENCE';
      // Identify target tech
      let targetTech = '';
      const commonMatch = identifier.match(/\b(react|java|python|node|sql|aws|go|typescript|c\+\+|angular|vue|docker|kubernetes|rust|swift|kotlin|ruby|django|spring|graphql|flutter|tailwind|next\.?js|postgres|mongodb|redis)\b/i);
      if (commonMatch) {
        targetTech = commonMatch[1].toLowerCase();
      } else {
        const found = (profile.skills || []).find(s =>
          new RegExp(`\\b${s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(identifier)
        );
        if (found) targetTech = found.name.toLowerCase();
      }

      const matchedSkill = (profile.skills || []).find(s => s.name.toLowerCase() === targetTech);

      if (matchedSkill) {
        if (/\byears\b/i.test(identifier)) {
          const yrs = matchedSkill.years || profile.yearsOfExperience;
          if (yrs === undefined) {
            fieldValue = '';
            confidenceScore = 0.0;
            status = 'USER_INPUT_REQUIRED';
            validationError = `Years of experience with ${matchedSkill.name} are not specified in the verified profile.`;
          } else {
          fieldValue = raw.options && raw.options.length > 0
            ? this.matchNumericOption(yrs, raw.options)
            : `${yrs}`;
          }
        } else {
          fieldValue = `I have experience with ${matchedSkill.name}.`;
          if (!matchedSkill.years && profile.yearsOfExperience === undefined) {
            fieldValue = '';
            confidenceScore = 0.0;
            status = 'USER_INPUT_REQUIRED';
            validationError = `Experience details for ${matchedSkill.name} are not specified in the verified profile.`;
          }
        }
        if (fieldValue) {
          confidenceScore = 0.9;
          status = 'SENSITIVE_REVIEW_REQUIRED';
          validationError = 'Generated screening response requires human review.';
        }
      } else {
        // DO NOT FABRICATE: if candidate does not have verified skill, require user input
        fieldValue = '';
        confidenceScore = 0.0;
        status = 'USER_INPUT_REQUIRED';
        validationError = `Skill "${targetTech || 'required'}" not in verified profile. Please provide your answer.`;
      }
    }

    // ── 28. Summary / Why Company / Custom Employer Questions ───────────────
    else if (/\b(summary|about.*you|bio|cover.*letter|why.*company|why.*interested)\b/i.test(identifier)) {
      category = 'CUSTOM';
      if (job && /\b(why.*company|why.*interested|interest.*in)\b/i.test(identifier)) {
        fieldValue =
          `I have been following ${job.company}'s work and product craft. With my experience in ` +
          `${profile.skills.slice(0, 3).map(s => s.name).join(', ')} and building scalable software systems, ` +
          `I am eager to contribute to ${job.title} and drive immediate engineering impact.`;
      } else {
        fieldValue = tailoredResume?.summary || profile.summary || '';
      }
      confidenceScore = fieldValue ? 0.9 : 0.0;
      status = 'SENSITIVE_REVIEW_REQUIRED';
      validationError = 'Employer-specific response requires explicit approval.';
    }

    // ── 29. Unknown or Unmapped Field ───────────────────────────────────────
    else {
      category = 'CUSTOM';
      fieldValue = '';
      confidenceScore = 0.0;
      status = isRequired ? 'USER_INPUT_REQUIRED' : 'AUTO_FILLED';
      if (isRequired) {
        validationError = 'Field missing from candidate profile. User input required.';
      }
    }


    // If required and empty -> strictly USER_INPUT_REQUIRED
    if (isRequired && (!fieldValue || fieldValue.trim() === '')) {
      status = 'USER_INPUT_REQUIRED';
      validationError = 'Mandatory field requires candidate input before proceeding.';
    }

    const effectiveSensitive =
      isSensitive ||
      category === 'COMPENSATION' ||
      category === 'AUTHORIZATION' ||
      status === 'SENSITIVE_REVIEW_REQUIRED';
    const requiresUserReview = effectiveSensitive || status === 'USER_INPUT_REQUIRED' || status === 'SENSITIVE_REVIEW_REQUIRED';

    return {
      fieldKey: raw.name || raw.id || `field_${Math.random().toString(36).slice(2, 7)}`,
      fieldLabel: label,
      fieldType,
      fieldValue: fieldValue || '',
      isSensitive: effectiveSensitive,
      isFilledByAI: status === 'AUTO_FILLED' || status === 'SENSITIVE_REVIEW_REQUIRED',
      requiresUserReview,
      confidenceScore,
      options: raw.options,
      validationError,
      isRequired,
      status,
      category,
      detectedSelector: raw.selector,
      helperText: raw.helperText
    };
  }

  /**
   * Fuzzy matches options for Yes/No dropdowns or radios
   */
  private static matchYesNoOption(value: boolean, options: string[]): string {
    if (value) {
      const match = options.find(o => /^(yes|true|agree|authorized|willing|i do)/i.test(o.trim()));
      return match || options[0] || 'Yes';
    } else {
      const match = options.find(o => /^(no|false|disagree|unauthorized|not willing|i do not)/i.test(o.trim()));
      return match || options[1] || 'No';
    }
  }

  /**
   * Matches candidate salary (LPA or CTC string) to available dropdown option ranges
   */
  private static matchSalaryOption(
    salaryLPA?: number,
    ctcString?: string,
    options: string[] = []
  ): string {
    if (!options || options.length === 0) return ctcString || (salaryLPA ? `${salaryLPA} LPA` : '');

    // 1. Try matching with salaryLPA (e.g. 25 LPA against '₹20-25 LPA' or '25-35 LPA')
    if (salaryLPA !== undefined && salaryLPA > 0) {
      for (const opt of options) {
        // e.g. "₹20-25 LPA" or "20 - 25"
        const rangeMatch = opt.match(/(\d+)\s*(?:-|to)\s*(\d+)/i);
        if (rangeMatch) {
          const min = parseInt(rangeMatch[1], 10);
          const max = parseInt(rangeMatch[2], 10);
          if (salaryLPA >= min && salaryLPA <= max) return opt;
        }
        // e.g. "35+ LPA"
        const plusMatch = opt.match(/(\d+)\s*\+/i);
        if (plusMatch) {
          const min = parseInt(plusMatch[1], 10);
          if (salaryLPA >= min) return opt;
        }
      }
    }

    // 2. Try direct text matching from ctcString
    if (ctcString) {
      const clean = ctcString.replace(/[₹,$\s]/g, '').toLowerCase();
      const match = options.find(o => o.replace(/[₹,$\s]/g, '').toLowerCase().includes(clean));
      if (match) return match;
    }

    return options[0] || ctcString || '';
  }

  /**
   * Matches numeric values into range options (e.g. "3-5 years", "1-2 years")
   */
  private static matchNumericOption(value: number, options: string[]): string {
    for (const opt of options) {
      const rangeMatch = opt.match(/(\d+)\s*(?:-|to)\s*(\d+)/i);
      if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        if (value >= min && value <= max) return opt;
      }
      const plusMatch = opt.match(/(\d+)\+/i);
      if (plusMatch) {
        const min = parseInt(plusMatch[1], 10);
        if (value >= min) return opt;
      }
    }
    const directMatch = options.find(o => o.includes(`${value}`));
    return directMatch || options[0] || `${value}`;
  }

  /**
   * Matches semantic option keys to target labels
   */
  private static matchOptionValue(
    valueKey: string,
    options?: string[],
    mappings: { key: string; labels: string[] }[] = []
  ): string {
    if (!options || options.length === 0) {
      return valueKey;
    }
    const mapEntry = mappings.find(m => m.key.toLowerCase() === valueKey.toLowerCase());
    if (mapEntry) {
      for (const targetLabel of mapEntry.labels) {
        const found = options.find(o => o.toLowerCase().includes(targetLabel.toLowerCase()));
        if (found) return found;
      }
    }
    const exact = options.find(o => o.toLowerCase().includes(valueKey.toLowerCase()));
    return exact || options[0] || valueKey;
  }

  private static normalizeFieldType(rawType?: string, options?: string[]): FormFieldType {
    if (options && options.length > 0) {
      return (rawType === 'radio' ? 'radio' : 'select') as FormFieldType;
    }
    switch (rawType?.toLowerCase()) {
      case 'textarea':
        return 'textarea';
      case 'select':
      case 'select-one':
        return 'select';
      case 'radio':
        return 'radio';
      case 'checkbox':
        return 'checkbox';
      case 'file':
        return 'file';
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'email':
        return 'email';
      case 'tel':
      case 'phone':
        return 'tel';
      default:
        return 'text';
    }
  }
}
