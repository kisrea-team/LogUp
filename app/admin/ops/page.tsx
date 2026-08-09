'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import AdminCard from '@/components/admin/AdminCard';
import StatCard from '@/components/admin/StatCard';

interface OpRun {
  id: number;
  triggeredBy: string;
  phase: string;
  status: string;
  summary?: unknown;
  error?: string | null;
  startedAt: string;
  finishedAt?: string | null;
}

interface OpsStatus {
  recent_runs: OpRun[];
  github_schedule?: { enabled: boolean; repos: string[]; interval_minutes: number; last_run_at?: string | null };
  trending_schedule?: { enabled: boolean; interval_minutes: number; last_run_at?: string | null };
  ai_providers_enabled: number;
  proxy_configured: boolean;
  proxy_count: number;
  projects_count: number;
  site_url?: string;
}

interface GhActionsStatus {
  configured: boolean;
  repo: string;
  main_workflow?: { id: number; status: string; conclusion?: string | null; display_title?: string; updated_at?: string; html_url?: string } | null;
  task_workflow?: { id: number; status: string; conclusion?: string | null; display_title?: string; updated_at?: string; html_url?: string } | null;
  main_error?: string | null;
  task_error?: string | null;
}

const RUN_BADGE: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-orange-100 text-orange-700',
};

const STATUS_STYLE: Record<string, string> = {
  running: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  queued: 'bg-gray-100 text-gray-600',
};

const PHASE_LABEL: Record<string, string> = {
  github: 'GitHub 抓取',
  trending: 'Trending 抓取',
  probe: '全量探测',
};

