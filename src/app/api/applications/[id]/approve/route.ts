import { NextRequest, NextResponse } from 'next/server';
import { ATSPlaywrightWorker } from '@/services/automation/ats-playwright-worker';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = (await getCurrentUserId(request)) || 'user_raihan_molla';
    const appId = params.id;

    const result = await ATSPlaywrightWorker.submitApplication(appId, userId);

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
