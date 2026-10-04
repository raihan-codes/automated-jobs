import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JobMatcher } from '@/services/ai/matcher';
import { getUserMatchesFromFirestore, getProfileFromFirestore } from '@/lib/firebase/firestore';

import { ingestionService } from '@/services/ingestion/sync-runner';

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

  // Never rely on fake fallback job listings. If the record is not in the real source feed, return 404.
  // 1. Locate the job in the centralized database
  const decodedId = decodeURIComponent(jobId).trim().toLowerCase();
  let job = db.jobPostings.find(
    j =>
      j.id === jobId ||
      j.sourceJobId === jobId ||
      j.id.toLowerCase() === decodedId ||
      j.sourceJobId?.toLowerCase() === decodedId ||
      j.id.toLowerCase().replace(/[^a-z0-9]/g, '') === decodedId.replace(/[^a-z0-9]/g, '')
  );

  if (!job) {
    await ingestionService.searchRealJobs(decodedId).catch(() => []);
    job = db.jobPostings.find(
      j =>
        j.id === jobId ||
        j.sourceJobId === jobId ||
        j.id.toLowerCase() === decodedId ||
        j.sourceJobId?.toLowerCase() === decodedId ||
        j.id.toLowerCase().replace(/[^a-z0-9]/g, '') === decodedId.replace(/[^a-z0-9]/g, '')
    );
  }

  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Job Posting Not Found' },
      { status: 404 }
    );
  }

  // 2. Attach or compute match result for this user using their actual resume profile
  let userProfile = db.profiles.get(userId);
  if (!userProfile) {
    userProfile = (await getProfileFromFirestore(userId).catch(() => null)) || undefined;
    if (userProfile) db.profiles.set(userId, userProfile);
  }

  let matchResult: any = undefined;
  if (userProfile) {
    matchResult = await JobMatcher.analyzeMatch(userProfile, job);
  }

  const enrichedJob = {
    ...job,
    matchScore: matchResult?.overallScore ?? 0,
    matchResult: matchResult,
    isStarred: false
  };

  return NextResponse.json({
    success: true,
    job: enrichedJob
  });
}
