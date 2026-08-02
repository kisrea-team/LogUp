import { NextRequest, NextResponse } from 'next/server';
import {
  runTrendingScheduleOnce,
  updateTrendingSchedule,
  getTrendingScheduleStatus,
} from '@/lib/github';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/scrape/github/trending - 查看 trending 计划状态
export async function GET() {
  try {
    return NextResponse.json({ success: true, schedule: getTrendingScheduleStatus() });
  } catch (error) {
    console.error('[trending] GET error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/scrape/github/trending - 触发运行或更新计划
// Body (all optional):
//   run_now: boolean          — run immediately (default true)
//   set_schedule: boolean     — update schedule config
//   interval_minutes: number  — schedule interval
//   language: string          — filter by language
//   since: "daily"|"weekly"|"monthly"
//   per_page: number          — how many trending repos to fetch
//   limit_per_repo: number    — max releases per repo
export async function POST(request: NextRequest) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => ({}));

    if (body.set_schedule) {
      const intervalMinutes = body.interval_minutes === undefined ? 0 : Number(body.interval_minutes);
      updateTrendingSchedule({
        language: body.language || '',
        since: body.since || 'weekly',
        perPage: Number(body.per_page) > 0 ? Number(body.per_page) : 25,
        limitPerRepo: Number(body.limit_per_repo) > 0 ? Number(body.limit_per_repo) : 10,
        intervalMinutes,
      });
    }

    const runNow = body.run_now !== false;
    const runResult = runNow ? await runTrendingScheduleOnce() : null;

    return NextResponse.json({
      success: true,
      schedule: getTrendingScheduleStatus(),
      run_result: runResult,
    });
  } catch (error) {
    console.error('[trending] POST error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
