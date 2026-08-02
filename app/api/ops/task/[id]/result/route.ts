import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/ops/task/[id]/result - GH Actions 微任务执行结果回传
// Body: { status: 'success'|'failed', result?, error? }
// 鉴权：session cookie 或 x-admin-key
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const authed = await verifyAdminRequest(request);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const params = await props.params;
  const taskId = params.id;

  try {
    const body = await request.json().catch(() => ({}));
    const status = body.status === 'failed' ? 'failed' : 'success';
    const result = body.result && typeof body.result === 'object' ? body.result : undefined;
    const error = typeof body.error === 'string' ? body.error : undefined;

    const task = await prisma.opTask.findUnique({ where: { taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updated = await prisma.opTask.update({
      where: { taskId },
      data: {
        status,
        progress: 1,
        result: result ?? undefined,
        error: error ?? undefined,
        finishedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error saving task result:', error);
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
  }
}
