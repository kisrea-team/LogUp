import { NextResponse } from 'next/server';
import { getOpsStatus } from '@/lib/ops';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/ops/status - 全局运营状态（最近运行/调度/代理/AI Provider）
export async function GET(request: Request) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  try {
    const status = await getOpsStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    console.error('Error in GET /api/ops/status:', error);
    return NextResponse.json({ error: 'Failed to load ops status' }, { status: 500 });
  }
}
