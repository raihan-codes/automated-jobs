import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ATSPlaywrightWorker } from '@/services/automation/ats-playwright-worker';
import { getCurrentUserId } from '@/lib/auth';
import { getUserApplicationsFromFirestore, getProfileFromFirestore } from '@/lib/firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUserId = await getCurrentUserId(request);
    const targetId = params.id;
    const { searchParams } = new URL(request.url);
    const paramUserId = searchParams.get('userId');
    const headerUserId = request.headers.get('x-user-id');
    const userId = paramUserId || headerUserId || sessionUserId || 'user_raihan_molla';

    // 1. Check in-memory store
    let app = db.applications.find(
      a => (a.id === targetId || a.jobPostingId === targetId) && (a.userId === userId || !a.userId)
    );

    if (!app) {
      app = db.applications.find(a => a.id === targetId || a.jobPostingId === targetId);
    }

    // 2. Hydrate from Cloud Firestore if not found in memory
    if (!app && userId) {
      const firestoreApps = await getUserApplicationsFromFirestore(userId).catch(() => []);
      const foundInFirestore = firestoreApps.find(
        a => a.id === targetId || a.jobPostingId === targetId
      );

      if (foundInFirestore) {
        app = {
          ...foundInFirestore,
          fields: foundInFirestore.fields || [],
          automationEngine: foundInFirestore.automationEngine || 'PLAYWRIGHT',
          hasSensitiveQuestions: Boolean(foundInFirestore.hasSensitiveQuestions),
          requiresHumanInput: Boolean(foundInFirestore.requiresHumanInput),
          stage: (foundInFirestore.stage as any) || 'SUBMITTED',
          createdAt: foundInFirestore.createdAt || new Date().toISOString(),
          updatedAt: foundInFirestore.updatedAt || new Date().toISOString()
        };
        // Add to memory cache
        db.applications.unshift(app);
      }
    }

    // 3. If targetId is actually a Job ID, prepare/retrieve the application
    if (!app) {
      const job = db.jobPostings.find(
        j => j.id === targetId || j.sourceJobId === targetId || j.id.toLowerCase() === targetId.toLowerCase()
      );

      if (job) {
        let profile = db.profiles.get(userId);
        if (!profile) {
          profile = (await getProfileFromFirestore(userId).catch(() => null)) || undefined;
          if (profile) db.profiles.set(userId, profile);
        }

        if (profile) {
          const prepResult = await ATSPlaywrightWorker.prepareApplication(userId, job, profile);
          if (prepResult.id) {
            app = db.applications.find(a => a.id === prepResult.id);
          }
        }
      }
    }

    if (!app) {
      return NextResponse.json({
        success: false,
        error: `Application ${targetId} not found in database.`
      }, { status: 404 });
    }

    // Locate associated Job posting
    const job = db.jobPostings.find(
      j => j.id === app?.jobPostingId || j.sourceJobId === app?.jobPostingId
    );

    const resume = db.resumes.find(r => r.id === app?.tailoredResumeId);
    const match = db.matches.find(
      m => (m.jobPostingId === app?.jobPostingId || (job && m.jobPostingId === job.id)) && m.userId === userId
    );

    return NextResponse.json({
      success: true,
      application: {
        ...app,
        job: job || {
          id: app.jobPostingId,
          title: 'Software Engineer',
          company: 'Hiring Company',
          location: 'Remote',
          sourcePlatform: 'ADZUNA',
          employmentType: 'FULL_TIME',
          applicationUrl: app.formUrl,
          descriptionRaw: ''
        },
        resume,
        matchScore: match?.matchResult?.overallScore || 85
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
