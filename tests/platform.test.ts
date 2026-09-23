// Comprehensive Integration & Unit Test Suite for AutoApply AI (Adzuna + Jooble Real Job Engine)
import { JobDeduplicator } from '../src/services/ingestion/deduplicator';
import { AdzunaAdapter } from '../src/services/ingestion/adzuna';
import { JoobleAdapter } from '../src/services/ingestion/jooble';
import { JDAnalyzer } from '../src/services/ai/jd-analyzer';
import { JobMatcher } from '../src/services/ai/matcher';
import { TruthfulnessValidator } from '../src/services/ai/truthfulness-validator';
import { FieldClassifier } from '../src/services/automation/field-classifier';
import { FormPrefillEngine } from '../src/services/automation/form-prefill';
import { db } from '../src/lib/db';
import { CandidateProfileData, NormalizedJobPosting, TailoredResumeContent } from '../src/types';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Running AutoApply AI System Test Suite (Real Job Discovery)');
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
    company: 'Razorpay',
    title: 'Senior Software Engineer',
    location: 'Bengaluru, India',
    sourcePlatform: 'ADZUNA',
    sourceJobId: 'adz_12345'
  });
  const fp2 = JobDeduplicator.generateFingerprint({
    company: '  razorpay  ',
    title: 'Senior Software Engineer ',
    location: 'bengaluru, india',
    sourcePlatform: 'ADZUNA',
    sourceJobId: 'adz_12345'
  });
  assert(fp1 === fp2, 'Generates identical SHA-256 fingerprint for normalized job properties');

  const cleanUrl = JobDeduplicator.canonicalizeUrl('https://api.adzuna.com/v1/api/jobs/in/search/1?utm_source=test&ref=xyz');
  assert(!cleanUrl.includes('utm_source'), 'Strips tracking and UTM parameters from canonical URL');

  // 2. Adzuna & Jooble Adapters Normalization Tests
  console.log('\n--- 2. Adzuna & Jooble Adapters Normalization ---');
  const adzunaAdapter = new AdzunaAdapter();
  const normalizedAdzuna = adzunaAdapter.normalizeJob({
    id: 'adz_88410',
    title: 'Full Stack Engineer (Remote)',
    location: { display_name: 'Bengaluru, India' },
    description: 'Experience with React, TypeScript, and Node.js required.',
    redirect_url: 'https://adzuna.com/land/ad/88410',
    company: { display_name: 'Tech Corp' },
    created: '2026-08-01T12:00:00Z',
    salary_min: 2400000,
    salary_max: 3600000
  }, 'Tech Corp');
  assert(
    normalizedAdzuna !== null &&
    normalizedAdzuna.sourcePlatform === 'ADZUNA' &&
    normalizedAdzuna.company === 'Tech Corp' &&
    normalizedAdzuna.salaryMin === 2400000,
    'Adzuna adapter normalizes raw API payload into NormalizedJobPosting'
  );

  const joobleAdapter = new JoobleAdapter();
  const normalizedJooble = joobleAdapter.normalizeJob({
    id: 'jb_9921',
    title: 'Lead Distributed Systems Engineer',
    location: 'Remote',
    snippet: 'Go, Kubernetes, and PostgreSQL microservices experience.',
    link: 'https://jooble.org/desc/9921',
    company: 'CloudScale AI',
    updated: '2026-08-01T12:00:00Z',
    salary: '$150,000 - $180,000'
  }, 'CloudScale AI');
  assert(
    normalizedJooble !== null &&
    normalizedJooble.sourcePlatform === 'JOOBLE' &&
    normalizedJooble.company === 'CloudScale AI' &&
    normalizedJooble.isRemote === true,
    'Jooble adapter normalizes raw API payload into NormalizedJobPosting'
  );

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
    remotePreference: 'REMOTE_OR_HYBRID',
    desiredTitles: ['Full Stack Software Engineer', 'Senior Software Engineer'],
    preferredLocations: ['San Francisco, CA', 'Remote'],
    skills: [
      { name: 'TypeScript', category: 'TECHNICAL', years: 5, level: 'EXPERT' },
      { name: 'React', category: 'FRAMEWORK', years: 5, level: 'EXPERT' },
      { name: 'Node.js', category: 'TECHNICAL', years: 5, level: 'EXPERT' },
      { name: 'PostgreSQL', category: 'TECHNICAL', years: 4, level: 'ADVANCED' },
      { name: 'Redis', category: 'TOOL', years: 3, level: 'ADVANCED' },
      { name: 'WebSockets', category: 'TECHNICAL', years: 3, level: 'ADVANCED' },
      { name: 'Go', category: 'TECHNICAL', years: 3, level: 'ADVANCED' }
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
        startDate: '2015',
        endDate: '2019'
      }
    ],
    projects: [
      {
        title: 'Realtime Collaboration Engine',
        description: 'Multi-user collaborative canvas.',
        technologies: ['TypeScript', 'React', 'WebSockets', 'Go'],
        bullets: ['Built live multi-user collaborative canvas.']
      }
    ]
  };

  const onsiteJob: NormalizedJobPosting = {
    sourcePlatform: 'ADZUNA',
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
  console.log('\n--- 4. Real Job Matching & Scoring Engine ---');
  const realJobMatch = await JobMatcher.analyzeMatch(candidate, normalizedAdzuna!);
  console.log('realJobMatch score:', realJobMatch.overallScore, 'tier:', realJobMatch.matchTier, 'skills:', realJobMatch.matchedSkills);
  assert(realJobMatch.overallScore >= 70, 'High match score (>=70) for candidate stack match');
  assert(realJobMatch.matchedSkills.includes('TypeScript') && realJobMatch.matchedSkills.includes('React'), 'Identifies matched skills');
  assert(typeof realJobMatch.whyMatchReason === 'string' && realJobMatch.whyMatchReason.length > 20, 'Generates transparent match justification');

  // 5. Anti-Hallucination Truthfulness Verification Tests
  console.log('\n--- 5. Anti-Hallucination & Truthfulness Validator ---');
  const cleanResume: TailoredResumeContent = {
    title: 'Alex Chen - Full Stack',
    targetRole: 'Full Stack Engineer',
    targetCompany: 'Tech Corp',
    summary: 'Senior Software Engineer with experience in TypeScript, React, and Node.js.',
    skillsSection: [
      { category: 'Core', skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'] }
    ],
    experienceSection: [
      {
        company: 'Veloce Data Systems',
        role: 'Senior Software Engineer',
        location: 'San Francisco, CA',
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

  // 6. Automation Field Classifier & Human Approval Gate
  console.log('\n--- 6. Field Classifier & Human Approval Safety Gate ---');
  assert(FieldClassifier.isSensitiveField('What are your salary expectations for this role?', 'salary') === true, 'Classifies compensation questions as sensitive');
  assert(FieldClassifier.isSensitiveField('Will you now or in the future require visa sponsorship?', 'visa_sponsorship') === true, 'Classifies visa sponsorship questions as sensitive');
  assert(FieldClassifier.isSensitiveField('First Name', 'first_name') === false, 'Classifies standard first name as non-sensitive');

  // 7. Profile Extractor Tests
  console.log('\n--- 7. Profile Extractor & Candidate Profiling ---');
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
  assert((p.skills || []).some(s => s.name === 'TypeScript') && (p.skills || []).some(s => s.name === 'React'), 'Extracts technical skills');

  // 8. Cross-Source Deduplication (Adzuna + Jooble)
  console.log('\n--- 8. Cross-Source Deduplication (Adzuna + Jooble) ---');
  const jobAdzuna: NormalizedJobPosting = {
    sourcePlatform: 'ADZUNA',
    sourceJobId: 'adz_101',
    sourceUrl: 'https://adzuna.com/jobs/101',
    canonicalUrl: 'https://adzuna.com/jobs/101',
    applicationUrl: 'https://adzuna.com/jobs/101',
    company: 'Figma',
    title: 'Senior Software Engineer - Web',
    location: 'Remote',
    country: 'United States',
    isRemote: true,
    employmentType: 'FULL_TIME',
    salaryCurrency: 'USD',
    descriptionRaw: 'Build Figma web interface in TypeScript.',
    postedAt: new Date(),
    updatedAt: new Date(),
    foundOnSources: ['ADZUNA']
  };

  const jobJooble: NormalizedJobPosting = {
    sourcePlatform: 'JOOBLE',
    sourceJobId: 'jb_202',
    sourceUrl: 'https://jooble.org/jobs/202',
    canonicalUrl: 'https://jooble.org/jobs/202',
    applicationUrl: 'https://jooble.org/jobs/202',
    company: 'Figma',
    title: 'Senior Software Engineer - Web',
    location: 'Remote',
    country: 'United States',
    isRemote: true,
    employmentType: 'FULL_TIME',
    salaryCurrency: 'USD',
    descriptionRaw: 'Build Figma web interface in TypeScript and React.',
    postedAt: new Date(),
    updatedAt: new Date(),
    foundOnSources: ['JOOBLE']
  };

  const adzKey = JobDeduplicator.generateCrossSourceKey(jobAdzuna);
  const jbKey = JobDeduplicator.generateCrossSourceKey(jobJooble);
  assert(adzKey === jbKey, 'Generates identical semantic cross-source key for the same job on Adzuna & Jooble');

  const merged = JobDeduplicator.mergePostings(jobAdzuna, jobJooble);
  assert(
    Boolean(merged.foundOnSources?.includes('ADZUNA') && merged.foundOnSources?.includes('JOOBLE')),
    'Merged posting aggregates foundOnSources: ["ADZUNA", "JOOBLE"]'
  );

  // 9. Ingestion Service Registry Test
  console.log('\n--- 9. Ingestion Service Registry (Adzuna + Jooble ONLY) ---');
  const { ingestionService } = await import('../src/services/ingestion/sync-runner');
  const supported = ingestionService.getSupportedPlatforms();
  assert(supported.length === 2, 'Ingestion registry has exactly 2 supported platforms active (Adzuna + Jooble)');
  assert(supported.some(s => s.platform === 'ADZUNA'), 'Adzuna connector registered');
  assert(supported.some(s => s.platform === 'JOOBLE'), 'Jooble connector registered');

  console.log('\n====================================================');
  console.log(`🎯 Test Run Finished: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
