// GET /api/admin/extractor/audit?url=…&llmWrong=1&version=…&limit=n — 代理 version-extractor 的 /audit
import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth';
import { getExtractorUrl } from '@/lib/extractor-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authed = await verifyAdminRequest(request);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const base = await getExtractorUrl();
  if (!base) return NextResponse.json({ error: '未配置 extractor 地址' }, { status: 400 });
  const query = new URL(request.url).searchParams.toString();
  try {
    const res = await fetch(`${base}/audit?${query}`, { signal: AbortSignal.timeout(10000) });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.ok ? 200 : res.status });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
