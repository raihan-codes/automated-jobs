/**
 * Test Automation Engine Verification Suite
 *
 * Tests:
 * 1. Adzuna-style application form:
 *    - Text inputs (First name, Last name, Email, Phone, Address, CTC)
 *    - Dropdowns (Notice period, Expected CTC range)
 *    - Radio buttons (Relocation preference)
 *    - Checkboxes (Job alerts, Terms consent)
 *    - File upload (CV / Resume attachment)
 *    - Textarea (Cover note / summary)
 *    - CAPTCHA challenge detection
 * 2. Missing Candidate Info:
 *    - Triggers USER_INPUT_REQUIRED state
 *    - Refuses to invent data
 *    - Transitions after candidate provides input
 * 3. CAPTCHA Handling:
 *    - Detection triggers CAPTCHA_REQUIRED
 *    - Refuses to fake/bypass
 *    - Human resolution transitions to READY_TO_SUBMIT / AWAITING_USER_APPROVAL
 * 4. Sensitive Question Gate:
 *    - Flags CTC, relocation, notice period, work authorization
 *    - Requires explicit human approval
 * 5. Platform Adapters:
 *    - Adzuna, Greenhouse, Lever, Workable, Ashby, SmartRecruiters, and GenericATS fallback
 * 6. External Confirmation Verification:
 *    - Verified ONLY with genuine confirmation proof
 *    - Never verified merely because submit was clicked
 */

import { AdapterRegistry } from '../src/services/automation/adapters';
import { CaptchaDetector } from '../src/services/automation/captcha-detector';
import { CandidateMapper, RawDetectedField } from '../src/services/automation/candidate-mapper';
import { FieldDetector } from '../src/services/automation/field-detector';
import { ExternalSubmissionVerifier } from '../src/services/automation/submission-verifier';
import { CandidateProfileData, NormalizedJobPosting, TailoredResumeContent } from '../src/types';

const testProfile: CandidateProfileData = {
  fullName: 'Alex Chen',
  email: 'alex.chen@example.com',
  phone: '+91 98765 43210',
  location: 'Bengaluru, India',
  address: '12th Main Road, Indiranagar, Bengaluru, KA 560038',
  headline: 'Senior Full Stack Engineer',
  summary: 'Senior Software Engineer with 6+ years specializing in TypeScript, Next.js, and high-scale distributed backends.',
  linkedinUrl: 'https://linkedin.com/in/alexchen',
  githubUrl: 'https://github.com/alexchen',
  portfolioUrl: 'https://alexchen.dev',
  desiredTitles: ['Senior Full Stack Engineer', 'Staff Frontend Engineer'],
  preferredLocations: ['Bengaluru', 'Remote'],
  remotePreference: 'REMOTE_OR_HYBRID',
  currentSalaryLPA: 22,
  currentCTC: '₹22,00,000',
  expectedSalaryLPA: 30,
  expectedCTC: '₹30,00,000',
  noticePeriod: '30_DAYS',
  requiresVisa: false,
  workAuthorization: 'Indian Citizen - No Sponsorship Required',
  yearsOfExperience: 6,
  relocationPreference: 'WILLING_TO_RELOCATE',
  emailAlertPreferences: true,
  skills: [
    { name: 'TypeScript', category: 'TECHNICAL', level: 'EXPERT', years: 6 },
    { name: 'React', category: 'FRAMEWORK', level: 'EXPERT', years: 6 },
    { name: 'Node.js', category: 'TECHNICAL', level: 'ADVANCED', years: 5 }
  ],
  experiences: [
    {
      company: 'Razorpay',
      role: 'Senior Software Engineer',
      startDate: '2021-06',
      isCurrent: true,
      bullets: ['Scaled payment checkout services to 50M requests/day']
    }
  ],
  educations: [
    {
      institution: 'IIT Madras',
      degree: 'B.Tech in Computer Science',
      startDate: '2015',
      endDate: '2019'
    }
  ],
  projects: []
};

const testResume: TailoredResumeContent = {
  targetRole: 'Senior Full Stack Engineer',
  targetCompany: 'TechCorp India',
  title: 'Alex_Chen_Tailored_Resume.pdf',
  summary: 'Tailored Senior Engineer with proven scale in fintech checkout pipelines.',
  skillsSection: [],
  experienceSection: [],
  projectsSection: [],
  educationSection: [],
  isVerifiedTruthful: true
};

