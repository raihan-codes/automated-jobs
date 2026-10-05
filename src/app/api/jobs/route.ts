import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JobMatcher } from '@/services/ai/matcher';
import { ingestionService } from '@/services/ingestion/sync-runner';
import { getUserMatchesFromFirestore, getProfileFromFirestore } from '@/lib/firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';
  const platform = searchParams.get('platform')?.toUpperCase() || '';
  const remoteOnly = searchParams.get('remote') === 'true';
  const minScore = parseInt(searchParams.get('minScore') || '0', 10);
  const employmentType = searchParams.get('type')?.toUpperCase() || '';
  const headerUserId = request.headers.get('x-user-id');
  const paramUserId = searchParams.get('userId');

  const userId = paramUserId || headerUserId || 'user_raihan_molla';

  // Retrieve user profile to ensure matches are tailored strictly to actual uploaded resume
  let userProfile = db.profiles.get(userId);
  if (!userProfile) {
    userProfile = await getProfileFromFirestore(userId).catch(() => null) || undefined;
    if (userProfile) {
      db.profiles.set(userId, userProfile);
    }
  }

  // If memory store has no jobs, or if user is searching a specific query, trigger real-time search across Adzuna + Jooble
  if (query && !db.jobPostings.some(j => j.title.toLowerCase().includes(query) || j.company.toLowerCase().includes(query))) {
    const searchQuery = query || (userProfile && userProfile.skills.length > 0 ? userProfile : 'Software Engineer');
    await ingestionService.searchRealJobs(searchQuery, 'tenant_prod_enterprise_1', {
      remoteOnly,
      query: query || undefined
    }).catch(err => {
      console.warn('[Jobs API] Search error:', err.message);
    });
  }

  // Load jobs from memory store (only real scraped / synced postings)
  const jobList = db.ensureJobsLoaded();

  let filtered = await Promise.all(jobList.map(async job => {
    let matchResult: any = null;

    if (userProfile) {
      // Always dynamically compute fresh, grounded match using actual resume profile & actual JD
      matchResult = await JobMatcher.analyzeMatch(userProfile, job);
    }

    return {
      ...job,
      matchScore: matchResult?.overallScore ?? 0,
      matchResult: matchResult || undefined,
      isStarred: false
    };
  }));

  const recencyParam = searchParams.get('recency') || searchParams.get('maxDays') || '30';
  const now = Date.now();

  const getDaysOld = (postedAt: string | Date): number => {
    const postedTime = new Date(postedAt).getTime();
    if (isNaN(postedTime)) return 0;
    return Math.max(0, (now - postedTime) / (1000 * 60 * 60 * 24));
  };

  const getRecencyCategory = (daysOld: number): 'HIGHLY_RECENT' | 'RECENT' | 'OLDER' | 'VERY_OLD' => {
    if (daysOld <= 7) return 'HIGHLY_RECENT';
    if (daysOld <= 30) return 'RECENT';
    if (daysOld <= 60) return 'OLDER';
    return 'VERY_OLD';
  };

  // Add recency classification to all jobs
  let enriched = filtered.map(j => {
    const daysOld = getDaysOld(j.postedAt);
    return {
      ...j,
      daysOld: Math.round(daysOld * 10) / 10,
      recencyCategory: getRecencyCategory(daysOld)
    };
  });

  if (query) {
    enriched = enriched.filter(j =>
      j.title.toLowerCase().includes(query) ||
      j.company.toLowerCase().includes(query) ||
      j.location.toLowerCase().includes(query) ||
      (j.country && j.country.toLowerCase().includes(query)) ||
      j.descriptionRaw.toLowerCase().includes(query) ||
      (j.extractedSkills && j.extractedSkills.some(s => s.toLowerCase().includes(query)))
    );
  }

  if (platform && platform !== 'ALL') {
    enriched = enriched.filter(j => 
      j.sourcePlatform === platform || (j.foundOnSources && j.foundOnSources.includes(platform as any))
    );
  }

  if (employmentType && employmentType !== 'ALL') {
    enriched = enriched.filter(j => j.employmentType === employmentType);
  }

  // Strict Remote Only filtering: Only show jobs explicitly marked Remote, never Hybrid or On-site
  if (remoteOnly) {
    enriched = enriched.filter(j => 
      j.isRemote === true &&
      j.remoteType === 'REMOTE' &&
      !/\b(?:hybrid|onsite|on-site|in-office|\bhq\b)\b/i.test(j.location || '')
    );
  }

  if (minScore > 0) {
    enriched = enriched.filter(j => (j.matchScore ?? 0) >= minScore);
  }

  // Recency Window Filter Policy:
  // - '7' / 'highly_recent': 0-7 days (Highly Recent)
  // - '30' / 'recent' (Default): 0-30 days (Highly Recent + Recent)
  // - '60': 0-60 days
  // - 'older': >30 days (Explicitly show older jobs)
  // - 'all': all jobs
  if (recencyParam === '7' || recencyParam === 'highly_recent') {
    enriched = enriched.filter(j => j.daysOld <= 7);
  } else if (recencyParam === '60') {
    enriched = enriched.filter(j => j.daysOld <= 60);
  } else if (recencyParam === 'older') {
    enriched = enriched.filter(j => j.daysOld > 30);
  } else if (recencyParam === 'all') {
    // Show all jobs regardless of age
  } else {
    // Default recency window: 0-30 days
    enriched = enriched.filter(j => j.daysOld <= 30);
  }

  // Sort by match score descending, then by recency (newest first)
  enriched.sort((a, b) => {
    if ((b.matchScore || 0) !== (a.matchScore || 0)) {
      return (b.matchScore || 0) - (a.matchScore || 0);
    }
    return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
  });

  const candidateDisplayName = userProfile?.fullName && userProfile.fullName !== 'Not specified'
    ? userProfile.fullName
    : (userProfile?.email && userProfile.email !== 'Not specified' ? userProfile.email.split('@')[0] : 'Candidate');

  return NextResponse.json({
    success: true,
    total: enriched.length,
    jobs: enriched,
    hasCustomProfile: Boolean(userProfile && userProfile.skills && userProfile.skills.length > 0),
    candidateName: candidateDisplayName,
    sources: ['ADZUNA', 'JOOBLE']
  });
}
