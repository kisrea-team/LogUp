'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

type RsshubSource = {
  id: number;
  name: string;
  project_ref: string;
  base_url: string;
  route_prefix: string;
  suffix: string | null;
  enabled: number;
  interval_minutes: number | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function CrawlerAdminPage() {
  const generateProjectRef = () => {
    try {
      return `rsshub-${crypto.randomUUID()}`;
    } catch {
      return `rsshub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
  };

  const [reposText, setReposText] = useState('');
  const [includePrerelease, setIncludePrerelease] = useState(false);
  const [limitPerRepo, setLimitPerRepo] = useState<number | ''>('');
  const [intervalMinutes, setIntervalMinutes] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const [rsshubTickMinutes, setRsshubTickMinutes] = useState<number | ''>(1);
  const [rsshubStatus, setRsshubStatus] = useState<any>(null);
  const [rsshubSources, setRsshubSources] = useState<RsshubSource[]>([]);
  const [rsshubLoading, setRsshubLoading] = useState(false);
  const [newSource, setNewSource] = useState(() => ({
    name: '',
    project_ref: generateProjectRef(),
    base_url: 'http://127.0.0.1:1200',
    route_prefix: '/github/releases',
    suffix: '',
    enabled: true,
    interval_minutes: 60 as number | '',
  }));

  const fetchScheduleStatus = async () => {
    try {
      const resp = await apiFetch(`/scrape/github/schedule`, { method: 'GET' });
      if (!resp.ok) return;
      const data = await resp.json().catch(() => null);
      if (data?.success && data?.schedule) {
        const s = data.schedule;
        setStatus(s);
        setIncludePrerelease(Boolean(s.include_prerelease));
        setLimitPerRepo(s.limit_per_repo ?? '');
        setIntervalMinutes(s.interval_minutes ?? '');
        setReposText(Array.isArray(s.repos) ? s.repos.join('\n') : '');
      }
    } catch { }
  };

  const fetchRsshubScheduleStatus = async () => {
    try {
      const resp = await apiFetch(`/scrape/rsshub/schedule`, { method: 'GET' });
      if (!resp.ok) return;
      const data = await resp.json().catch(() => null);
      if (data?.success && data?.schedule) {
        const s = data.schedule;
        setRsshubStatus(s);
        setRsshubTickMinutes(s.interval_minutes ?? '');
      }
    } catch { }
  };

  const fetchRsshubSources = async () => {
    try {
      const resp = await apiFetch(`/scrape/rsshub/sources`, { method: 'GET' });
      if (!resp.ok) return;
      const data = await resp.json().catch(() => null);
      if (data?.success && Array.isArray(data?.data)) {
        setRsshubSources(data.data);
      }
    } catch { }
  };

  useEffect(() => {
    fetchScheduleStatus();
    fetchRsshubScheduleStatus();
    fetchRsshubSources();
  }, []);

  const handleRun = async (runNow: boolean) => {
    try {
      setLoading(true);
      const resp = await apiFetch(`/scrape/github/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repos: reposText,
          include_prerelease: includePrerelease,
          limit_per_repo: limitPerRepo === '' ? undefined : Number(limitPerRepo),
          interval_minutes: intervalMinutes === '' ? 0 : Number(intervalMinutes),
          run_now: runNow,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (data?.success) {
        await fetchScheduleStatus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRsshubScheduleSave = async (runNow: boolean) => {
    try {
      setRsshubLoading(true);
      const resp = await apiFetch(`/scrape/rsshub/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interval_minutes: rsshubTickMinutes === '' ? 0 : Number(rsshubTickMinutes),
          run_now: runNow,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (data?.success) {
        await fetchRsshubScheduleStatus();
      }
    } finally {
      setRsshubLoading(false);
    }
  };

  const handleCreateRsshubSource = async () => {
    try {
      setRsshubLoading(true);
      const resp = await apiFetch(`/scrape/rsshub/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSource.name,
          project_ref: newSource.project_ref,
          base_url: newSource.base_url,
          route_prefix: newSource.route_prefix,
          suffix: newSource.suffix === '' ? null : newSource.suffix,
          enabled: newSource.enabled,
          interval_minutes: newSource.interval_minutes === '' ? null : Number(newSource.interval_minutes),
        }),
      });
      if (!resp.ok) return;
      await fetchRsshubSources();
      setNewSource((prev) => ({
        ...prev,
        name: '',
        project_ref: generateProjectRef(),
        suffix: '',
      }));
    } finally {
      setRsshubLoading(false);
    }
  };

  const handleUpdateRsshubSource = async (source: RsshubSource) => {
    try {
      setRsshubLoading(true);
      const resp = await apiFetch(`/scrape/rsshub/sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: source.name,
          project_ref: source.project_ref,
          base_url: source.base_url,
          route_prefix: source.route_prefix,
          suffix: source.suffix,
          enabled: Boolean(source.enabled),
          interval_minutes: source.interval_minutes,
        }),
      });
      if (!resp.ok) return;
      await fetchRsshubSources();
    } finally {
      setRsshubLoading(false);
    }
  };

  const handleDeleteRsshubSource = async (id: number) => {
    try {
      setRsshubLoading(true);
      const resp = await apiFetch(`/scrape/rsshub/sources/${id}`, { method: 'DELETE' });
      if (!resp.ok) return;
      await fetchRsshubSources();
    } finally {
      setRsshubLoading(false);
    }
  };

  const handleRunRsshubSource = async (id: number) => {
    try {
      setRsshubLoading(true);
      const resp = await apiFetch(`/scrape/rsshub/sources/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_items: 30 }),
      });
      if (!resp.ok) return;
      await fetchRsshubSources();
    } finally {
      setRsshubLoading(false);
    }
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">爬虫管理</h1>
        </div>

        <div className="rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Crawlee / GitHub Releases</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">仓库名称（每行一个）</label>
            <textarea
              value={reposText}
              onChange={(e) => setReposText(e.target.value)}
              rows={8}
              placeholder="owner1/repo1\nowner2/repo2\nhttps://github.com/owner3/repo3"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includePrerelease}
                onChange={(e) => setIncludePrerelease(e.target.checked)}
              />
              包含预发布版本
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">每仓库最多抓取条数</label>
              <input
                type="number"
                value={limitPerRepo}
                onChange={(e) => {
                  const v = e.target.value;
                  setLimitPerRepo(v === '' ? '' : Number(v));
                }}
                placeholder="如 20"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">更新间隔（分钟）</label>
              <input
                type="number"
                value={intervalMinutes}
                onChange={(e) => {
                  const v = e.target.value;
                  setIntervalMinutes(v === '' ? '' : Number(v));
                }}
                placeholder="如 60（为空则不定时）"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => handleRun(false)} disabled={loading}>
              保存计划
            </Button>
            <Button onClick={() => handleRun(true)} disabled={loading} variant="outline">
              立即运行一次
            </Button>
          </div>

          {status && (
            <div className="mt-4 text-sm text-gray-600">
              <p>计划状态：{status.enabled ? '已启用' : '未启用'}</p>
              <p>上次运行：{status.last_run_at || '—'}</p>
              <p>运行中：{status.running ? '是' : '否'}</p>
              {status.last_error && <p className="text-red-600">错误：{status.last_error}</p>}
            </div>
          )}
        </div>

        <div className="rounded-lg shadow p-6 space-y-4 mt-8">
          <h2 className="text-xl font-semibold text-gray-900">RSSHub</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">检查间隔（分钟）</label>
              <input
                type="number"
                value={rsshubTickMinutes}
                onChange={(e) => {
                  const v = e.target.value;
                  setRsshubTickMinutes(v === '' ? '' : Number(v));
                }}
                placeholder="如 1（为空则不定时）"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleRsshubScheduleSave(false)} disabled={rsshubLoading}>
                保存计划
              </Button>
              <Button onClick={() => handleRsshubScheduleSave(true)} disabled={rsshubLoading} variant="outline">
                立即运行一次
              </Button>
            </div>
            {rsshubStatus && (
              <div className="text-sm text-gray-600">
                <p>计划状态：{rsshubStatus.enabled ? '已启用' : '未启用'}</p>
                <p>上次运行：{rsshubStatus.last_run_at || '—'}</p>
                <p>运行中：{rsshubStatus.running ? '是' : '否'}</p>
                {rsshubStatus.last_error && <p className="text-red-600">错误：{rsshubStatus.last_error}</p>}
              </div>
            )}
          </div>

          <div className="rounded-md border border-gray-200 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                <input
                  value={newSource.name}
                  onChange={(e) => setNewSource((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Ref</label>
                <div className="flex gap-2">
                  <input
                    value={newSource.project_ref}
                    onChange={(e) => setNewSource((p) => ({ ...p, project_ref: e.target.value }))}
                    placeholder="自动生成，也可手动填写"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewSource((p) => ({ ...p, project_ref: generateProjectRef() }))}
                  >
                    生成
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  value={newSource.base_url}
                  onChange={(e) => setNewSource((p) => ({ ...p, base_url: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Route Prefix</label>
                <input
                  value={newSource.route_prefix}
                  onChange={(e) => setNewSource((p) => ({ ...p, route_prefix: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
                <textarea
                  value={newSource.suffix}
                  onChange={(e) => setNewSource((p) => ({ ...p, suffix: e.target.value }))}
                  placeholder="每行一个，如 owner/repo"
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">频率（分钟）</label>
                <input
                  type="number"
                  value={newSource.interval_minutes}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewSource((p) => ({ ...p, interval_minutes: v === '' ? '' : Number(v) }));
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newSource.enabled}
                  onChange={(e) => setNewSource((p) => ({ ...p, enabled: e.target.checked }))}
                />
                启用
              </label>
              <Button onClick={handleCreateRsshubSource} disabled={rsshubLoading}>
                新增 RSSHub 源
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project Ref</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Base</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prefix</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Suffix</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">启用</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">频率</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">上次运行</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rsshubSources.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2">
                      <input
                        value={s.name}
                        onChange={(e) =>
                          setRsshubSources((prev) =>
                            prev.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x))
                          )
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={s.project_ref}
                        onChange={(e) =>
                          setRsshubSources((prev) =>
                            prev.map((x) => (x.id === s.id ? { ...x, project_ref: e.target.value } : x))
                          )
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={s.base_url}
                        onChange={(e) =>
                          setRsshubSources((prev) =>
                            prev.map((x) => (x.id === s.id ? { ...x, base_url: e.target.value } : x))
                          )
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={s.route_prefix}
                        onChange={(e) =>
                          setRsshubSources((prev) =>
                            prev.map((x) => (x.id === s.id ? { ...x, route_prefix: e.target.value } : x))
                          )
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <textarea
                        value={s.suffix ?? ''}
                        onChange={(e) =>
                          setRsshubSources((prev) =>
                            prev.map((x) => (x.id === s.id ? { ...x, suffix: e.target.value || null } : x))
                          )
                        }
                        rows={2}
                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(s.enabled)}
                        onChange={(e) =>
                          setRsshubSources((prev) =>
                            prev.map((x) => (x.id === s.id ? { ...x, enabled: e.target.checked ? 1 : 0 } : x))
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={s.interval_minutes ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRsshubSources((prev) =>
                            prev.map((x) =>
                              x.id === s.id ? { ...x, interval_minutes: v === '' ? null : Number(v) } : x
                            )
                          );
                        }}
                        className="w-24 border border-gray-300 rounded-md px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{s.last_run_at || '—'}</td>
                    <td className="px-4 py-2 text-right flex justify-end gap-2">
                      <Button variant="outline" onClick={() => handleRunRsshubSource(s.id)} disabled={rsshubLoading}>
                        运行
                      </Button>
                      <Button onClick={() => handleUpdateRsshubSource(s)} disabled={rsshubLoading}>
                        保存
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteRsshubSource(s.id)}
                        disabled={rsshubLoading}
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
                {rsshubSources.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-500" colSpan={9}>
                      暂无 RSSHub 源
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
