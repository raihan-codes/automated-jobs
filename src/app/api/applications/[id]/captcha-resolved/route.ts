import { NextRequest, NextResponse } from 'next/server';
import { ATSPlaywrightWorker } from '@/services/automation/ats-playwright-worker';
import { getCurrentUserId } from '@/lib/auth';

/**
 * POST /api/applications/[id]/captcha-resolved
 *
 * Called when the user has manually completed the CAPTCHA / anti-bot challenge
 * in the external application flow. Transitions status to READY_TO_SUBMIT
 * or AWAITING_USER_APPROVAL.
 *
 * Note: Never marks as SUBMITTED merely because CAPTCHA was resolved.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = (await getCurrentUserId(request)) || 'user_raihan_molla';
    const appId = params.id;

    const result = await ATSPlaywrightWorker.resolveCaptcha(appId, userId);

    return NextResponse.json({
      success: true,
      status: result.status,
      message: result.message
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
