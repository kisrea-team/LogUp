import { NextRequest, NextResponse } from 'next/server';
import { fetchGithubRepoInfo } from '@/lib/github';

export const runtime = 'nodejs';

// POST /api/scrape/github/repo - 抓取单个仓库的汇总信息（供 admin 表单自动填充）
// Body: { repoUrl: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const repoUrl = body.repoUrl || body.repo || body.name;
    if (!repoUrl) {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
    }

    const info = await fetchGithubRepoInfo(String(repoUrl));
    if (!info) {
      return NextResponse.json({ error: 'Invalid GitHub repo input' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: info });
  } catch (error) {
    console.error('[scrape/github/repo] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
