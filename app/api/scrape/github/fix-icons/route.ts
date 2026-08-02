import { NextResponse } from 'next/server';
import { fixGithubIcons } from '@/lib/github';

export const runtime = 'nodejs';

// POST /api/scrape/github/fix-icons - 遍历所有项目，从 GitHub 补全图标
export async function POST() {
  try {
    const result = await fixGithubIcons();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[fix-icons] error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
