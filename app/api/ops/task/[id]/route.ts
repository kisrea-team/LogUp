import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/ops/task/[id] - 查询任务状态/结果（Accept: text/event-stream → SSE 实时）
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  const params = await props.params;
  const taskId = params.id;

  try {
    const task = await prisma.opTask.findUnique({ where: { taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const wantsSse = request.headers.get('accept')?.includes('text/event-stream');
    if (wantsSse) {
      // 轮询式 SSE：每 2s 推送一次状态，直到完成
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const push = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          try {
            for (let i = 0; i < 120; i += 1) {
              const cur = await prisma.opTask.findUnique({ where: { taskId } });
              if (!cur) break;
              push({ success: true, data: cur });
              if (cur.status === 'success' || cur.status === 'failed' || cur.status === 'cancelled') break;
              await new Promise((r) => setTimeout(r, 2000));
            }
          } catch (e) {
            push({ error: e instanceof Error ? e.message : String(e) });
          } finally {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' },
      });
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

// POST /api/ops/task/[id] - 取消任务
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  const params = await props.params;
  const taskId = params.id;

  try {
    const task = await prisma.opTask.findUnique({ where: { taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    if (task.status === 'success' || task.status === 'failed' || task.status === 'cancelled') {
      return NextResponse.json({ success: true, note: 'task already finished' });
    }
    const updated = await prisma.opTask.update({
      where: { taskId },
      data: { status: 'cancelled', finishedAt: new Date(), error: 'cancelled by admin' },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error cancelling task:', error);
    return NextResponse.json({ error: 'Failed to cancel task' }, { status: 500 });
  }
}
