import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JobMatcher } from '@/services/ai/matcher';
import { getCurrentUserId } from '@/lib/auth';
import { getProfileFromFirestore } from '@/lib/firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const headerUserId = request.headers.get('x-user-id');
    const sessionUserId = await getCurrentUserId(request);
    const userId = (headerUserId && headerUserId !== 'null' && headerUserId !== 'undefined')
      ? headerUserId
      : (body.userId || sessionUserId);

    if (!userId || userId === 'null' || userId === 'undefined') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required. Please sign in to compute match analytics.'
      }, { status: 401 });
    }

    const { jobId } = body;
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 });
    }

    const normalizedJobId = decodeURIComponent(jobId).trim().toLowerCase();
    const job = db.jobPostings.find(
      j =>
        j.id === jobId ||
        j.sourceJobId === jobId ||
        j.id?.toLowerCase() === normalizedJobId ||
        j.sourceJobId?.toLowerCase() === normalizedJobId ||
        j.id?.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedJobId.replace(/[^a-z0-9]/g, '')
    );

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    let profile = db.profiles.get(userId);
    if (!profile) {
      profile = (await getProfileFromFirestore(userId).catch(() => null)) || undefined;
      if (profile) db.profiles.set(userId, profile);
    }
    if (!profile) {
      return NextResponse.json({
        success: false,
        error: 'Candidate profile not found for this user. Please upload your resume to view matching analytics.'
      }, { status: 404 });
    }

    const matchResult = await JobMatcher.analyzeMatch(profile, job);

    // Save or update match in store
    const matchIdx = db.matches.findIndex(m => m.jobPostingId === job.id && m.userId === userId);
    const matchRecord = {
      id: `match_${job.id}_${userId}`,
      userId,
      jobPostingId: job.id,
      matchResult,
      isStarred: matchIdx >= 0 ? db.matches[matchIdx].isStarred : false,
      isDismissed: false,
      createdAt: new Date().toISOString()
    };

    if (matchIdx >= 0) {
      db.matches[matchIdx] = matchRecord;
    } else {
      db.matches.push(matchRecord);
    }

    return NextResponse.json({
      success: true,
      match: matchRecord
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
