import { NextRequest, NextResponse } from 'next/server';
import { dispatchTask, listTasks, getTaskDefinition, TASK_REGISTRY } from '@/lib/tasks';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/ops/task - 任务列表
export async function GET(request: NextRequest) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  try {
    const tasks = await listTasks();
    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error listing tasks:', error);
    return NextResponse.json({ error: 'Failed to list tasks' }, { status: 500 });
  }
}

// POST /api/ops/task - 派发微任务
// Body: { type, inputs: {...} }
export async function POST(request: NextRequest) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const type = String(body.type || '').trim();
    const def = getTaskDefinition(type);
    if (!def) {
      return NextResponse.json(
        { error: `Unknown task type: ${type}. Available: ${TASK_REGISTRY.map((t) => t.type).join(', ')}` },
        { status: 400 }
      );
    }
    const inputs = (body.inputs && typeof body.inputs === 'object' ? body.inputs : {}) as Record<string, unknown>;
    const { taskId } = await dispatchTask({ type, inputs, triggeredBy: 'admin' });
    return NextResponse.json({ success: true, taskId, engine: def.engine });
  } catch (error) {
    console.error('Error dispatching task:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to dispatch task: ${message}` }, { status: 500 });
  }
}
