// Comprehensive Integration & Unit Test Suite for AutoApply AI
import { JobDeduplicator } from '../src/services/ingestion/deduplicator';
import { GreenhouseAdapter } from '../src/services/ingestion/greenhouse';
import { LeverAdapter } from '../src/services/ingestion/lever';
import { AshbyAdapter } from '../src/services/ingestion/ashby';
import { WorkableAdapter } from '../src/services/ingestion/workable';
import { JDAnalyzer } from '../src/services/ai/jd-analyzer';
import { JobMatcher } from '../src/services/ai/matcher';
import { TruthfulnessValidator } from '../src/services/ai/truthfulness-validator';
import { ResumeGenerator } from '../src/services/ai/resume-generator';
import { FieldClassifier } from '../src/services/automation/field-classifier';
import { FormPrefillEngine } from '../src/services/automation/form-prefill';
import { db } from '../src/lib/db';
import { CandidateProfileData, NormalizedJobPosting, TailoredResumeContent } from '../src/types';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Running AutoApply AI System Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Deduplicator & Fingerprinting Tests
  console.log('\n--- 1. Ingestion Deduplication & Fingerprinting ---');
  const fp1 = JobDeduplicator.generateFingerprint({
    company: 'Figma',
    title: 'Senior Software Engineer',
    location: 'San Francisco, CA',
    sourcePlatform: 'GREENHOUSE',
    sourceJobId: '12345'
  });
  const fp2 = JobDeduplicator.generateFingerprint({
    company: '  figma  ',
    title: 'Senior Software Engineer ',
    location: 'san francisco, ca',
    sourcePlatform: 'GREENHOUSE',
    sourceJobId: '12345'
  });
  assert(fp1 === fp2, 'Generates identical SHA-256 fingerprint for normalized job properties');

  const cleanUrl = JobDeduplicator.canonicalizeUrl('https://boards.greenhouse.io/figma/jobs/12345?gh_jid=12345&utm_source=linkedin');
  assert(cleanUrl === 'https://boards.greenhouse.io/figma/jobs/12345', 'Strips tracking and UTM parameters from canonical URL');

  // 2. ATS Adapter Normalization Tests
  console.log('\n--- 2. ATS Adapters Normalization ---');
  const ghAdapter = new GreenhouseAdapter();
  const normalizedGh = ghAdapter.normalizeJob({
    id: 9988,
    title: 'Full Stack Engineer (Remote)',
    location: { name: 'US Remote' },
    content: '<p>Experience with React and Node.js required.</p>',
    updated_at: '2026-08-01T12:00:00Z'
  }, 'Stripe');
  assert(normalizedGh !== null && normalizedGh.isRemote === true && normalizedGh.company === 'Stripe', 'Greenhouse adapter normalizes raw board payload');

  const leverAdapter = new LeverAdapter();
  const normalizedLever = leverAdapter.normalizeJob({
    id: 'lev_123',
    text: 'Staff Systems Engineer',
    categories: { location: 'San Francisco, CA', commitment: 'Full-time' },
    description: '<p>Go and Kubernetes</p>',
    createdAt: 1720000000000
  }, 'Anthropic');
  assert(normalizedLever !== null && normalizedLever.experienceLevel === 'SENIOR', 'Lever adapter extracts seniority & metadata');

  // 3. JD Analyzer & Hard Filter Tests
  const candidate: CandidateProfileData = {
    id: 'user_alex_chen',
    fullName: 'Alex Chen',
    email: 'alex.chen@example.com',
    location: 'San Francisco, CA',
    headline: 'Senior Full Stack Software Engineer',
    yearsOfExperience: 5,
    minSalary: 140000,
    requiresVisa: false,
    remotePreference: 'FLEXIBLE',
    desiredTitles: ['Full Stack Software Engineer', 'Senior Software Engineer'],
    skills: [
      { name: 'TypeScript', years: 5, level: 'EXPERT' },
      { name: 'React', years: 5, level: 'EXPERT' },
      { name: 'Node.js', years: 5, level: 'EXPERT' },
      { name: 'PostgreSQL', years: 4, level: 'ADVANCED' },
      { name: 'Redis', years: 3, level: 'ADVANCED' },
      { name: 'WebSockets', years: 3, level: 'ADVANCED' },
      { name: 'Go', years: 3, level: 'ADVANCED' }
    ],
    experiences: [
      {
        company: 'Veloce Data Systems',
        role: 'Senior Software Engineer',
        startDate: '2023',
        endDate: 'Present',
        isCurrent: true,
        bullets: ['Architected real-time event streaming pipeline processing 15M+ events/day using Node.js.']
      }
    ],
    educations: [
      {
        institution: 'University of California, Berkeley',
        degree: 'B.S. in Computer Science',
        startYear: 2015,
        endYear: 2019
      }
    ],
    projects: [
      {
        title: 'Realtime Collaboration Engine',
        technologies: ['TypeScript', 'React', 'WebSockets', 'Go'],
        bullets: ['Built live multi-user collaborative canvas.']
      }
    ]
  };
  const onsiteJob: NormalizedJobPosting = {
    sourcePlatform: 'GREENHOUSE',
    sourceJobId: 'onsite_1',
    sourceUrl: 'https://example.com/job',
    canonicalUrl: 'https://example.com/job',
    company: 'Tokyo Tech',
    title: 'Backend Engineer',
    location: 'Tokyo, Japan',
    isRemote: false,
    employmentType: 'FULL_TIME',
    salaryCurrency: 'USD',
    descriptionRaw: 'Must work onsite in Tokyo office.',
    postedAt: new Date(),
    updatedAt: new Date()
  };

  const hardFilterOnsite = JDAnalyzer.evaluateHardFilters(
    { ...candidate, remotePreference: 'REMOTE', location: 'San Francisco, CA' },
    onsiteJob
  );
  assert(hardFilterOnsite.passed === false, 'Hard filter catches onsite job located outside candidate base city');

  // 4. AI Job Matching Engine Tests
  console.log('\n--- 4. AI Job Matching & Scoring Engine ---');
  const figmaJob = db.jobPostings.find(j => j.company === 'Figma')!;
  const matchResult = await JobMatcher.analyzeMatch(candidate, figmaJob);
  assert(matchResult.overallScore >= 90, 'High match score (>=90) for candidate stack match');
  assert(matchResult.matchedSkills.includes('TypeScript') && matchResult.matchedSkills.includes('React'), 'Identifies matched skills');
  assert(typeof matchResult.whyMatchReason === 'string' && matchResult.whyMatchReason.length > 20, 'Generates deep justification text');

  // 5. Anti-Hallucination Truthfulness Verification Tests
  console.log('\n--- 5. Anti-Hallucination & Truthfulness Validator ---');
  // 5a. Clean genuine resume
  const cleanResume: TailoredResumeContent = {
    title: 'Alex Chen - Full Stack',
    targetRole: 'Full Stack Engineer',
    targetCompany: 'Figma',
    summary: 'Senior Software Engineer with experience in TypeScript, React, and Node.js.',
    skillsSection: [
      { category: 'Core', skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'] }
    ],
    experienceSection: [
      {
        company: 'Veloce Data Systems',
        role: 'Senior Software Engineer',
        period: '2023 - Present',
        bullets: ['Architected real-time event streaming pipeline processing 15M+ events/day using Node.js.']
      }
    ],
    projectsSection: [],
    educationSection: [
      { institution: 'University of California, Berkeley', degree: 'B.S. in Computer Science' }
    ],
    isVerifiedTruthful: true
  };

  const cleanAudit = TruthfulnessValidator.verifyResume(candidate, cleanResume);
  assert(cleanAudit.isVerifiedTruthful === true && cleanAudit.flaggedCount === 0, 'Approves 100% verified truthful candidate claims');

  // 5b. Fabricated hallucinated resume
  const hallucinatedResume: TailoredResumeContent = {
    title: 'Alex Chen - Fake Resume',
    targetRole: 'Lead Quantum Engineer',
    targetCompany: 'Figma',
    summary: 'PhD in Quantum Physics from MIT with 10 years at Google Brain.',
    skillsSection: [
      { category: 'Core', skills: ['Quantum Computing', 'Fortran', 'TypeScript'] } // Quantum Computing & Fortran not in profile
    ],
    experienceSection: [
      {
        company: 'Google Brain AI Labs', // Not in profile
        role: 'Principal Scientist',
        period: '2019 - 2023',
        bullets: ['Invented GPT-5 neural architecture with 100 Trillion parameters.']
      }
    ],
    projectsSection: [],
    educationSection: [
      { institution: 'Massachusetts Institute of Technology (MIT)', degree: 'Ph.D. in Quantum Mechanics' } // Not in profile
    ],
    isVerifiedTruthful: true
  };

  const fakeAudit = TruthfulnessValidator.verifyResume(candidate, hallucinatedResume);
  assert(fakeAudit.isVerifiedTruthful === false, 'Strictly catches and rejects fabricated unearned claims');
  assert(fakeAudit.violations.some(v => v.claim.includes('Google Brain')), 'Flags unverified company history');
  assert(fakeAudit.violations.some(v => v.claim.includes('MIT') || v.claim.includes('Massachusetts')), 'Flags unverified education degrees');
  assert(fakeAudit.violations.some(v => v.claim.includes('Quantum Computing') || v.claim.includes('Fortran')), 'Flags unverified skills');

  // 6. Automation Field Classifier & Human Approval Gate
  console.log('\n--- 6. Field Classifier & Human Approval Safety Gate ---');
  assert(FieldClassifier.isSensitiveField('What are your salary expectations for this role?', 'salary') === true, 'Classifies compensation questions as sensitive');
  assert(FieldClassifier.isSensitiveField('Will you now or in the future require visa sponsorship?', 'visa_sponsorship') === true, 'Classifies visa sponsorship questions as sensitive');
  assert(FieldClassifier.isSensitiveField('First Name', 'first_name') === false, 'Classifies standard first name as non-sensitive');

  const formFields = FormPrefillEngine.mapProfileToFields(candidate, cleanResume);
  const sensitiveInForm = formFields.filter(f => f.isSensitive || f.requiresUserReview);
  assert(sensitiveInForm.length >= 2, 'Enforces human review on salary and work authorization fields');

  // 7. Profile Extractor & Sensitive Fields Extraction Tests
  console.log('\n--- 7. Profile Extractor & Sensitive Fields Processing ---');
  const sampleResume = `ROHAN SHARMA
Bengaluru, Karnataka • rohan.sharma@example.com • +91 98765 43210
linkedin.com/in/rohansharma-swe • github.com/rohansharma-swe

PROFESSIONAL SUMMARY
Senior Software Development Engineer (SDE-2) with 4+ years experience building microservices. Expected CTC: 34 LPA. Work Authorization: Indian Citizen (No Sponsorship Required).

TECHNICAL SKILLS
TypeScript, React, Next.js, Node.js, Go, PostgreSQL, Redis, Docker, Kubernetes, AWS

EXPERIENCE
Razorpay Technologies — SDE II (2022 - Present)
- Architected payment microservices handling 15M+ transactions/day using Go and PostgreSQL.

EDUCATION
IIT Roorkee — B.Tech in Computer Science (2016 - 2020, CGPA: 8.9)`;

  const { ProfileExtractor } = await import('../src/services/ai/profile-extractor');
  const extractResult = await ProfileExtractor.extractProfileFromText(sampleResume);
  const p = extractResult.profile as CandidateProfileData;

  assert((p.fullName || '').toUpperCase() === 'ROHAN SHARMA', 'Extracts candidate full name');
  assert(p.email === 'rohan.sharma@example.com', 'Extracts candidate email');
  assert(Boolean(p.phone?.includes('98765')), 'Extracts candidate phone');
  assert(Boolean(p.linkedinUrl?.includes('linkedin.com/in/rohansharma-swe')), 'Extracts LinkedIn profile URL');
  assert(Boolean(p.githubUrl?.includes('github.com/rohansharma-swe')), 'Extracts GitHub profile URL');
  assert((p.skills || []).some(s => s.name === 'TypeScript') && (p.skills || []).some(s => s.name === 'React'), 'Extracts technical skills');
  assert(p.expectedSalaryLPA === 34, 'Extracts Sensitive Field: Expected Salary / CTC (34 LPA)');
  assert(Boolean(p.workAuthorization?.includes('Indian Citizen')), 'Extracts Sensitive Field: Work Authorization status');
  assert(p.requiresVisa === false, 'Extracts Sensitive Field: Visa requirement flag');

  // Verify form prefill with extracted profile
  const autoFilledFields = FormPrefillEngine.mapProfileToFields(p);
  const salaryField = autoFilledFields.find(f => f.fieldKey === 'salary_expectation');
  const visaField = autoFilledFields.find(f => f.fieldKey === 'work_authorization');

  assert(salaryField !== undefined && salaryField.isSensitive === true, 'Auto-filled salary expectation is tagged as Sensitive');
  assert(visaField !== undefined && visaField.isSensitive === true, 'Auto-filled work authorization is tagged as Sensitive');
  assert(salaryField?.requiresUserReview === true && visaField?.requiresUserReview === true, 'Sensitive fields require explicit user review');

  // 8. Specific Test for Raihan Molla with Portfolio App header
  console.log('\n--- 8. Portfolio App & Raihan Molla Disambiguation ---');
  const raihanResume = `Raihan Molla
Kolkata, West Bengal, India • raihanmolla9903@gmail.com • 8585844758
https://linkedin.com/in/raihan-molla • https://github.com/raihan-codes • Portfolio: https://myportfolio.vercel.app

PROFESSIONAL SUMMARY
Senior Software Engineer | Distributed Systems & Full Stack
Expected CTC: 24 LPA. Notice Period: 60 Days. Experience: 1 Year.

TECHNICAL SKILLS
TypeScript, React, Node.js, Next.js, PostgreSQL, Redis, Docker, Go, Kubernetes`;

  const raihanResult = await ProfileExtractor.extractProfileFromText(raihanResume);
  const rp = raihanResult.profile as CandidateProfileData;

  assert(rp.fullName === 'Raihan Molla', 'Accurately extracts "Raihan Molla" without capturing portfolio URL as name');
  assert(Boolean(rp.location?.includes('Kolkata')), 'Accurately extracts Kolkata, West Bengal location');
  assert(rp.email === 'raihanmolla9903@gmail.com', 'Accurately extracts raihanmolla9903@gmail.com');
  assert(rp.phone === '8585844758', 'Accurately extracts 8585844758');
  assert(rp.website === 'https://myportfolio.vercel.app', 'Accurately extracts portfolio website https://myportfolio.vercel.app');
  assert(Boolean(rp.linkedinUrl?.includes('linkedin.com/in/raihan-molla')), 'Accurately extracts LinkedIn');
  assert(Boolean(rp.githubUrl?.includes('github.com/raihan-codes')), 'Accurately extracts GitHub');
  assert(!rp.fullName.toLowerCase().includes('portfolio'), 'Full Name does not contain "portfolio" keyword');

  // 9. Multi-Country & Global Candidate Extraction Test (US / UK / Europe / Remote)
  console.log('\n--- 9. Universal Global Support (Multi-Country Resumes) ---');
  const globalResume = `Sarah Jenkins
London, UK • sarah.jenkins@example.co.uk • +44 7911 123456
https://linkedin.com/in/sarah-jenkins-dev • https://github.com/sarah-j-codes

SUMMARY
Staff Backend Engineer with 7 years experience building distributed systems in Go, Rust, and PostgreSQL. Expected Salary: $165,000 USD. Work Authorization: UK Citizen (No sponsorship required).

SKILLS
Go, Rust, TypeScript, PostgreSQL, Redis, Kubernetes, Docker, AWS

EDUCATION
Imperial College London — M.Eng in Computing`;

  const globalResult = await ProfileExtractor.extractProfileFromText(globalResume);
  const gp = globalResult.profile as CandidateProfileData;

  assert(gp.fullName === 'Sarah Jenkins', 'Extracts international candidate full name');
  assert(gp.email === 'sarah.jenkins@example.co.uk', 'Extracts UK email domain (.co.uk)');
  assert(Boolean(gp.phone?.includes('7911')), 'Extracts UK phone number');
  assert(Boolean(gp.workAuthorization?.includes('UK Citizen')), 'Extracts UK work authorization');
  assert(gp.minSalary === 165000, 'Extracts USD salary requirement for international roles');

  // 10. Test for Institutional Noise Filtering & ATS Form Auto-Fill
  console.log('\n--- 10. University Noise Filtering & ATS Form Pre-Filling ---');
  const universityResume = `Kazi Nazrul University Asansol
Raihan Molla
Kolkata, West Bengal, India • raihanmolla9903@gmail.com • 8585844758
https://linkedin.com/in/raihan-molla • https://github.com/raihan-codes

EDUCATION
Kazi Nazrul University, Asansol — Bachelor of Computer Science & Engineering (B.Tech CSE)

SKILLS
TypeScript, React, Node.js, Next.js, PostgreSQL, Redis, Docker, Go, Kubernetes`;

  const uniResult = await ProfileExtractor.extractProfileFromText(universityResume);
  const up = uniResult.profile as CandidateProfileData;

  assert(up.fullName === 'Raihan Molla', 'Extracts candidate name "Raihan Molla" without capturing "Kazi Nazrul University Asansol"');
  assert(!up.fullName.toLowerCase().includes('university'), 'Full Name does not contain "university" keyword');

  // Test Form Pre-Filling
  const prefilledFields = FormPrefillEngine.mapProfileToFields(up as any);
  const firstNameField = prefilledFields.find(f => f.fieldKey === 'first_name');
  const lastNameField = prefilledFields.find(f => f.fieldKey === 'last_name');
  const emailField = prefilledFields.find(f => f.fieldKey === 'email');
  const phoneField = prefilledFields.find(f => f.fieldKey === 'phone');

  assert(firstNameField?.fieldValue === 'Raihan', 'ATS First Name is auto-filled with "Raihan"');
  assert(lastNameField?.fieldValue === 'Molla', 'ATS Last Name is auto-filled with "Molla"');
  assert(emailField?.fieldValue === 'raihanmolla9903@gmail.com', 'ATS Email is auto-filled with "raihanmolla9903@gmail.com"');
  assert(phoneField?.fieldValue === '8585844758', 'ATS Phone is auto-filled with "8585844758"');

  // 11. Multi-Source Connectors & Global Aggregation Engine
  console.log('\n--- 11. 10 Global Connectors & Cross-Source Deduplication ---');
  const { ingestionService } = await import('../src/services/ingestion/sync-runner');
  const supported = ingestionService.getSupportedPlatforms();
  assert(supported.length === 10, 'Ingestion registry has all 10 supported platforms active');
  assert(supported.some(s => s.platform === 'WELLFOUND'), 'Wellfound connector registered');
  assert(supported.some(s => s.platform === 'INTERNSHALA'), 'Internshala connector registered');
  assert(supported.some(s => s.platform === 'HANDSHAKE'), 'Handshake connector registered');
  assert(supported.some(s => s.platform === 'INDEED'), 'Indeed connector registered');
  assert(supported.some(s => s.platform === 'LINKEDIN'), 'LinkedIn connector registered');
  assert(supported.some(s => s.platform === 'CAREER_PAGES'), 'Career Pages connector registered');

  // Test Internshala Adapter (Internships)
  const { InternshalaAdapter } = await import('../src/services/ingestion/internshala');
  const internshalaAdapter = new InternshalaAdapter();
  const internJobs = await internshalaAdapter.fetchJobs('webdev');
  assert(internJobs.length > 0 && internJobs[0].employmentType === 'INTERNSHIP', 'Internshala adapter normalizes internship postings');

  // Test Cross-Platform Semantic Key Generation & Merging
  const jobGreenhouse: NormalizedJobPosting = {
    sourcePlatform: 'GREENHOUSE',
    sourceJobId: 'gh_101',
    sourceUrl: 'https://boards.greenhouse.io/figma/jobs/101',
    canonicalUrl: 'https://boards.greenhouse.io/figma/jobs/101',
    company: 'Figma',
    title: 'Senior Software Engineer - Web',
    location: 'Remote',
    country: 'United States',
    isRemote: true,
    employmentType: 'FULL_TIME',
    salaryCurrency: 'USD',
    descriptionRaw: 'Build Figma web interface.',
    postedAt: new Date(),
    updatedAt: new Date(),
    foundOnSources: ['GREENHOUSE']
  };

  const jobLinkedIn: NormalizedJobPosting = {
    sourcePlatform: 'LINKEDIN',
    sourceJobId: 'li_202',
    sourceUrl: 'https://linkedin.com/jobs/view/figma-swe-101',
    canonicalUrl: 'https://linkedin.com/jobs/view/figma-swe-101',
    company: 'Figma',
    title: 'Software Engineer - Web',
    location: 'Remote',
    country: 'United States',
    isRemote: true,
    employmentType: 'FULL_TIME',
    salaryCurrency: 'USD',
    descriptionRaw: 'Build Figma web interface in TypeScript.',
    postedAt: new Date(),
    updatedAt: new Date(),
    foundOnSources: ['LINKEDIN']
  };

  const ghKey = JobDeduplicator.generateCrossSourceKey(jobGreenhouse);
  const liKey = JobDeduplicator.generateCrossSourceKey(jobLinkedIn);
  assert(ghKey === liKey, 'Generates identical semantic cross-source key for the same job on different platforms');

  const merged = JobDeduplicator.mergePostings(jobGreenhouse, jobLinkedIn);
  assert(
    Boolean(merged.foundOnSources?.includes('GREENHOUSE') && merged.foundOnSources?.includes('LINKEDIN')),
    'Merged posting aggregates foundOnSources: ["GREENHOUSE", "LINKEDIN"]'
  );
  assert(merged.sourceUrl.includes('greenhouse.io'), 'Preserves direct ATS URL priority over social board');

  // Test Concurrent Sync Across All Sources
  const globalSyncResult = await ingestionService.syncAllSources('tech');
  assert(globalSyncResult.platformResults.length === 10, 'Concurrent global sync executes across all 10 connectors with fault isolation');

  console.log('\n====================================================');
  console.log(`🎯 Test Run Finished: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
