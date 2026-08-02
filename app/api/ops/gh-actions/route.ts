import { NextRequest, NextResponse } from 'next/server';
import {
  dispatchWorkflow,
  getLatestWorkflowRun,
  cancelWorkflowRun,
  isGhDispatchConfigured,
  getRepoName,
} from '@/lib/github-actions';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/ops/gh-actions - 最近运行状态 + 配置
export async function GET(request: NextRequest) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  const workflow = request.nextUrl.searchParams.get('workflow') || undefined;
  const main = await getLatestWorkflowRun('github-data-ops.yml');
  const task = await getLatestWorkflowRun('task-run.yml');
  return NextResponse.json({
    success: true,
    configured: isGhDispatchConfigured(),
    repo: getRepoName(),
    main_workflow: main.run || null,
    task_workflow: task.run || null,
    main_error: main.error || null,
    task_error: task.error || null,
  });
}

// POST /api/ops/gh-actions - 派发 / 取消
// Body:
//   { action: 'dispatch', workflow: 'github-data-ops.yml'|'task-run.yml', ref?, inputs? }
//   { action: 'cancel', run_id: number }
export async function POST(request: NextRequest) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'dispatch';

    if (action === 'cancel') {
      const runId = Number(body.run_id);
      if (!Number.isFinite(runId)) return NextResponse.json({ error: 'run_id is required' }, { status: 400 });
      const result = await cancelWorkflowRun(runId);
      return NextResponse.json({ success: result.ok, ...result });
    }

    // dispatch
    const workflow = body.workflow || 'github-data-ops.yml';
    if (workflow !== 'github-data-ops.yml' && workflow !== 'task-run.yml') {
      return NextResponse.json({ error: `Unsupported workflow: ${workflow}` }, { status: 400 });
    }
    const result = await dispatchWorkflow({
      workflowFile: workflow,
      ref: body.ref || 'dev',
      inputs: body.inputs && typeof body.inputs === 'object' ? body.inputs : undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ error: `Dispatch failed: ${result.error || result.status}` }, { status: 500 });
    }
    return NextResponse.json({ success: true, workflow, ref: body.ref || 'dev', status: result.status });
  } catch (error) {
    console.error('Error in POST /api/ops/gh-actions:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed: ${message}` }, { status: 500 });
  }
}
