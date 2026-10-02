import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserApplicationsFromFirestore, saveApplicationToFirestore } from '@/lib/firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const headerUserId = request.headers.get('x-user-id');
  const paramUserId = searchParams.get('userId');
  const userId = paramUserId || headerUserId;

  if (!userId) {
    return NextResponse.json({ success: true, userId: null, applications: [] });
  }

  // 1. Fetch user applications from Firestore
  let userApps: any[] = await getUserApplicationsFromFirestore(userId).catch(() => []);

  // 2. If empty in Firestore, check memory store for this specific userId
  if (userApps.length === 0) {
    userApps = db.applications.filter(a => a.userId === userId);
  }

  const applications = userApps.map(app => {
    const job = db.jobPostings.find(j => j.id === app.jobPostingId || j.sourceJobId === app.jobPostingId);
    const resume = db.resumes.find(r => r.id === app.tailoredResumeId);
    const match = db.matches.find(m => m.jobPostingId === app.jobPostingId && m.userId === userId);

    const storedVerification =
      app.submissionVerification && typeof app.submissionVerification.verified === 'boolean'
        ? app.submissionVerification
        : {
            verified: false,
            verificationMethod: null,
            confirmationText: null,
            confirmationId: null,
            confirmationUrl: null,
            submittedAt: null,
            externalDomain: null,
            screenshotPath: null,
            failureReason: 'No external confirmation record exists for this entry.',
          };

    let resolvedStatus = app.status;
    if (resolvedStatus === 'SUBMITTED' && !storedVerification.verified) {
      resolvedStatus = 'EXTERNAL_CONFIRMATION_REQUIRED';
    }

    return {
      ...app,
      status: resolvedStatus,
      submissionVerification: storedVerification,
      stage: resolvedStatus === 'SUBMITTED' ? 'SUBMITTED' : (app.stage || 'PENDING'),
      job,
      resume,
      matchScore: match?.matchResult?.overallScore || 90
    };
  });

  return NextResponse.json({
    success: true,
    userId,
    applications
  });
}

export async function POST(request: Request) {
  const headerUserId = request.headers.get('x-user-id');
  const body = await request.json();
  const userId = body.userId || headerUserId;

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
  }

  const newApp = {
    ...body,
    id: body.id || `app_${Date.now()}_${userId}`,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.applications.push(newApp);
  await saveApplicationToFirestore(userId, newApp).catch(e => console.warn('Firestore app save error:', e));

  return NextResponse.json({
    success: true,
    userId,
    application: newApp
  });
}
