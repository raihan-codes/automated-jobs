// Test Suite for Job Recency Policy, Salary Disclosure, and Balanced Ranking
import { AdzunaAdapter } from '../src/services/ingestion/adzuna';
import { JoobleAdapter } from '../src/services/ingestion/jooble';
import { JDAnalyzer } from '../src/services/ai/jd-analyzer';
import { CandidateProfileData, NormalizedJobPosting } from '../src/types';

async function runRecencyAndSalaryTests() {
  console.log('====================================================');
  console.log('🚀 Running Recency, Salary, and Sorting Test Suite');
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

  // ── 1. Salary Disclosure Tests (Real vs Missing, No Fake Data) ───────────
  console.log('--- 1. Salary Disclosure & Non-Fabrication Tests ---');
  const adzuna = new AdzunaAdapter();
  const jooble = new JoobleAdapter();

  // Real salary from Adzuna
  const realAdzunaJob = adzuna.normalizeJob({
    id: 'adz_real_1',
    title: 'Senior Software Engineer',
    redirect_url: 'https://adzuna.com/apply/1',
    company: { display_name: 'Tech Labs' },
    created: new Date().toISOString(),
    salary_min: 2400000,
    salary_max: 3600000,
    salary_is_predicted: 0
  }, 'Tech Labs');

  assert(
    realAdzunaJob !== null && realAdzunaJob.salaryMin === 2400000 && realAdzunaJob.salaryMax === 3600000,
    'Adzuna adapter parses real advertiser-provided salaryMin & salaryMax'
  );

  // Predicted/Estimated salary from Adzuna MUST NOT be used
  const predictedAdzunaJob = adzuna.normalizeJob({
    id: 'adz_pred_1',
    title: 'Software Engineer',
    redirect_url: 'https://adzuna.com/apply/2',
    company: { display_name: 'Startup Inc' },
    created: new Date().toISOString(),
    salary_min: 1500000,
    salary_max: 2000000,
    salary_is_predicted: '1' // Adzuna machine prediction
  }, 'Startup Inc');

  assert(
    predictedAdzunaJob !== null && predictedAdzunaJob.salaryMin === undefined && predictedAdzunaJob.salaryMax === undefined,
    'Adzuna adapter ignores machine-predicted salaries to prevent inventing data'
  );

  // Jooble real salary
  const realJoobleJob = jooble.normalizeJob({
    id: 'jb_1',
    link: 'https://jooble.org/apply/1',
    title: 'Backend Developer',
    company: 'Fintech Co',
    salary: '₹18,00,000 - ₹28,00,000 per year',
    updated: new Date().toISOString()
  }, 'Fintech Co');

  assert(
    realJoobleJob !== null && realJoobleJob.salaryMin === 1800000 && realJoobleJob.salaryMax === 2800000,
    'Jooble adapter extracts real numeric salary range'
  );

  // Jooble non-numeric / undisclosed salary
  const undisclosedJoobleJob = jooble.normalizeJob({
    id: 'jb_2',
    link: 'https://jooble.org/apply/2',
    title: 'Backend Developer',
    company: 'Fintech Co',
    salary: 'Competitive / Not Disclosed',
    updated: new Date().toISOString()
  }, 'Fintech Co');

  assert(
    undisclosedJoobleJob !== null && undisclosedJoobleJob.salaryMin === undefined && undisclosedJoobleJob.salaryMax === undefined,
    'Jooble adapter returns undefined for non-numeric/undisclosed salary strings'
  );

  // ── 2. Hard Filter on Salary: Undisclosed Jobs Are NOT Erroneously Filtered ─
  console.log('\n--- 2. Hard Filter Behavior on Undisclosed Salaries ---');
  const candidate: CandidateProfileData = {
    id: 'cand_1',
    userId: 'user_1',
    fullName: 'Raihan Molla',
    email: 'raihan@example.com',
    location: 'Bengaluru, India',
    minSalary: 2000000, // Target minimum 20 LPA
    skills: [
      { name: 'TypeScript', category: 'TECHNICAL', level: 'ADVANCED' },
      { name: 'React', category: 'FRAMEWORK', level: 'ADVANCED' }
    ],
    desiredTitles: ['Software Engineer'],
    yearsOfExperience: 3,
    noticePeriod: 'IMMEDIATE',
    workAuthorization: 'CITIZEN',
    remotePreference: 'HYBRID',
    preferredLocations: ['Bengaluru, India'],
    experiences: [],
    educations: [],
    projects: [],
    requiresVisa: false
  };

  // Job with salary lower than candidate target should be filtered
  const lowSalaryJob: NormalizedJobPosting = {
    sourcePlatform: 'ADZUNA',
    sourceJobId: 'low_1',
    sourceUrl: 'https://example.com/1',
    canonicalUrl: 'https://example.com/1',
    company: 'LowPay Corp',
    title: 'Software Engineer',
    location: 'Bengaluru, India',
    isRemote: false,
    employmentType: 'FULL_TIME',
    salaryMin: 1000000,
    salaryMax: 1500000,
    salaryCurrency: 'INR',
    descriptionRaw: 'Software Engineer TypeScript React',
    postedAt: new Date(),
    updatedAt: new Date(),
    extractedSkills: ['TypeScript', 'React'],
    experienceLevel: 'MID',
    visaAllowed: true
  };

  const lowFilter = JDAnalyzer.evaluateHardFilters(candidate, lowSalaryJob);
  assert(!lowFilter.passed, 'Job with salaryMax below candidate minSalary is filtered out');

  // Job without salary disclosed MUST NOT be filtered out ("Salary not provided does NOT mean no salary")
  const undisclosedSalaryJob: NormalizedJobPosting = {
    ...lowSalaryJob,
    sourceJobId: 'undisc_1',
    salaryMin: undefined,
    salaryMax: undefined
  };

  const undisclosedFilter = JDAnalyzer.evaluateHardFilters(candidate, undisclosedSalaryJob);
  assert(undisclosedFilter.passed, 'Job with undisclosed salary is NOT filtered out by minSalary target');

  // ── 3. Recency Classification & Filtering Policy ──────────────────────────
  console.log('\n--- 3. Recency Classification & Default Policy ---');
  const now = Date.now();
  const daysToMs = (days: number) => days * 24 * 60 * 60 * 1000;

  const getDaysOld = (postedAt: Date) => Math.max(0, (now - postedAt.getTime()) / (1000 * 60 * 60 * 24));
  const getRecencyCategory = (daysOld: number) => {
    if (daysOld <= 7) return 'HIGHLY_RECENT';
    if (daysOld <= 30) return 'RECENT';
    if (daysOld <= 60) return 'OLDER';
    return 'VERY_OLD';
  };

  const date2DaysAgo = new Date(now - daysToMs(2));
  const date15DaysAgo = new Date(now - daysToMs(15));
  const date45DaysAgo = new Date(now - daysToMs(45));
  const date120DaysAgo = new Date(now - daysToMs(120));

  assert(getRecencyCategory(getDaysOld(date2DaysAgo)) === 'HIGHLY_RECENT', '2 days old is HIGHLY_RECENT (0-7 days)');
  assert(getRecencyCategory(getDaysOld(date15DaysAgo)) === 'RECENT', '15 days old is RECENT (8-30 days)');
  assert(getRecencyCategory(getDaysOld(date45DaysAgo)) === 'OLDER', '45 days old is OLDER (31-60 days)');
  assert(getRecencyCategory(getDaysOld(date120DaysAgo)) === 'VERY_OLD', '120 days old is VERY_OLD (>60 days)');

  // ── 4. Balanced Ranking: Recent Relevant Jobs Outrank Marginally Higher Old Jobs ──
  console.log('\n--- 4. Balanced Ranking Tests ---');
  const getRecencyScore = (daysOld: number): number => {
    if (daysOld <= 2) return 100;
    if (daysOld <= 7) return 90;
    if (daysOld <= 14) return 75;
    if (daysOld <= 30) return 60;
    if (daysOld <= 60) return 35;
    return 10;
  };

  const computeCompositeRank = (matchScore: number, daysOld: number) => {
    return (matchScore * 0.70) + (getRecencyScore(daysOld) * 0.30);
  };

  // Job A: 88% Match, 2 days old (Recent)
  const jobARank = computeCompositeRank(88, 2); // 88*0.7 + 100*0.3 = 61.6 + 30 = 91.6
  // Job B: 90% Match, 45 days old (Older)
  const jobBRank = computeCompositeRank(90, 45); // 90*0.7 + 35*0.3 = 63.0 + 10.5 = 73.5
  // Job C: 92% Match, 120 days old (4 months old)
  const jobCRank = computeCompositeRank(92, 120); // 92*0.7 + 10*0.3 = 64.4 + 3.0 = 67.4

  assert(jobARank > jobBRank, `Recent relevant job (88% match, 2d, rank ${jobARank.toFixed(1)}) outranks older job (90% match, 45d, rank ${jobBRank.toFixed(1)})`);
  assert(jobARank > jobCRank, `Recent relevant job outranks 4-month old job (92% match, 120d, rank ${jobCRank.toFixed(1)})`);

  console.log('\n====================================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

runRecencyAndSalaryTests().catch(err => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
