import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JobMatcher } from '@/services/ai/matcher';
import { ingestionService } from '@/services/ingestion/sync-runner';
import { getProfileFromFirestore } from '@/lib/firebase/firestore';
import { CandidateProfileData } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Max execution time: 60s
export const maxDuration = 60;

export async function POST(request: Request) {
  const headerUserId = request.headers.get('x-user-id');
  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  const userId = body.userId || headerUserId || 'user_raihan_molla';

  // ── 1. Load Candidate Profile ──────────────────────────────────────────────
  let profile: CandidateProfileData | null | undefined = db.profiles.get(userId);
  if (!profile) {
    profile = await getProfileFromFirestore(userId).catch(() => null);
    if (profile) db.profiles.set(userId, profile);
  }
  if (!profile) {
    return NextResponse.json({ success: false, error: 'No profile found. Please upload your resume first.' }, { status: 404 });
  }

  // ── 2. Determine Search Keywords from Profile ──────────────────────────────
  const keywordParts: string[] = [];

  if (profile.desiredTitles && profile.desiredTitles.length > 0) {
    keywordParts.push(profile.desiredTitles[0]);
  }

  const topSkills = (profile.skills || [])
    .sort((a, b) => (b.years || 0) - (a.years || 0))
    .slice(0, 3)
    .map(s => s.name);

  const searchKeyword = keywordParts.length > 0 ? keywordParts[0] : (topSkills[0] || 'software engineer');

  // ── 3. Live Job Portal Search across Adzuna + Jooble ────────────────────────
  await ingestionService.searchRealJobs(profile).catch(err => {
    console.warn('[suggest] Error searching real jobs:', err.message);
  });

  // ── 4. Match ALL Genuine Jobs Against This Candidate ───────────────────────
  const matchResults = await Promise.all(
    db.jobPostings.map(async job => {
      // Check in-memory cache first
      const cached = db.matches.find(m => m.jobPostingId === job.id && m.userId === userId);
      if (cached) {
        return {
          job,
          matchResult: cached.matchResult,
          isStarred: cached.isStarred
        };
      }

      const matchResult = await JobMatcher.analyzeMatch(profile!, job);

      // Cache in-memory
      const matchRecord = {
        id: `match_${job.id}_${userId}`,
        userId,
        jobPostingId: job.id,
        matchResult,
        isStarred: false,
        isDismissed: false,
        createdAt: new Date().toISOString()
      };
      const existingIdx = db.matches.findIndex(m => m.jobPostingId === job.id && m.userId === userId);
      if (existingIdx >= 0) {
        db.matches[existingIdx] = matchRecord;
      } else {
        db.matches.push(matchRecord);
      }

      return { job, matchResult, isStarred: false };
    })
  );

  // ── 5. Sort, filter, and shape the response ────────────────────────────────
  const suggestions = matchResults
    .filter(r => r.matchResult.hardFilterPassed)
    .sort((a, b) => b.matchResult.overallScore - a.matchResult.overallScore)
    .slice(0, 25)
    .map(({ job, matchResult, isStarred }) => ({
      id: job.id,
      company: job.company,
      companyLogo: job.companyLogo,
      title: job.title,
      location: job.location,
      isRemote: job.isRemote,
      remoteType: job.remoteType,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      sourcePlatform: job.sourcePlatform,
      foundOnSources: job.foundOnSources,
      applicationUrl: job.applicationUrl || job.sourceUrl,
      applicationMethod: job.applicationMethod,
      extractedSkills: job.extractedSkills,
      experienceLevel: job.experienceLevel,
      postedAt: job.postedAt,
      // Match breakdown
      matchScore: matchResult.overallScore,
      skillsScore: matchResult.skillsScore,
      experienceScore: matchResult.experienceScore,
      domainScore: matchResult.domainScore,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
      whyMatchReason: matchResult.whyMatchReason,
      potentialConcerns: matchResult.potentialConcerns,
      suggestedAngle: matchResult.suggestedAngle,
      isStarred
    }));

  return NextResponse.json({
    success: true,
    userId,
    profile: {
      fullName: profile.fullName,
      headline: profile.headline,
      location: profile.location,
      yearsOfExperience: profile.yearsOfExperience,
      desiredTitles: profile.desiredTitles,
      skillCount: profile.skills.length,
      topSkills
    },
    searchKeyword,
    totalJobsScanned: db.jobPostings.length,
    suggestions
  });
}
