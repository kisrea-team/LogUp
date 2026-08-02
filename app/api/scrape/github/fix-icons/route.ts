import { NextRequest, NextResponse } from 'next/server';
import { fixGithubIcons } from '@/lib/github';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

// POST /api/scrape/github/fix-icons - 遍历所有项目，从 GitHub 补全图标
export async function POST(request: NextRequest) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;

  try {
    const result = await fixGithubIcons();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[fix-icons] error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
