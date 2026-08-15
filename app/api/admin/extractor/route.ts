// version-extractor 配置：GET 读当前配置+健康，PUT 设置 URL，POST 测连接+试提取+审计概览
import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth';
import { getExtractorUrl, setExtractorUrl } from '@/lib/extractor-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/extractor
export async function GET(request: Request) {
  const authed = await verifyAdminRequest(request);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = await getExtractorUrl();
  let health: unknown = null;
  if (url) {
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(8000) });
      health = await res.json().catch(() => null);
    } catch {
      health = { error: '无法连接' };
    }
  }
  return NextResponse.json({ url, configured: Boolean(url), health });
}

// PUT /api/admin/extractor  { url }
export async function PUT(request: Request) {
  const authed = await verifyAdminRequest(request);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const url = String(body.url || '').trim();
  if (url && !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'url 必须是 http(s) 地址' }, { status: 400 });
  }
  await setExtractorUrl(url);
  return NextResponse.json({ success: true, url });
}

// POST /api/admin/extractor/test  { probe?, productName? } — 测 health + 试提取 + 审计概览
export async function POST(request: Request) {
  const authed = await verifyAdminRequest(request);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const base = await getExtractorUrl();
  if (!base) return NextResponse.json({ error: '未配置 extractor 地址' }, { status: 400 });
  const result: Record<string, unknown> = { base };
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(8000) });
    result.health = await res.json().catch(() => null);
  } catch {
    result.health = { error: 'health 请求失败（连接不通？）' };
  }
  const probe = String(body.probe || '').trim();
  if (probe) {
    try {
      const extractRes = await fetch(`${base}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: probe, fields: ['version', 'changelog'], ...(body.productName ? { productName: String(body.productName) } : {}) }),
        signal: AbortSignal.timeout(40000),
      });
      result.extract = await extractRes.json().catch(() => null);
    } catch (e: unknown) {
      result.extract = { error: e instanceof Error ? e.message : String(e) };
    }
  }
  try {
    const auditRes = await fetch(`${base}/audit?limit=5`, { signal: AbortSignal.timeout(8000) });
    result.audit = await auditRes.json().catch(() => null);
  } catch {
    result.audit = null;
  }
  return NextResponse.json(result);
}