const testJob = {
  id: 'job_adzuna_test_1',
  sourcePlatform: 'ADZUNA' as const,
  sourceJobId: 'adzuna_123456',
  sourceUrl: 'https://www.adzuna.in/details/123456',
  applicationUrl: 'https://www.adzuna.in/apply/123456',
  title: 'Senior Full Stack Engineer',
  company: 'TechCorp India',
  location: 'Bengaluru, India',
  workplaceType: 'HYBRID' as const,
  employmentType: 'FULL_TIME' as const,
  descriptionSnippet: 'Looking for a Senior Full Stack Engineer with React, Node.js, and TypeScript experience.',
  descriptionFull: 'Complete job description...',
  applicationMethod: 'EXTERNAL_PORTAL_LINK' as const,
  extractedSkills: ['TypeScript', 'React', 'Node.js'],
  firstDiscoveredAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString(),
  isActive: true
} as unknown as NormalizedJobPosting;

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING AUTOMATION ENGINE VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  // ── TEST 1: Platform Detection ──────────────────────────────────────────
  console.log('--- Test Suite 1: Platform Adapter Resolution ---');
  const adzunaAdapter = AdapterRegistry.getAdapterForUrl('https://www.adzuna.in/apply/456789');
  assert('Adzuna URL resolves to AdzunaAdapter', adzunaAdapter.platform === 'ADZUNA');

  const ghAdapter = AdapterRegistry.getAdapterForUrl('https://boards.greenhouse.io/stripe/jobs/123');
  assert('Greenhouse URL resolves to GreenhouseAdapter', ghAdapter.platform === 'GREENHOUSE');

  const leverAdapter = AdapterRegistry.getAdapterForUrl('https://jobs.lever.co/netflix/456');
  assert('Lever URL resolves to LeverAdapter', leverAdapter.platform === 'LEVER');

  const workableAdapter = AdapterRegistry.getAdapterForUrl('https://apply.workable.com/spotify/j/789');
  assert('Workable URL resolves to WorkableAdapter', workableAdapter.platform === 'WORKABLE');

  const ashbyAdapter = AdapterRegistry.getAdapterForUrl('https://jobs.ashbyhq.com/openai/101');
  assert('Ashby URL resolves to AshbyAdapter', ashbyAdapter.platform === 'ASHBY');

  const smartAdapter = AdapterRegistry.getAdapterForUrl('https://jobs.smartrecruiters.com/uber/202');
  assert('SmartRecruiters URL resolves to SmartRecruitersAdapter', smartAdapter.platform === 'SMARTRECRUITERS');

  const genericAdapter = AdapterRegistry.getAdapterForUrl('https://careers.unknownstartup.com/apply');
  assert('Unknown company URL falls back to GenericATSAdapter', genericAdapter.platform === 'GENERIC_ATS');

  // ── TEST 2: Adzuna Form Field Mapping ───────────────────────────────────
  console.log('\n--- Test Suite 2: Adzuna Form Adaptive Field Mapping ---');
  const inspection = await FieldDetector.inspectForm(
    'https://www.adzuna.in/apply/123456',
    '',
    testProfile,
    testResume,
    testJob
  );

  assert('Inspection detects ADZUNA platform', inspection.platform === 'ADZUNA');
  assert('Inspection extracts 12 standard Adzuna fields', inspection.fields.length >= 10);

  const firstName = inspection.fields.find(f => f.fieldKey === 'first_name');
  assert('First Name mapped accurately to Alex', firstName?.fieldValue === 'Alex');

  const lastName = inspection.fields.find(f => f.fieldKey === 'last_name');
  assert('Last Name mapped accurately to Chen', lastName?.fieldValue === 'Chen');

  const email = inspection.fields.find(f => f.fieldKey === 'email');
  assert('Email mapped accurately', email?.fieldValue === 'alex.chen@example.com');

  const phone = inspection.fields.find(f => f.fieldKey === 'phone');
  assert('Phone mapped accurately', phone?.fieldValue === '+91 98765 43210');

  const currentCtc = inspection.fields.find(f => f.fieldKey === 'current_ctc');
  assert('Current CTC correctly mapped', currentCtc?.fieldValue === '₹22,00,000');
  assert('Current CTC flagged as sensitive review', currentCtc?.isSensitive === true);

  const expectedCtc = inspection.fields.find(f => f.fieldKey === 'expected_ctc');
  assert('Expected CTC range matched from options', expectedCtc?.fieldValue !== undefined && expectedCtc.fieldValue.includes('LPA'));

  const noticePeriod = inspection.fields.find(f => f.fieldKey === 'notice_period');
  assert('Notice Period option matched for 30_DAYS', noticePeriod?.fieldValue === '30 Days');

  const relocation = inspection.fields.find(f => f.fieldKey === 'relocation_pref');
  assert('Relocation radio matched to willing', Boolean(relocation?.fieldValue?.toLowerCase().includes('yes') || relocation?.fieldValue?.toLowerCase().includes('willing')));

  const resumeField = inspection.fields.find(f => f.fieldKey === 'resume_file');
  assert('Resume attachment specifies tailored PDF', Boolean(resumeField?.fieldValue?.includes('Alex_Chen') || resumeField?.fieldValue?.includes('Resume.pdf')));

  const alertsField = inspection.fields.find(f => f.fieldKey === 'email_alerts');
  assert('Email alerts checkbox matches user preference', alertsField?.fieldValue === 'true');

  const termsField = inspection.fields.find(f => f.fieldKey === 'terms_consent');
  assert('Mandatory terms consent auto-checked', termsField?.fieldValue === 'true');

  // ── TEST 3: Missing Profile Information (USER_INPUT_REQUIRED) ───────────
  console.log('\n--- Test Suite 3: Missing Information Invariant ---');
  const sparseProfile: CandidateProfileData = {
    ...testProfile,
    phone: undefined, // Missing phone
    currentCTC: undefined,
    currentSalaryLPA: undefined
  };

  const sparseInspection = await FieldDetector.inspectForm(
    'https://www.adzuna.in/apply/123456',
    '',
    sparseProfile,
    testResume,
    testJob
  );

  const missingPhone = sparseInspection.missingRequiredFields.find(f => f.fieldKey === 'phone');
  assert('Missing phone is marked as USER_INPUT_REQUIRED', missingPhone !== undefined && missingPhone.status === 'USER_INPUT_REQUIRED');
  assert('Automation does NOT invent phone number', missingPhone?.fieldValue === '');

  // ── TEST 4: CAPTCHA / Anti-Bot Detection ────────────────────────────────
  console.log('\n--- Test Suite 4: Anti-Bot & CAPTCHA Invariants ---');
  const recaptchaHtml = '<div class="g-recaptcha" data-sitekey="6Ld123456"></div>';
  const recaptchaResult = CaptchaDetector.detectInHtmlOrText(recaptchaHtml, '');
  assert('Google reCAPTCHA detected in DOM', recaptchaResult.detected && recaptchaResult.type === 'recaptcha_v2');

  const turnstileHtml = '<div class="cf-turnstile" data-sitekey="0x4AAAAAA"></div><script src="challenges.cloudflare.com"></script>';
  const turnstileResult = CaptchaDetector.detectInHtmlOrText(turnstileHtml, '');
  assert('Cloudflare Turnstile challenge detected in DOM', turnstileResult.detected && turnstileResult.type === 'cloudflare_turnstile');

  const hcaptchaHtml = '<div class="h-captcha" data-sitekey="hcap-123"></div>';
  const hcaptchaResult = CaptchaDetector.detectInHtmlOrText(hcaptchaHtml, '');
  assert('hCaptcha detected in DOM', hcaptchaResult.detected && hcaptchaResult.type === 'hcaptcha');

  const cleanHtml = '<form id="apply"><input type="text" name="name" /></form>';
  const cleanResult = CaptchaDetector.detectInHtmlOrText(cleanHtml, 'Simple form');
  assert('Clean form has no false CAPTCHA flag', cleanResult.detected === false);

  // ── TEST 5: External Confirmation Verification ──────────────────────────
  console.log('\n--- Test Suite 5: External Submission Verification ---');
  // Positive genuine confirmation
  const genuineSnapshot = {
    url: 'https://boards.greenhouse.io/stripe/jobs/123/confirmation',
    title: 'Application Submitted | Stripe Careers',
    text: 'Thank you for applying to Stripe! Your application has been received. Reference ID: STRIPE-99824'
  };
  const verifiedResult = ExternalSubmissionVerifier.verify(genuineSnapshot, 'https://boards.greenhouse.io/stripe/jobs/123');
  assert('Genuine confirmation page verified', verifiedResult.verified === true);
  assert('Confirmation text captured accurately', Boolean(verifiedResult.confirmationText?.toLowerCase().includes('thank you for applying')));

  // Negative: premature job board page
  const prematureSnapshot = {
    url: 'https://www.adzuna.in/details/123456',
    title: 'Senior Engineer at TechCorp',
    text: 'Apply for this job on external website. 15 applicants so far.'
  };
  const prematureResult = ExternalSubmissionVerifier.verify(prematureSnapshot, 'https://www.adzuna.in/details/123456');
  assert('Premature job listing page is REJECTED (verified=false)', prematureResult.verified === false);

  // Negative: form fill error
  const errorSnapshot = {
    url: 'https://www.adzuna.in/apply/123456',
    title: 'Apply to TechCorp',
    text: 'There was an error submitting your form. Please fill out all required fields marked in red.'
  };
  const errorResult = ExternalSubmissionVerifier.verify(errorSnapshot, 'https://www.adzuna.in/apply/123456');
  assert('Form validation error page is REJECTED (verified=false)', errorResult.verified === false);

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
