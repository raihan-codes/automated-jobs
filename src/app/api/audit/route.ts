import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const tenantId = 'tenant_prod_enterprise_1';
  const logs = db.auditLogs.filter(l => l.tenantId === tenantId && l.userId === userId);
  return NextResponse.json({
    success: true,
    logs
  });
}
