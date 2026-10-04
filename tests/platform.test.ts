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
import { IngestionFilterOptions } from '../src/services/ingestion/types';

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
  assert(p.location === 'Bengaluru, Karnataka', 'Preserves the explicit resume location');
  assert(p.yearsOfExperience === 4, 'Uses the explicit experience duration');
  assert(p.headline === 'Not specified', 'Does not synthesize a headline');

  const sparseProfile = (await ProfileExtractor.extractProfileFromText(
    'ALEX DOE\n\nalex@example.com\n\nSKILLS\nTypeScript, React'
  )).profile as CandidateProfileData;
  assert(sparseProfile.location === 'Not specified', 'Marks missing location as Not specified');
  assert(sparseProfile.yearsOfExperience === undefined, 'Does not infer missing experience');
  assert(sparseProfile.noticePeriod === undefined, 'Does not infer missing notice period');
  assert(sparseProfile.workAuthorization === 'Not specified', 'Marks missing work authorization as Not specified');
  assert(sparseProfile.skills.every(s => s.level === 'NOT_SPECIFIED' && s.years === undefined), 'Does not infer skill seniority or years');

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
  assert(supported.length === 6, 'Ingestion registry exposes all registered source adapters');
  assert(supported.some(s => s.platform === 'ADZUNA'), 'Adzuna connector registered');
  assert(supported.some(s => s.platform === 'JOOBLE'), 'Jooble connector registered');

  // 10. Live search regression: query text must not be replaced by the location filter
  console.log('\n--- 10. Search Query Propagation Regression ---');
  const originalAdzuna = ingestionService.getAdapter('ADZUNA');
  const seenCalls: any[] = [];

  ingestionService.registerAdapter({
    platform: 'ADZUNA',
    name: 'Adzuna Test Adapter',
    metadata: { platform: 'ADZUNA', name: 'Adzuna', category: 'PUBLIC_JOB_BOARD', supportsAutomatedPrefill: true, supportsInternships: true, isLegalAndPermitted: true },
    fetchJobs: async (company: string, options?: IngestionFilterOptions) => {
      seenCalls.push({ company, options });
      return [];
    },
    normalizeJob: () => null,
    healthCheck: async () => true
  } as any);

  await ingestionService.searchRealJobs({
    desiredTitles: ['Full Stack Developer'],
    skills: [{ name: 'React', category: 'FRAMEWORK', years: 3, level: 'ADVANCED' }],
    location: 'Bengaluru, India'
  } as CandidateProfileData);

  const hasCorrectQuery = seenCalls.some(call => {
    return call.company === 'Full Stack Developer' && !call.options?.query && call.options?.location === 'Bengaluru, India';
  });
  assert(hasCorrectQuery, 'SearchRealJobs preserves the actual search query and passes location separately');

  if (originalAdzuna) {
    ingestionService.registerAdapter(originalAdzuna);
  }

  // 11. Accurate Resume Parsing (Raihan Molla's exact resume)
  console.log('\n--- 11. Accurate Resume Parsing & Entity Extraction ---');
  const { ProfileExtractor } = await import('../src/services/ai/profile-extractor');
  const raihanResumeText = `RAIHAN MOLLA
Asansol, west bengal | raihanmolla9903@gmail.com | 8585844758
GitHub: github.com/raihan-codes LinkedIn: https://www.linkedin.com/in/raihan-molla
Portfolio: my-portfolio.vercel.app

EDUCATION
B.Tech in Computer Science & Engineering (Data Science)
Kazi Nazrul University, Asansol
2024 – 2028
Current GPA: 7.1

TECHNICAL SKILLS
Programming Languages: python,Java, C, C++,java script
Core Computer Science: Data Structures & Algorithms, Object-Oriented Programming, DBMS, Computer Architecture, Operating/Computer Fundamentals
Database: SQL, Database Management Systems
Tools & Technologies: Git, GitHub, REST/API fundamentals, Web Development fundamentals

PROJECTS
AI Notes Taker — Local-First Google Meet Notetaker
GitHub: Repository | Live Demo: ai-notes-taker-bay.vercel.app
- Built a local-first application to capture Google Meet audio and generate meeting notes.
- Integrated Google Meet Media API with OAuth for meeting media access.
- Implemented browser-based transcription and note extraction using local model processing.
- Used IndexedDB for local storage and deployed the application on Vercel.

EXPERIENCE
Voice Artist — Nasheedio
Part-time
- Worked as a voice artist, recording and delivering voice-based content according to project requirements.
- Developed communication, presentation, voice modulation, and content-delivery skills.
- Collaborated on audio content while maintaining consistency and quality in recordings.

STRENGTHS
- Problem Solving
- Logical Thinking
- Programming Fundamentals
- Communication
- Team Collaboration`;

  const raihanExtracted = await ProfileExtractor.extractProfileFromText(raihanResumeText);
  const rProfile = raihanExtracted.profile;

  assert(rProfile.fullName === 'Raihan Molla', 'Accurately extracts candidate full name: Raihan Molla');
  assert(rProfile.email === 'raihanmolla9903@gmail.com', 'Accurately extracts email: raihanmolla9903@gmail.com');
  assert(Boolean(rProfile.phone?.includes('8585844758')), 'Accurately extracts phone: 8585844758');
  assert(Boolean(rProfile.location?.toLowerCase().includes('asansol')), 'Accurately extracts location: Asansol, west bengal');
  assert(rProfile.headline === 'Not specified', 'Headline is Not specified (not fabricated)');
  assert(rProfile.workAuthorization === 'Not specified', 'Work authorization is Not specified (not fabricated)');
  assert(rProfile.educations?.[0]?.institution.includes('Kazi Nazrul University'), 'Accurately extracts university institution');

  const extractedSkillNames = rProfile.skills.map(s => s.name);
  assert(extractedSkillNames.includes('Python'), 'Extracts Python skill');
  assert(extractedSkillNames.includes('Java'), 'Extracts Java skill');
  assert(extractedSkillNames.includes('C'), 'Extracts C skill');
  assert(extractedSkillNames.includes('C++'), 'Extracts C++ skill');
  assert(extractedSkillNames.includes('JavaScript'), 'Extracts JavaScript skill');
  assert(extractedSkillNames.includes('SQL'), 'Extracts SQL skill');
  assert(extractedSkillNames.includes('Git'), 'Extracts Git skill');
  assert(extractedSkillNames.includes('REST APIs'), 'Extracts REST APIs skill');
  assert(extractedSkillNames.includes('Data Structures & Algorithms'), 'Extracts Data Structures & Algorithms skill');
  assert(extractedSkillNames.includes('DBMS'), 'Extracts DBMS skill');
  assert(!extractedSkillNames.includes('TypeScript'), 'Does NOT hallucinate TypeScript (not in resume)');

  // 12. Strict Skill Matching (No False Substring Matches)
  console.log('\n--- 12. Strict Skill Matching (Zero False Substrings) ---');
  const rampJob: NormalizedJobPosting = {
    sourcePlatform: 'JOOBLE',
    sourceJobId: 'jb_ramp_101',
    sourceUrl: 'https://jooble.org/jobs/ramp_101',
    canonicalUrl: 'https://jooble.org/jobs/ramp_101',
    applicationUrl: 'https://jooble.org/jobs/ramp_101',
    company: 'Ramp',
    title: 'Design Engineer',
    location: 'New York, NY (HQ)',
    country: 'United States',
    isRemote: false,
    remoteType: 'ONSITE',
    employmentType: 'FULL_TIME',
    salaryCurrency: 'USD',
    descriptionRaw: 'Ramp is looking for a Design Engineer. Required skills: Product Engineering, TypeScript, Fullstack, UI/UX, Design Systems.',
    extractedSkills: ['Product Engineering', 'TypeScript', 'Fullstack', 'Design Systems'],
    postedAt: new Date(Date.now() - 3600 * 1000 * 24 * 65),
    updatedAt: new Date()
  };

  const rampMatch = await JobMatcher.analyzeMatch(rProfile, rampJob);
  assert(
    !rampMatch.matchedSkills.includes('TypeScript') &&
    !rampMatch.matchedSkills.includes('Product Engineering') &&
    !rampMatch.matchedSkills.includes('Fullstack'),
    'Candidate with C/Java does NOT falsely match TypeScript, Product Engineering, or Fullstack'
  );
  assert(rampMatch.matchedSkills.length === 0, 'Matched skills is empty when candidate has 0 skills from JD');
  assert(rampMatch.overallScore <= 35, 'Overall match score is low (<35%) for non-matching on-site Design Engineer');

  // 13. Strict Remote Only Filter Verification
  console.log('\n--- 13. Strict Remote Only Filter Verification ---');
  const adzunaAdapterInstance = new (await import('../src/services/ingestion/adzuna')).AdzunaAdapter();
  const joobleAdapterInstance = new (await import('../src/services/ingestion/jooble')).JoobleAdapter();

  const hqJob = joobleAdapterInstance.normalizeJob({
    id: 'jb_hq_1',
    title: 'Software Engineer',
    location: 'New York, NY (HQ)',
    snippet: 'Engineering role in NY headquarters.',
    link: 'https://jooble.org/job/1'
  }, 'HQ Corp');
  assert(hqJob?.isRemote === false && hqJob?.remoteType === 'ONSITE', 'HQ / On-site job is NOT marked as remote');

  const hybridJob = adzunaAdapterInstance.normalizeJob({
    id: 'adz_hyb_1',
    title: 'Full Stack Engineer',
    company: { display_name: 'Hybrid Corp' },
    location: { display_name: 'Bengaluru, India (Hybrid)' },
    description: 'Hybrid work model in Bengaluru office.',
    redirect_url: 'https://adzuna.com/job/1'
  }, 'Hybrid Corp');
  assert(hybridJob?.isRemote === false && hybridJob?.remoteType === 'HYBRID', 'Hybrid job is NOT marked as purely remote');

  const trueRemoteJob = joobleAdapterInstance.normalizeJob({
    id: 'jb_rem_1',
    title: 'Python Backend Engineer (Remote)',
    location: 'Remote',
    snippet: '100% remote Python backend role.',
    link: 'https://jooble.org/job/2'
  }, 'Remote Corp');
  assert(trueRemoteJob?.isRemote === true && trueRemoteJob?.remoteType === 'REMOTE', 'Explicitly remote job is marked as remote');

  console.log('\n====================================================');
  console.log(`🎯 Test Run Finished: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
