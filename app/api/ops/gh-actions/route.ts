import { NextRequest, NextResponse } from 'next/server';
import { getLatestWorkflowRun, isGhDispatchConfigured, getRepoName } from '@/lib/github-actions';
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
    deprecated: true, // GitHub Actions 派发已废弃，仅保留状态查看
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
  // 已废弃：版本提取/微任务统一走 version-extractor（站内 in-app），GH Actions 派发不再使用
  return NextResponse.json({ error: 'GitHub Actions 派发已废弃，请使用 version-extractor 站内执行', deprecated: true }, { status: 410 });
}
