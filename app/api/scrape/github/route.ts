import { NextRequest, NextResponse } from 'next/server';
import { scrapeGithubReleasesToDb } from '@/lib/github';

export const runtime = 'nodejs';

// POST /api/scrape/github - 抓取指定仓库的 releases 入库
// Body: { repos: string[], include_prerelease?: boolean, limit_per_repo?: number }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const repos = Array.isArray(body.repos)
      ? body.repos.map((s: unknown) => String(s)).filter(Boolean)
      : typeof body.repos === 'string'
        ? body.repos.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean)
        : (process.env.GITHUB_REPOS || '').split(',').map((s: string) => s.trim()).filter(Boolean);

    if (!repos.length) {
      return NextResponse.json({ error: 'repos is required' }, { status: 400 });
    }

    const includePrerelease = Boolean(body.include_prerelease);
    const limitPerRepo =
      body.limit_per_repo === undefined ? undefined : Number(body.limit_per_repo);

    const result = await scrapeGithubReleasesToDb({ repos, includePrerelease, limitPerRepo });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('[scrape/github] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
