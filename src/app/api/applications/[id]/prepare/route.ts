import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ATSPlaywrightWorker } from '@/services/automation/ats-playwright-worker';
import { getCurrentUserId } from '@/lib/auth';
import { getProfileFromFirestore, getUserApplicationsFromFirestore } from '@/lib/firebase/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUserId = await getCurrentUserId(request);
    const targetId = decodeURIComponent(params.id).trim();
    const headerUserId = request.headers.get('x-user-id');
    const body = await request.json().catch(() => ({}));
    const userId = (headerUserId && headerUserId !== 'null' && headerUserId !== 'undefined')
      ? headerUserId
      : (body.userId || sessionUserId);

    if (!userId || userId === 'null' || userId === 'undefined') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required. Please sign in to prepare your application.'
      }, { status: 401 });
    }

    // 1. Try finding existing application by appId or jobId
    let app = db.applications.find(
      a => (a.id === targetId || a.jobPostingId === targetId) && (a.userId === userId || !a.userId)
    );

    if (!app) {
      const firestoreApps = await getUserApplicationsFromFirestore(userId).catch(() => []);
      const found = firestoreApps.find(a => a.id === targetId || a.jobPostingId === targetId);
      if (found) {
        app = found as any;
      }
    }
    
    // 2. Find associated job posting
    const job = db.jobPostings.find(j => 
      j.id === (app?.jobPostingId || targetId) || 
      j.sourceJobId === (app?.jobPostingId || targetId) ||
      j.id.toLowerCase() === targetId.toLowerCase() ||
      j.sourceJobId?.toLowerCase() === targetId.toLowerCase()
    );

    if (!job) {
      return NextResponse.json({
        success: false,
        error: `Job posting ${targetId} could not be located in active feed.`
      }, { status: 404 });
    }

    // 3. Load candidate profile
    let profile = db.profiles.get(userId);
    if (!profile) {
      profile = (await getProfileFromFirestore(userId).catch(() => null)) || undefined;
      if (profile) db.profiles.set(userId, profile);
    }

    if (!profile) {
      profile = Array.from(db.profiles.values())[0];
    }

    if (!profile) {
      return NextResponse.json({
        success: false,
        error: 'Candidate profile not found. Please upload a resume first.'
      }, { status: 404 });
    }

    const resume = db.resumes.find(r => r.id === app?.tailoredResumeId);

    // 4. Prepare application via worker
    const result = await ATSPlaywrightWorker.prepareApplication(
      userId,
      job,
      profile,
      resume?.content
    );

    return NextResponse.json({
      success: true,
      message: 'Application form pre-filled and paused at Human-Approval checkpoint.',
      result: {
        ...result,
        id: result.id
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
