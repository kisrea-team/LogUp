'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RecentProject {
  id: number;
  icon: string;
  name: string;
  latest_version: string;
  latest_update_time: string;
}
interface RecentVersion {
  id: number;
  version: string;
  update_time: string;
  project: { id: number; name: string; icon: string };
}
interface Stats {
  projects_count: number;
  versions_count: number;
  ai_providers_count: number;
  recent_projects: RecentProject[];
  recent_versions: RecentVersion[];
  recent_ops: Array<{ id: number; phase: string; status: string; startedAt: string; error?: string | null }>;
}

const OPS_BADGE: Record<string, string> = {
  running: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const resp = await apiFetch('/admin/stats');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setStats(data);
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 10000);
    return () => clearInterval(timer);
  }, [fetchStats]);

  if (loading) return <p className="text-gray-500 p-8 text-center">加载中...</p>;
  if (error) return <p className="text-red-600 p-8 text-center">{error}</p>;

  return (
    <div className="px-4 sm:px-6 lg:px-8 space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>项目总数</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{stats?.projects_count ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>版本数量</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{stats?.versions_count ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>AI Provider</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{stats?.ai_providers_count ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>最近运营</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{(stats?.recent_ops || []).length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近更新项目 */}
        <div className="rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">最近更新项目</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {(stats?.recent_projects || []).map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-6 py-3">
                <span className="text-xl shrink-0">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{formatRelativeTime(p.latest_update_time)}</p>
                </div>
                <Badge variant="blue">{p.latest_version}</Badge>
              </div>
            ))}
            {(stats?.recent_projects || []).length === 0 && (
              <p className="p-6 text-center text-gray-400 text-sm">暂无项目</p>
            )}
          </div>
        </div>

        {/* 最近版本更新 */}
        <div className="rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">最近版本</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {(stats?.recent_versions || []).map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-6 py-3">
                <span className="text-xl shrink-0">{v.project.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.project.name}</p>
                  <p className="text-xs text-gray-500">{formatRelativeTime(v.update_time)}</p>
                </div>
                <Badge variant="blue">{v.version}</Badge>
              </div>
            ))}
            {(stats?.recent_versions || []).length === 0 && (
              <p className="p-6 text-center text-gray-400 text-sm">暂无版本</p>
            )}
          </div>
        </div>
      </div>

      {/* 最近运营 */}
      <div className="rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">最近运营记录</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500">ID</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500">阶段</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500">状态</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500">开始</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500">错误</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {(stats?.recent_ops || []).map((op) => (
                <tr key={op.id}>
                  <td className="px-4 py-2 text-sm text-gray-500">#{op.id}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{op.phase}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${OPS_BADGE[op.status] || 'bg-gray-100'}`}>
                      {op.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">{formatRelativeTime(op.startedAt)}</td>
                  <td className="px-4 py-2 text-xs text-red-500 max-w-[240px] truncate">{op.error || ''}</td>
                </tr>
              ))}
              {(stats?.recent_ops || []).length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400 text-sm">暂无运营记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
