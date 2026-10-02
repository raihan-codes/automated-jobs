import { NextRequest, NextResponse } from 'next/server';
import { ATSPlaywrightWorker } from '@/services/automation/ats-playwright-worker';
import { getCurrentUserId } from '@/lib/auth';

/**
 * POST /api/applications/[id]/user-input
 *
 * Provides missing profile/form values when status is USER_INPUT_REQUIRED.
 * After values are provided, transitions to AWAITING_USER_APPROVAL.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = (await getCurrentUserId(request)) || 'user_raihan_molla';
    const appId = params.id;
    const body = await request.json();
    const updates = body.fields || {};

    const result = await ATSPlaywrightWorker.provideUserInput(appId, userId, updates);

    return NextResponse.json({
      success: true,
      status: result.status,
      fields: result.fields
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
