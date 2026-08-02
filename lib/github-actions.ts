// GitHub Actions 控制（后台派发流水线/微任务）
//
// 需 GH_DISPATCH_TOKEN（带 workflow 权限的 PAT），仓库从 GITHUB_REPO 读取。
import { createHash } from 'crypto';

function getRepo(): { owner: string; repo: string } | null {
  const raw = process.env.GITHUB_REPO || process.env.GITHUB_REPO_NAME || 'kisrea-team/LogUp';
  const parts = raw.replace(/\.git$/, '').split('/');
  if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
  return null;
}

function getDispatchToken(): string {
  return process.env.GH_DISPATCH_TOKEN || process.env.GH_TOKEN || '';
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'logup-ops-control',
  };
  const token = getDispatchToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// 派发一个 workflow（workflow_dispatch）
export async function dispatchWorkflow(opts: {
  workflowFile: string; // 如 github-data-ops.yml 或 task-run.yml
  ref?: string;
  inputs?: Record<string, string>;
}): Promise<{ ok: boolean; status: number; error?: string }> {
  const repo = getRepo();
  if (!repo) return { ok: false, status: 0, error: 'GITHUB_REPO not configured' };
  const token = getDispatchToken();
  if (!token) return { ok: false, status: 0, error: 'GH_DISPATCH_TOKEN not configured' };

  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/actions/workflows/${encodeURIComponent(opts.workflowFile)}/dispatches`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: githubHeaders(),
    body: JSON.stringify({
      ref: opts.ref || 'dev',
      ...(opts.inputs ? { inputs: opts.inputs } : {}),
    }),
  });
  if (resp.ok) return { ok: true, status: resp.status };
  const text = await resp.text().catch(() => '');
  return { ok: false, status: resp.status, error: `http ${resp.status}: ${text.slice(0, 200)}` };
}

// 最近一次 workflow 运行状态
export async function getLatestWorkflowRun(workflowFile?: string) {
  const repo = getRepo();
  if (!repo) return { ok: false, error: 'GITHUB_REPO not configured' };
  try {
    let url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/actions/runs?per_page=1`;
    if (workflowFile) {
      url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/actions/workflows/${encodeURIComponent(workflowFile)}/runs?per_page=1`;
    }
    const resp = await fetch(url, { headers: githubHeaders() });
    if (!resp.ok) return { ok: false, status: resp.status, error: `http ${resp.status}` };
    const data = (await resp.json()) as { workflow_runs?: Array<Record<string, unknown>> };
    const run = data.workflow_runs?.[0] || null;
    return {
      ok: true,
      run: run
        ? {
            id: run.id,
            name: run.name,
            display_title: run.display_title,
            status: run.status,
            conclusion: run.conclusion,
            head_branch: run.head_branch,
            created_at: run.created_at,
            updated_at: run.updated_at,
            html_url: run.html_url,
          }
        : null,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// 取消运行
export async function cancelWorkflowRun(runId: number) {
  const repo = getRepo();
  if (!repo) return { ok: false, error: 'GITHUB_REPO not configured' };
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${repo.owner}/${repo.repo}/actions/runs/${runId}/cancel`,
      { method: 'POST', headers: githubHeaders() }
    );
    if (resp.ok) return { ok: true, status: resp.status };
    return { ok: false, status: resp.status, error: `http ${resp.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// 供后台显示 token 是否已配置（不泄露 token 本身）
export function isGhDispatchConfigured(): boolean {
  return Boolean(getDispatchToken()) && Boolean(getRepo());
}

export function getRepoName(): string {
  const repo = getRepo();
  return repo ? `${repo.owner}/${repo.repo}` : '';
}

export function generateRequestId(): string {
  const h = createHash('sha1').update(`${Date.now()}${Math.random()}`).digest('hex').slice(0, 12);
  return `ghreq_${h}`;
}
