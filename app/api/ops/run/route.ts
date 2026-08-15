import { NextRequest, NextResponse } from 'next/server';
import { startRunAsync } from '@/lib/ops';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/ops/run - 触发一次站内运营（异步执行）
// Body: { phase: 'github'|'trending', repos?, include_prerelease?, limit_per_repo?, ... }
export async function POST(request: NextRequest) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => ({}));
    const phase = body.phase || 'github';
    if (phase !== 'github' && phase !== 'trending') {
      return NextResponse.json({ error: `Unsupported phase: ${phase}` }, { status: 400 });
    }

    const { id } = await startRunAsync({
      phase,
      triggeredBy: 'admin',
      repos: Array.isArray(body.repos) ? body.repos : undefined,
      reposText: typeof body.repos === 'string' ? body.repos : undefined,
      includePrerelease: Boolean(body.include_prerelease),
      limitPerRepo: body.limit_per_repo === undefined ? undefined : Number(body.limit_per_repo),
      language: body.language,
      since: body.since,
      perPage: body.per_page === undefined ? undefined : Number(body.per_page),
    });

    return NextResponse.json({ success: true, opRunId: id, status: 'running' });
  } catch (error) {
    console.error('Error in POST /api/ops/run:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to start run: ${message}` }, { status: 500 });
  }
}
