import { NextResponse } from 'next/server';
import { getCrawlRouterConfig } from '@/lib/ai-providers';
import { verifyAdminRequest } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/ops/crawl-config - 返回 claude-code-router 配置（供 GH Actions 动态生成 config.json）
// 包含解密后的 API Key，仅限 admin 会话或 x-admin-key 访问
export async function GET(request: Request) {
  const authed = await verifyAdminRequest(request);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const config = await getCrawlRouterConfig();
    return NextResponse.json({ success: true, ...config });
  } catch (error) {
    console.error('Error in GET /api/ops/crawl-config:', error);
    return NextResponse.json({ error: 'Failed to load crawl config' }, { status: 500 });
  }
}
