import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JobMatcher } from '@/services/ai/matcher';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = await getCurrentUserId(request);
    if (!sessionUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { jobId, userId = sessionUserId } = await request.json();

    const job = db.jobPostings.find(j => j.id === jobId || j.sourceJobId === jobId);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    const profile = db.profiles.get(userId);
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Candidate profile not found' }, { status: 404 });
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
