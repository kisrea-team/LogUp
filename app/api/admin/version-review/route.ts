// 人工版本审核：提取版本交叉校验异常时，人工批准/拒绝的决策。
// GET  ?url=&version=  → 查已有决策；POST { url, version, decision, context, projectId? } → 记录（upsert）
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/version-review?url=...&version=...
export async function GET(request: Request) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url') || '';
  const version = url.searchParams.get('version') || '';
  if (!targetUrl || !version) return NextResponse.json({ error: 'url 和 version 必填' }, { status: 400 });
  const review = await prisma.versionReview.findUnique({
    where: { url_version: { url: targetUrl, version } },
  });
  return NextResponse.json({ found: Boolean(review), review });
}

// POST /api/admin/version-review  { url, version, decision, context?, projectId? }
export async function POST(request: Request) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const url = String(body.url || '').trim();
  const version = String(body.version || '').trim();
  const decision = String(body.decision || '');
  if (!url || !version || (decision !== 'approve' && decision !== 'reject')) {
    return NextResponse.json({ error: 'url/version/decision(approve|reject) 必填' }, { status: 400 });
  }
  const review = await prisma.versionReview.upsert({
    where: { url_version: { url, version } },
    update: {
      decision,
      context: body.context ? String(body.context).slice(0, 2000) : undefined,
      projectId: body.projectId ? Number(body.projectId) : undefined,
    },
    create: {
      url,
      version,
      decision,
      context: body.context ? String(body.context).slice(0, 2000) : undefined,
      projectId: body.projectId ? Number(body.projectId) : undefined,
    },
  });
  return NextResponse.json({ success: true, review });
}
