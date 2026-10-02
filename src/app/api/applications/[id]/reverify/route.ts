import { NextRequest, NextResponse } from 'next/server';
import { ATSPlaywrightWorker } from '@/services/automation/ats-playwright-worker';
import { getCurrentUserId } from '@/lib/auth';

/**
 * POST /api/applications/[id]/reverify
 *
 * Re-checks the stored submissionVerification evidence for a SUBMITTED application.
 *
 * If the stored evidence is insufficient (no confirmation text, no external URL,
 * or domain is a job board), the application is downgraded to
 * EXTERNAL_CONFIRMATION_REQUIRED.
 *
 * This is the backend for the "Re-verify Submission" button in the UI.
 *
 * INVARIANT: SUBMITTED status is preserved only if evidence is solid.
 *            No fabrication. No false positives.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = (await getCurrentUserId(request)) || 'user_raihan_molla';
    const appId = params.id;

    const result = await ATSPlaywrightWorker.reVerifySubmission(appId, userId);

    return NextResponse.json({
      success: true,
      finalStatus: result.finalStatus,
      submissionVerification: result.submissionVerification,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
