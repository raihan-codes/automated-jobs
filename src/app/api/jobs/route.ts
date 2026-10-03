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

  // Retrieve user profile to ensure matches are tailored
  let userProfile = db.profiles.get(userId);
  if (!userProfile) {
    userProfile = await getProfileFromFirestore(userId).catch(() => null) || undefined;
    if (userProfile) {
      db.profiles.set(userId, userProfile);
    }
  }

  // Ensure default verified jobs catalog is loaded if store is empty (e.g. serverless cold start)
  if (db.jobPostings.length === 0) {
    db.seedDefaultData();
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

  // Load any Firestore matches for this user
  const firestoreMatches: Record<string, any> = await getUserMatchesFromFirestore(userId).catch(() => ({}));

  let filtered = await Promise.all(db.jobPostings.map(async job => {
    let match = db.matches.find(m => m.jobPostingId === job.id && m.userId === userId);
    
    // Check Firestore if missing in memory
    if (!match && firestoreMatches[job.id]) {
      match = {
        id: `match_${job.id}_${userId}`,
        userId,
        jobPostingId: job.id,
        matchResult: firestoreMatches[job.id].matchResult,
        isStarred: Boolean(firestoreMatches[job.id].isStarred),
        isDismissed: false,
        createdAt: firestoreMatches[job.id].updatedAt
      };
      db.matches.push(match);
    }

    // If candidate profile exists but this job hasn't been scored for them yet, compute match
    if (!match && userProfile) {
      const computedResult = await JobMatcher.analyzeMatch(userProfile, job);
      match = {
        id: `match_${job.id}_${userId}`,
        userId,
        jobPostingId: job.id,
        matchResult: computedResult,
        isStarred: false,
        isDismissed: false,
        createdAt: new Date().toISOString()
      };
      db.matches.push(match);
    }

    return {
      ...job,
      matchScore: match?.matchResult?.overallScore ?? 0,
      matchResult: match?.matchResult,
      isStarred: match?.isStarred || false
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

  if (remoteOnly) {
    enriched = enriched.filter(j => j.isRemote);
  }

  if (minScore > 0) {
    enriched = enriched.filter(j => j.matchScore >= minScore);
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
  } else if (recencyParam === 'all' || recencyParam === 'Infinity') {
    // Keep all jobs
  } else {
    // Default: 0-30 days (Recent opportunities only)
    const maxDays = parseInt(recencyParam, 10);
    const limit = isNaN(maxDays) ? 30 : maxDays;
    const withinDays = enriched.filter(j => j.daysOld <= limit);
    if (withinDays.length > 0) {
      enriched = withinDays;
    }
  }

  // Balanced Sorting:
  // 1. Resume match score
  // 2. Recency
  // 3. Job relevance
  // Ensures genuinely recent relevant jobs outrank older jobs with marginally higher match scores.
  const getRecencyScore = (daysOld: number): number => {
    if (daysOld <= 2) return 100;
    if (daysOld <= 7) return 90;
    if (daysOld <= 14) return 75;
    if (daysOld <= 30) return 60;
    if (daysOld <= 60) return 35;
    return 10;
  };

  enriched.sort((a, b) => {
    const rankA = (a.matchScore * 0.70) + (getRecencyScore(a.daysOld) * 0.30);
    const rankB = (b.matchScore * 0.70) + (getRecencyScore(b.daysOld) * 0.30);
    if (Math.abs(rankB - rankA) > 0.5) {
      return rankB - rankA;
    }
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
  });

  return NextResponse.json({
    success: true,
    userId,
    hasCustomProfile: Boolean(userProfile && userProfile.skills && userProfile.skills.length > 0),
    candidateName: userProfile?.fullName || 'Candidate',
    recencyFilter: recencyParam,
    count: enriched.length,
    jobs: enriched
  });
}
