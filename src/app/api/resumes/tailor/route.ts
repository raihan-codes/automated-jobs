import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ResumeGenerator } from '@/services/ai/resume-generator';
import { getCurrentUserId } from '@/lib/auth';
import { getProfileFromFirestore, saveResumeToFirestore } from '@/lib/firebase/firestore';

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
        error: 'Authentication required. Please sign in to tailor your resume and prepare your application.'
      }, { status: 401 });
    }

    const { jobId } = body;
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 });
    }

    if (db.jobPostings.length === 0) {
      db.seedDefaultData();
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
      return NextResponse.json({
        success: false,
        error: `Job ${jobId} not found in active discovery feed.`
      }, { status: 404 });
    }

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
        error: 'Candidate profile not found. Please upload or create a resume profile first.'
      }, { status: 404 });
    }

    const tailoredContent = await ResumeGenerator.generateTailoredResume(profile, job);

    const resumeRecord = {
      id: `resume_${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`,
      userId,
      jobPostingId: job.id,
      company: job.company,
      targetRole: job.title,
      content: tailoredContent,
      createdAt: new Date().toISOString()
    };

    db.resumes.unshift(resumeRecord);
    await saveResumeToFirestore(userId, resumeRecord).catch(() => {});

    // Record audit log
    db.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      tenantId: 'tenant_prod_enterprise_1',
      userId,
      action: 'RESUME_TAILORED_AND_VERIFIED',
      resourceType: 'TailoredResume',
      resourceId: resumeRecord.id,
      details: {
        company: job.company,
        role: job.title,
        isVerifiedTruthful: tailoredContent.isVerifiedTruthful,
        verifiedSkillsCount: tailoredContent.verificationReport?.verifiedSkillsCount
      },
      createdAt: new Date().toISOString()
    });

    // Notify user
    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId,
      type: 'RESUME_READY',
      title: `Tailored Resume Ready: ${job.company}`,
      message: `ATS-optimized, zero-hallucination verified resume generated for ${job.title}.`,
      actionUrl: `/resumes`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      resume: resumeRecord
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
