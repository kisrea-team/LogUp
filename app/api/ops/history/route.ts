import { NextRequest, NextResponse } from 'next/server';
import { listOpRuns } from '@/lib/ops';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/ops/history - 运营历史
export async function GET(request: NextRequest) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  try {
    const limitParam = request.nextUrl.searchParams.get('limit') || '20';
    const limit = Math.max(1, Math.min(100, parseInt(limitParam, 10) || 20));
    const runs = await listOpRuns(limit);
    return NextResponse.json({ success: true, data: runs });
  } catch (error) {
    console.error('Error in GET /api/ops/history:', error);
    return NextResponse.json({ error: 'Failed to load ops history' }, { status: 500 });
  }
}
