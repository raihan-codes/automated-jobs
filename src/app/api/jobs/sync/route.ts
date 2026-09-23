import { NextResponse } from 'next/server';
import { ingestionService } from '@/services/ingestion/sync-runner';
import { JobPlatform } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const platforms = ingestionService.getSupportedPlatforms();
  return NextResponse.json({
    success: true,
    platforms
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const platform = (body.platform || 'ALL') as string;
    const searchTarget = body.companySlug || body.query || 'software engineer';

    if (platform === 'ALL') {
      const result = await ingestionService.syncAllSources(searchTarget);
      return NextResponse.json({
        success: true,
        message: `Live Sync Completed: Discovered & updated ${result.totalSynced} real opportunities from Adzuna & Jooble APIs with cross-source deduplication.`,
        result
      });
    }

    const result = await ingestionService.syncCompanyJobs(platform as JobPlatform, searchTarget);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.totalFetched} real jobs (${result.newJobsCount} new, ${result.updatedJobsCount} updated) from ${platform} for "${searchTarget}".`,
      result
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Sync failed'
    }, { status: 500 });
  }
}
