import { NextRequest, NextResponse } from 'next/server';
import { scrapeGithubReleasesToDb } from '@/lib/github';

export const runtime = 'nodejs';

// POST /api/scrape - 通用爬取入口
// 从 GitHub releases 抓取指定仓库并入库。
// Body: { repos: string[], include_prerelease?: boolean, limit_per_repo?: number }
//
// 注：历史版本这里曾内置 VS Code RSS 特例爬虫（Crawlee），已移除。
// VS Code 作为 GitHub 仓库 (microsoft/vscode) 由通用 GitHub 爬虫覆盖。
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const repos = Array.isArray(body.repos)
      ? body.repos.map((s: unknown) => String(s)).filter(Boolean)
      : typeof body.repos === 'string'
        ? body.repos.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean)
        : [];

    if (!repos.length) {
      return NextResponse.json(
        { success: false, error: 'repos is required (array of owner/repo or GitHub URLs)' },
        { status: 400 }
      );
    }

    const result = await scrapeGithubReleasesToDb({
      repos,
      includePrerelease: Boolean(body.include_prerelease),
      limitPerRepo: body.limit_per_repo === undefined ? undefined : Number(body.limit_per_repo),
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Scrape API error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
