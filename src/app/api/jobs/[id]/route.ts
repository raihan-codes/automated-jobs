import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JobMatcher } from '@/services/ai/matcher';
import { getUserMatchesFromFirestore, getProfileFromFirestore } from '@/lib/firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;
  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'Job ID is required' },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const headerUserId = request.headers.get('x-user-id');
  const paramUserId = searchParams.get('userId');
  const userId = paramUserId || headerUserId || 'user_raihan_molla';

  // 1. Locate the job in the centralized database
  const decodedId = decodeURIComponent(jobId).trim().toLowerCase();
  const job = db.jobPostings.find(
    j =>
      j.id === jobId ||
      j.sourceJobId === jobId ||
      j.id.toLowerCase() === decodedId ||
      j.sourceJobId?.toLowerCase() === decodedId ||
      j.id.toLowerCase().replace(/[^a-z0-9]/g, '') === decodedId.replace(/[^a-z0-9]/g, '')
  );

  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Job Posting Not Found' },
      { status: 404 }
    );
  }

  // 2. Attach or compute match result for this user
  let match = db.matches.find(m => m.jobPostingId === job.id && m.userId === userId);

  if (!match) {
    // Check Firestore
    const firestoreMatches: Record<string, any> = await getUserMatchesFromFirestore(userId).catch(() => ({}));
    if (firestoreMatches[job.id]) {
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
  }

  // If candidate profile exists but this job hasn't been scored, compute match on the fly
  if (!match) {
    let userProfile = db.profiles.get(userId);
    if (!userProfile) {
      userProfile = (await getProfileFromFirestore(userId).catch(() => null)) || undefined;
      if (userProfile) db.profiles.set(userId, userProfile);
    }

    if (userProfile) {
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
  }

  const enrichedJob = {
    ...job,
    matchScore: match?.matchResult?.overallScore ?? 0,
    matchResult: match?.matchResult,
    isStarred: match?.isStarred || false
  };

  return NextResponse.json({
    success: true,
    job: enrichedJob
  });
}