export default function OpsControlPage() {
  const [status, setStatus] = useState<OpsStatus | null>(null);
  const [reposText, setReposText] = useState('');
  const [includePrerelease, setIncludePrerelease] = useState(false);
  const [limitPerRepo, setLimitPerRepo] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [gh, setGh] = useState<GhActionsStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchGhStatus = useCallback(async () => {
    try {
      const resp = await apiFetch('/ops/gh-actions');
      if (!resp.ok) return;
      const data = await resp.json();
      setGh(data);
    } catch { /* ignore */ }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await apiFetch('/ops/status');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setStatus(data);
      setError('');
    } catch (e: any) {
      setError(e?.message || '无法获取运营状态');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchGhStatus();
    // 每 3 秒轮询，实时反映运行进度
    pollRef.current = setInterval(() => {
      fetchStatus();
      fetchGhStatus();
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus, fetchGhStatus]);

  const triggerRun = async (phase: string) => {
    try {
      setBusy(phase);
      setError('');
      const body: Record<string, unknown> = { phase };
      if (phase === 'github') {
        body.repos = reposText;
        body.include_prerelease = includePrerelease;
        if (limitPerRepo !== '') body.limit_per_repo = Number(limitPerRepo);
      }
      const resp = await apiFetch('/ops/run', { method: 'POST', body: JSON.stringify(body) });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      // 触发成功后立即刷新状态
      setTimeout(fetchStatus, 800);
    } catch (e: any) {
      setError(e?.message || '触发失败');
    } finally {
      setBusy(null);
    }
  };

  const dispatchGhActions = async (workflow: 'github-data-ops.yml' | 'task-run.yml') => {
    try {
      setBusy(workflow);
      setError('');
      const resp = await apiFetch('/ops/gh-actions', {
        method: 'POST',
        body: JSON.stringify({ action: 'dispatch', workflow }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setTimeout(fetchGhStatus, 1000);
    } catch (e: any) {
      setError(e?.message || '派发失败');
    } finally {
      setBusy(null);
    }
  };

  const cancelGhRun = async (runId: number) => {
    try {
      setError('');
      const resp = await apiFetch('/ops/gh-actions', {
        method: 'POST',
        body: JSON.stringify({ action: 'cancel', run_id: runId }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setTimeout(fetchGhStatus, 1000);
    } catch (e: any) {
      setError(e?.message || '取消失败');
    }
  };

  const renderRun = (run?: GhActionsStatus['main_workflow']) => {
    if (!run) return <span className="text-gray-400">无记录</span>;
    const badge = RUN_BADGE[run.status] || 'bg-gray-100';
    const conclusion = run.conclusion ? ` · ${run.conclusion}` : '';
    return (
      <span className="flex items-center gap-2">
        <span className={`px-2 py-0.5 text-xs rounded-full ${badge}`}>{run.status}{conclusion}</span>
        <span className="text-xs text-gray-500">{run.display_title?.slice(0, 40) || `#${run.id}`}</span>
        {run.status === 'in_progress' && (
          <button onClick={() => cancelGhRun(run.id!)} className="text-xs text-red-500 hover:underline">取消</button>
        )}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">运营控制</h1>
        <p className="text-sm text-gray-500 mt-1">在站内直接触发抓取、查看进度与历史。完整流水线（含 AI 长尾）由 GitHub Actions 兜底。</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 即时抓取 */}
      <AdminCard title="即时抓取" description="在站内直接触发一次抓取，进度实时轮询">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GitHub 指定仓库 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">GitHub 指定仓库抓取</h3>
            <textarea
              value={reposText}
              onChange={(e) => setReposText(e.target.value)}
              rows={4}
              placeholder={'owner/repo 或 GitHub URL，每行一个\n如：vercel/next.js\nmicrosoft/vscode'}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input type="checkbox" checked={includePrerelease} onChange={(e) => setIncludePrerelease(e.target.checked)} />
                包含预发布
              </label>
              <label className="text-sm text-gray-600 flex items-center gap-1.5">
                每仓库上限
                <input
                  type="number"
                  value={limitPerRepo}
                  onChange={(e) => setLimitPerRepo(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                  placeholder="不限"
                />
              </label>
            </div>
            <button
              onClick={() => triggerRun('github')}
              disabled={busy === 'github' || !reposText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {busy === 'github' ? '触发中...' : '触发 GitHub 抓取'}
            </button>
          </div>

          {/* Trending */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Trending 热门抓取</h3>
            <p className="text-sm text-gray-500">按当前 Trending 调度配置（语言/周期/数量）执行一次。</p>
            <div className="text-sm text-gray-600 space-y-1">
              <p>最近运行：{status?.trending_schedule?.last_run_at ? formatRelativeTime(status.trending_schedule.last_run_at) : '—'}</p>
              <p>调度间隔：{status?.trending_schedule?.interval_minutes ? `${status.trending_schedule.interval_minutes} 分钟` : '未启用'}</p>
            </div>
            <button
              onClick={() => triggerRun('trending')}
              disabled={busy === 'trending'}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm"
            >
              {busy === 'trending' ? '触发中...' : '触发 Trending 抓取'}
            </button>
          </div>
        </div>
      </AdminCard>

      {/* GitHub Actions 控制 —— 已废弃：版本提取/微任务统一走 version-extractor（站内 in-app） */}
      <AdminCard title="GitHub Actions 控制（已废弃）" description="版本提取与微任务已统一走 version-extractor 站内执行，GitHub Actions 派发不再使用。">
        <div className="p-6 text-sm text-gray-500">
          <p>GitHub Actions 派发（github-data-ops / task-run）已废弃。</p>
          <p className="mt-1">版本提取、更新项目、获取最新版本均通过 version-extractor API 在站内完成。</p>
        </div>
      </AdminCard>

      {/* 状态概览 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="项目总数" value={status?.projects_count ?? '—'} delay={0} />
        <StatCard label="启用 AI Provider" value={status?.ai_providers_enabled ?? '—'} delay={0.05} />
        <StatCard label="代理池" value={status?.proxy_configured ? `${status.proxy_count} 个` : '未配置'} delay={0.1} />
        <StatCard label="GitHub 调度" value={status?.github_schedule?.enabled ? '已启用' : '未启用'} delay={0.15} />
      </div>

      {/* 最近运行 */}
      <AdminCard title="最近运行" description="后台触发的运营任务">
        {loading ? (
          <p className="p-8 text-center text-gray-500">加载中...</p>
        ) : (status?.recent_runs || []).length === 0 ? (
          <p className="p-8 text-center text-gray-500">暂无运行记录</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">阶段</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">触发</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">开始</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">耗时</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">摘要/错误</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {(status?.recent_runs || []).map((run) => (
                <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-500">#{run.id}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">{PHASE_LABEL[run.phase] || run.phase}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_STYLE[run.status] || 'bg-gray-100 text-gray-600'}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{run.triggeredBy}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatRelativeTime(run.startedAt)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {run.finishedAt ? formatRelativeTime(run.finishedAt) : '运行中'}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500 max-w-[240px] truncate">
                    {run.error || (run.summary ? JSON.stringify(run.summary).slice(0, 120) : '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
    </div>
  );
}
