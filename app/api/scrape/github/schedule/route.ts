import { NextRequest, NextResponse } from 'next/server';
import {
  getGithubScheduleStatus,
  runGithubScheduleOnce,
  updateGithubSchedule,
} from '@/lib/github';

export const runtime = 'nodejs';

// GET /api/scrape/github/schedule - 查看 GitHub 仓库计划状态
export async function GET() {
  try {
    return NextResponse.json({ success: true, schedule: getGithubScheduleStatus() });
  } catch (error) {
    console.error('[schedule] GET error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/scrape/github/schedule - 更新计划 / 立即运行
// Body:
//   repos: string[]            — 仓库列表
//   include_prerelease: boolean
//   limit_per_repo?: number
//   interval_minutes?: number  — 0 表示不定时
//   run_now: boolean
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const repos = Array.isArray(body.repos)
      ? body.repos.map((s: unknown) => String(s))
      : typeof body.repos === 'string'
        ? body.repos.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean)
        : [];
    const includePrerelease = Boolean(body.include_prerelease);
    const limitPerRepo = body.limit_per_repo === undefined ? undefined : Number(body.limit_per_repo);
    const intervalMinutes = body.interval_minutes === undefined ? 0 : Number(body.interval_minutes);

    updateGithubSchedule(repos, intervalMinutes, includePrerelease, limitPerRepo);

    const runNow = Boolean(body.run_now);
    const runResult = runNow ? await runGithubScheduleOnce() : null;

    return NextResponse.json({
      success: true,
      schedule: getGithubScheduleStatus(),
      run_result: runResult,
    });
  } catch (error) {
    console.error('[schedule] POST error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
