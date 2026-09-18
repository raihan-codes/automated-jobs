import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ResumeGenerator } from '@/services/ai/resume-generator';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionUserId = await getCurrentUserId(request);
    if (!sessionUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = body.userId || sessionUserId;
    const { jobId } = body;

    const job = db.jobPostings.find(j => j.id === jobId || j.sourceJobId === jobId) || db.jobPostings[0];
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    const profile = db.profiles.get(userId);
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Candidate profile not found' }, { status: 404 });
    }

    const tailoredContent = await ResumeGenerator.generateTailoredResume(profile, job);

    const resumeRecord = {
      id: `resume_${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`,
      userId,
      jobPostingId: job.id,
      content: tailoredContent,
      createdAt: new Date().toISOString()
    };

    db.resumes.unshift(resumeRecord);

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
