import assert from 'node:assert/strict';
import { UrlValidator } from '../src/services/validation/url-validator';

const fakeJob = {
  company: 'ExampleCo',
  title: 'Senior Engineer',
  sourcePlatform: 'ADZUNA',
  sourceJobId: 'abc-123',
  sourceUrl: 'https://example.com/jobs/abc-123',
  canonicalUrl: 'https://example.com/jobs/abc-123',
  applicationUrl: 'https://example.com/jobs/abc-123',
  location: 'Remote',
  descriptionRaw: 'Test role',
  postedAt: new Date(),
  updatedAt: new Date(),
  salaryCurrency: 'USD',
  employmentType: 'FULL_TIME' as const,
  isRemote: true,
};

const validGreenhouseJob = {
  ...fakeJob,
  sourcePlatform: 'GREENHOUSE',
  sourceUrl: 'https://boards.greenhouse.io/figma/jobs/6201407004',
  canonicalUrl: 'https://boards.greenhouse.io/figma/jobs/6201407004',
  applicationUrl: 'https://boards.greenhouse.io/figma/jobs/6201407004',
};

const result = UrlValidator.filterActiveJobs([fakeJob, validGreenhouseJob], 2);

void result.then((jobs) => {
  assert.equal(jobs.length, 1, 'Only legitimate ATS URLs should remain');
  assert.equal(jobs[0].sourceUrl, validGreenhouseJob.sourceUrl, 'Valid Greenhouse job is preserved');
  assert.equal(UrlValidator.isAllowedExternalJobUrl('https://example.com/jobs/abc-123'), false, 'Example domains are rejected');
  assert.equal(UrlValidator.isAllowedExternalJobUrl('https://boards.greenhouse.io/figma/jobs/6201407004'), true, 'Greenhouse listing URLs are allowed');
  assert.equal(UrlValidator.isAllowedExternalJobUrl('https://www.adzuna.in/land/ad/88410'), true, 'Adzuna listing URLs are allowed');
  assert.equal(UrlValidator.isAllowedExternalJobUrl('https://jooble.org/desc/9921'), true, 'Jooble listing URLs are allowed');
  console.log('job url validation regression checks passed');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
