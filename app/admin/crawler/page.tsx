'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function CrawlerAdminPage() {
  const [reposText, setReposText] = useState('');
  const [includePrerelease, setIncludePrerelease] = useState(false);
  const [limitPerRepo, setLimitPerRepo] = useState<number | ''>('');
  const [intervalMinutes, setIntervalMinutes] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

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
    } catch {}
  };

  useEffect(() => {
    fetchScheduleStatus();
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

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">爬虫管理</h1>
        </div>

        <div className="rounded-lg shadow p-6 space-y-4">
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
      </div>
    </div>
  );
}

