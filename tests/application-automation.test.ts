// Comprehensive Integration & Unit Test Suite for Universal Adaptive Job Application Automation Engine
// Tests Scenarios A through O as mandated by specification

import { FieldDetector } from '../src/services/automation/field-detector';
import { CandidateMapper, RawDetectedField } from '../src/services/automation/candidate-mapper';
import { CaptchaDetector } from '../src/services/automation/captcha-detector';
import { ExternalSubmissionVerifier, PageSnapshot } from '../src/services/automation/submission-verifier';
import { AdapterRegistry } from '../src/services/automation/adapters';
import { ATSPlaywrightWorker } from '../src/services/automation/ats-playwright-worker';
import { CandidateProfileData, NormalizedJobPosting, TailoredResumeContent } from '../src/types';
import { db } from '../src/lib/db';

async function runApplicationAutomationTestSuite() {
  console.log('================================================================');
  console.log('🚀 Running Universal Adaptive Application Automation Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // Verified Candidate Profile fixture (SINGLE SOURCE OF TRUTH)
  const candidateProfile: CandidateProfileData = {
    id: 'user_alex_chen',
    fullName: 'Alex Chen',
    email: 'alex.chen@example.com',
    phone: '+91 98765 43210',
    location: 'Bengaluru, Karnataka',
    address: 'Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
    headline: 'Senior Full Stack Software Engineer',
    summary: 'Experienced Full Stack Engineer specializing in TypeScript, React, Node.js and distributed systems.',
    linkedinUrl: 'https://linkedin.com/in/alexchen',
    githubUrl: 'https://github.com/alexchen',
    portfolioUrl: 'https://alexchen.dev',
    desiredTitles: ['Senior Software Engineer', 'Full Stack Engineer'],
    preferredLocations: ['Bengaluru', 'Remote'],
    remotePreference: 'REMOTE_OR_HYBRID',
    yearsOfExperience: 5.5,
    currentSalaryLPA: 18,
    currentCTC: '₹18,00,000',
    expectedSalaryLPA: 25,
    expectedCTC: '₹25,00,000',
    noticePeriod: '30_DAYS',
    relocationPreference: 'WILLING_TO_RELOCATE',
    requiresVisa: false,
    workAuthorization: 'Authorized to work without sponsorship',
    emailAlertPreferences: true,
    skills: [
      { name: 'TypeScript', category: 'TECHNICAL', years: 5, level: 'ADVANCED' },
      { name: 'React', category: 'FRAMEWORK', years: 5, level: 'ADVANCED' },
      { name: 'Node.js', category: 'FRAMEWORK', years: 5, level: 'ADVANCED' },
      { name: 'PostgreSQL', category: 'TECHNICAL', years: 4, level: 'ADVANCED' },
      { name: 'AWS', category: 'TOOL', years: 3, level: 'INTERMEDIATE' }
    ],
    experiences: [
      {
        company: 'Stripe India',
        role: 'Software Engineer II',
        startDate: '2022-01',
        isCurrent: true,
        bullets: ['Engineered high-throughput payments orchestration pipeline.']
      }
    ],
    educations: [
      {
        institution: 'National Institute of Technology',
        degree: 'Bachelor of Technology (B.Tech)',
        fieldOfStudy: 'Computer Science and Engineering',
        startDate: '2016',
        endDate: '2020'
      }
    ],
    projects: []
  };

  const sampleJob: NormalizedJobPosting = {
    sourcePlatform: 'ADZUNA',
    sourceJobId: 'adz_prod_101',
    company: 'TechFlow Systems',
    title: 'Senior Full Stack Engineer',
    location: 'Bengaluru, India',
    isRemote: true,
    employmentType: 'FULL_TIME',
    salaryCurrency: 'INR',
    descriptionRaw: 'Senior Full Stack Engineer role requiring React and TypeScript.',
    postedAt: new Date(),
    updatedAt: new Date(),
    sourceUrl: 'https://adzuna.in/details/101',
    applicationUrl: 'https://adzuna.in/apply/101'
  };

  // Seed store with test job posting
  (db as any).jobPostings = [
    {
      ...sampleJob,
      id: 'adz_prod_101',
      tenantId: 'tenant_prod_enterprise_1',
      fingerprint: 'fp_101',
      lastSyncedAt: new Date().toISOString()
    }
  ];
  db.profiles.set('user_alex_chen', candidateProfile);

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO A: Simple Single-Page Form
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario A: Simple Single-Page Form ---');
  const simpleHtml = `
    <form action="/apply" method="POST">
      <label for="fname">First Name</label>
      <input id="fname" name="first_name" type="text" required />
      <label for="lname">Last Name</label>
      <input id="lname" name="last_name" type="text" required />
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
      <button type="submit">Submit Application</button>
    </form>
  `;
  const inspectionA = await FieldDetector.inspectForm('https://careers.startup.io/apply', simpleHtml, candidateProfile);
  assert(inspectionA.fields.length >= 3, 'Scenario A: Detects all form input elements');
  assert(inspectionA.fields.find(f => f.fieldKey === 'first_name')?.fieldValue === 'Alex', 'Scenario A: Mapped First Name to Alex');
  assert(inspectionA.fields.find(f => f.fieldKey === 'last_name')?.fieldValue === 'Chen', 'Scenario A: Mapped Last Name to Chen');
  assert(inspectionA.fields.find(f => f.fieldKey === 'email')?.fieldValue === 'alex.chen@example.com', 'Scenario A: Mapped Email to candidate email');
  assert(!inspectionA.isMultiStep, 'Scenario A: Correctly identifies single-page form');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO B: Adzuna-Style Form (Text, Dropdowns, Radio, CV, Textarea, CAPTCHA, Submit)
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario B: Adzuna-Style Application Form ---');
  const adzunaAdapter = AdapterRegistry.getAdapterForUrl('https://www.adzuna.in/land/ad/101');
  assert(adzunaAdapter.platform === 'ADZUNA', 'Scenario B: Identified Adzuna platform adapter');

  const adzunaHtml = `
    <form id="adzuna-apply-form">
      <input id="first_name" name="first_name" type="text" required />
      <input id="last_name" name="last_name" type="text" required />
      <input id="email" name="email" type="email" required />
      <input id="phone" name="phone" type="tel" required />
      <input id="address" name="address" type="text" required />
      <input id="current_ctc" name="current_ctc" type="text" />
      <select id="expected_ctc" name="expected_ctc" required>
        <option value="">Select CTC</option>
        <option value="₹15-20 LPA">₹15-20 LPA</option>
        <option value="₹20-25 LPA">₹20-25 LPA</option>
        <option value="₹25-35 LPA">₹25-35 LPA</option>
      </select>
      <select id="notice_period" name="notice_period" required>
        <option value="Immediate (0-15 days)">Immediate (0-15 days)</option>
        <option value="30 Days">30 Days</option>
        <option value="60 Days">60 Days</option>
      </select>
      <input type="radio" name="relocation" value="Yes, willing to relocate" />
      <input type="radio" name="relocation" value="No, remote or current city only" />
      <input type="file" id="resume_file" name="cv" required />
      <textarea id="cover_letter" name="notes"></textarea>
      <input type="checkbox" name="email_alerts" id="job_alerts" />
      <input type="checkbox" name="terms" id="terms_consent" required />
      <div class="g-recaptcha" data-sitekey="6LdXYZ..."></div>
      <button type="submit">Submit Application</button>
    </form>
  `;

  const inspectionB = await FieldDetector.inspectForm('https://www.adzuna.in/apply/101', adzunaHtml, candidateProfile, undefined, sampleJob);
  assert(inspectionB.fields.length >= 12, 'Scenario B: Detected all Adzuna form fields (text, select, radio, file, textarea, checkbox)');
  assert(inspectionB.fields.find(f => f.fieldKey === 'first_name')?.fieldValue === 'Alex', 'Scenario B: First Name auto-filled');
  assert(inspectionB.fields.find(f => f.fieldKey === 'email')?.fieldValue === 'alex.chen@example.com', 'Scenario B: Email auto-filled');
  assert(inspectionB.fields.find(f => f.fieldKey === 'expected_ctc')?.fieldValue === '₹20-25 LPA', 'Scenario B: Expected CTC matches candidate expected LPA range');
  assert(inspectionB.fields.find(f => f.fieldKey === 'notice_period')?.fieldValue === '30 Days', 'Scenario B: Notice Period matched candidate 30 days');
  assert(inspectionB.fields.find(f => f.fieldKey === 'relocation_pref')?.fieldValue === 'Yes, willing to relocate', 'Scenario B: Relocation matched candidate preference');
  assert(inspectionB.fields.find(f => f.fieldKey === 'terms_consent')?.fieldValue === 'true', 'Scenario B: Terms consent auto-selected for submission');
  assert(inspectionB.captcha.detected === true, 'Scenario B: CAPTCHA detected on Adzuna form');

  // Prepare application via ATSPlaywrightWorker
  const prepResultB = await ATSPlaywrightWorker.prepareApplication('user_alex_chen', sampleJob, candidateProfile, undefined, adzunaHtml);
  assert(prepResultB.status === 'CAPTCHA_REQUIRED', 'Scenario B: Application paused at CAPTCHA_REQUIRED state');
  assert(prepResultB.captchaDetected === true, 'Scenario B: Noted CAPTCHA in execution result');


  // Resolve CAPTCHA manually
  const resolveB = await ATSPlaywrightWorker.resolveCaptcha(prepResultB.id!, 'user_alex_chen');
  assert(resolveB.status === 'AWAITING_USER_APPROVAL', 'Scenario B: Transitions to AWAITING_USER_APPROVAL after manual CAPTCHA resolution');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO C: Greenhouse-Style Form
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario C: Greenhouse-Style Form ---');
  const greenhouseAdapter = AdapterRegistry.getAdapterForUrl('https://boards.greenhouse.io/figma/jobs/401');
  assert(greenhouseAdapter.platform === 'GREENHOUSE', 'Scenario C: Greenhouse platform identified');
  const ghFields = await greenhouseAdapter.extractFields('');
  assert(ghFields.some((f: any) => f.id === 'first_name') && ghFields.some((f: any) => f.id === 'resume'), 'Scenario C: Extracted standard Greenhouse schema');


  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO D: Lever-Style Form
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario D: Lever-Style Form ---');
  const leverAdapter = AdapterRegistry.getAdapterForUrl('https://jobs.lever.co/netflix/501');
  assert(leverAdapter.platform === 'LEVER', 'Scenario D: Lever platform identified');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO E: Workable-Style Form
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario E: Workable-Style Form ---');
  const workableAdapter = AdapterRegistry.getAdapterForUrl('https://apply.workable.com/spotify/j/601');
  assert(workableAdapter.platform === 'WORKABLE', 'Scenario E: Workable platform identified');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO F: Ashby-Style Form
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario F: Ashby-Style Form ---');
  const ashbyAdapter = AdapterRegistry.getAdapterForUrl('https://jobs.ashbyhq.com/openai/701');
  assert(ashbyAdapter.platform === 'ASHBY', 'Scenario F: Ashby platform identified');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO G: Multi-Step Application Navigation
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario G: Multi-Step Application ---');
  const multiStepHtml = `
    <div class="steps-indicator">Step 1 of 4: Personal Information</div>
    <form>
      <input name="name" type="text" required />
      <button type="button" class="btn-next">Next Step</button>
    </form>
  `;
  const inspectionG = await FieldDetector.inspectForm('https://jobs.example.com/apply/step1', multiStepHtml, candidateProfile);
  assert(inspectionG.isMultiStep === true, 'Scenario G: Detected multi-step application');
  assert(inspectionG.currentStep === 1 && inspectionG.totalSteps === 4, 'Scenario G: Extracted current step (1) and total steps (4)');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO H: Form with File / CV Upload
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario H: File / CV Upload ---');
  const fileHtml = `
    <form>
      <label for="resume">Attach Resume (PDF, DOCX)</label>
      <input type="file" id="resume" name="resume" accept=".pdf,.doc,.docx" required />
    </form>
  `;
  const inspectionH = await FieldDetector.inspectForm('https://jobs.corp.com/apply', fileHtml, candidateProfile);
  const fileField = inspectionH.fields.find(f => f.fieldType === 'file');
  assert(fileField !== undefined, 'Scenario H: Detected file upload field');
  assert(Boolean(fileField?.fieldValue?.endsWith('.pdf')), 'Scenario H: Attached candidate tailored resume PDF');


  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO I: Form with Dropdowns and Radio Buttons
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario I: Dropdowns & Radio Buttons ---');
  const dropHtml = `
    <form>
      <label>Are you authorized to work in India?</label>
      <select name="work_auth">
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
      <label>Will you require sponsorship?</label>
      <input type="radio" name="sponsorship" value="Yes" />
      <input type="radio" name="sponsorship" value="No" />
    </form>
  `;
  const inspectionI = await FieldDetector.inspectForm('https://jobs.tech.com/apply', dropHtml, candidateProfile);
  const authField = inspectionI.fields.find(f => f.fieldKey === 'work_auth');
  const sponsorField = inspectionI.fields.find(f => f.fieldKey === 'sponsorship');
  assert(authField?.fieldValue === 'Yes', 'Scenario I: Work authorization dropdown mapped to Yes from profile');
  assert(sponsorField?.fieldValue === 'No', 'Scenario I: Sponsorship radio mapped to No (requiresVisa=false)');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO J: Custom Employer Questions (Zero Fabrication)
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario J: Custom Employer Questions (Truthfulness & Zero-Fabrication) ---');
  const customHtml = `
    <form>
      <label for="q1">How many years of React experience do you have?</label>
      <input id="q1" name="react_experience_years" type="text" required />
      <label for="q2">Describe your experience with Rust and WebAssembly?</label>
      <textarea id="q2" name="rust_experience" required></textarea>
    </form>
  `;
  const inspectionJ = await FieldDetector.inspectForm('https://jobs.custom.com/apply', customHtml, candidateProfile);
  const reactQ = inspectionJ.fields.find(f => f.fieldKey === 'react_experience_years');
  const rustQ = inspectionJ.fields.find(f => f.fieldKey === 'rust_experience');

  assert(reactQ?.fieldValue === '5', 'Scenario J: React question mapped verified 5 years from profile');
  assert(rustQ?.status === 'USER_INPUT_REQUIRED', 'Scenario J: Unverified skill (Rust) marked USER_INPUT_REQUIRED without fabrication');
  assert(rustQ?.fieldValue === '', 'Scenario J: Zero fabrication: Rust answer left empty for user input');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO K: Anti-Bot / CAPTCHA Pause
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario K: Anti-Bot / Cloudflare Challenge ---');
  const cloudflareHtml = `
    <div id="challenge-stage">
      <iframe src="https://challenges.cloudflare.com/turnstile/v0/api.js"></iframe>
      <p>Verify you are human before applying</p>
    </div>
  `;
  const captchaK = CaptchaDetector.detectInHtmlOrText(cloudflareHtml, 'Verify you are human before applying');
  assert(captchaK.detected === true, 'Scenario K: Detected Cloudflare challenge');
  assert(captchaK.type === 'cloudflare_turnstile', 'Scenario K: Identified challenge type as cloudflare_turnstile');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO L: Login Wall Detection
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario L: Login Wall Detection ---');
  const loginHtml = `
    <div class="login-container">
      <h2>Sign in to apply for this position</h2>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
    </div>
  `;
  const loginL = CaptchaDetector.detectLoginRequired(loginHtml, 'Sign in to apply for this position');
  assert(loginL.detected === true, 'Scenario L: Detected login required wall');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO M: Multi-Factor Authentication (MFA / OTP) Detection
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario M: MFA / 2FA Challenge Detection ---');
  const mfaHtml = `
    <div class="mfa-box">
      <h3>Two-Factor Authentication</h3>
      <p>Enter the 6-digit verification code sent to your mobile phone</p>
      <input type="text" maxlength="6" name="otp_code" />
    </div>
  `;
  const mfaM = CaptchaDetector.detectMfa(mfaHtml, 'Enter the 6-digit verification code sent to your mobile phone');
  assert(mfaM.detected === true, 'Scenario M: Detected MFA / 2FA challenge');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO N: Conditional Fields
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario N: Conditional Fields ---');
  const conditionalHtml = `
    <form>
      <label>Do you require visa sponsorship?</label>
      <select name="sponsorship">
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
      <div class="conditional-field" data-conditional="sponsorship=Yes" style="display:none">
        <label for="visa_details">Please describe your current visa type</label>
        <input id="visa_details" name="visa_type" type="text" required />
      </div>
    </form>
  `;
  const inspectionN = await FieldDetector.inspectForm('https://jobs.conditional.com/apply', conditionalHtml, candidateProfile);
  assert(inspectionN.hasConditionalFields === true, 'Scenario N: Detected conditional fields in application form');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO O: Unknown / Generic ATS Fallback
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Scenario O: Unknown / Generic ATS Fallback ---');
  const unknownUrl = 'https://careers.obscure-company.io/portal/job/999';
  const adapterO = AdapterRegistry.getAdapterForUrl(unknownUrl);
  assert(adapterO.platform === 'GENERIC_ATS', 'Scenario O: Falls back cleanly to GenericATSAdapter');

  // ────────────────────────────────────────────────────────────────────────────
  // SCENARIO P: Submission Verification Invariants (CRITICAL)
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Submission Verification Invariants & Failure Handling ---');

  // P1: Job listing page on Adzuna must NEVER be verified as submitted
  const snapshotJobBoard: PageSnapshot = {
    url: 'https://www.adzuna.in/details/101',
    text: 'Senior Full Stack Engineer. Apply for this job. Similar jobs in Bengaluru.'
  };
  const verifJobBoard = ExternalSubmissionVerifier.verify(snapshotJobBoard);
  assert(verifJobBoard.verified === false, 'Verification: Job board listing page rejected from SUBMITTED');

  // P2: Explicit ATS failure text must result in SUBMISSION_FAILED
  const snapshotFailed: PageSnapshot = {
    url: 'https://boards.greenhouse.io/figma/jobs/401',
    text: 'Error submitting application: required fields are missing. Please correct the errors below.'
  };
  const attemptFailed = ExternalSubmissionVerifier.evaluateAttemptResult(snapshotFailed);
  assert(attemptFailed.finalStatus === 'SUBMISSION_FAILED', 'Verification: Explicit ATS failure gives SUBMISSION_FAILED');

  // P3: Genuine external confirmation gives SUBMITTED
  const snapshotConfirmed: PageSnapshot = {
    url: 'https://boards.greenhouse.io/figma/jobs/401/confirmation',
    text: 'Thank you for applying to Figma! Your application has been received. Reference ID: FIGMA-98421'
  };
  const attemptConfirmed = ExternalSubmissionVerifier.evaluateAttemptResult(snapshotConfirmed);
  assert(attemptConfirmed.finalStatus === 'SUBMITTED', 'Verification: Genuine confirmation text & ID gives SUBMITTED');
  assert(attemptConfirmed.submissionVerification.confirmationId === 'FIGMA-98421', 'Verification: Extracted accurate confirmation ID FIGMA-98421');

  // P4: Ambiguous page without confirmation signals gives EXTERNAL_CONFIRMATION_REQUIRED
  const snapshotAmbiguous: PageSnapshot = {
    url: 'https://jobs.lever.co/stripe/checkout',
    text: 'Please review your application details.'
  };
  const attemptAmbiguous = ExternalSubmissionVerifier.evaluateAttemptResult(snapshotAmbiguous);
  assert(attemptAmbiguous.finalStatus === 'EXTERNAL_CONFIRMATION_REQUIRED', 'Verification: Ambiguous page gives EXTERNAL_CONFIRMATION_REQUIRED without fabrication');

  console.log('\n================================================================');
  console.log(`🎯 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runApplicationAutomationTestSuite().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
