// GET /api/ops/extractor-config - 返回 version-extractor 地址（供 GH Actions workflow 动态读取，代替硬编码 secret）
import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth';
import { getExtractorUrl } from '@/lib/extractor-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authed = await verifyAdminRequest(request);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = await getExtractorUrl();
  return NextResponse.json({ success: true, url, configured: Boolean(url) });
}
