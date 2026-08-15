'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/admin/StatCard';
import AdminCard from '@/components/admin/AdminCard';
import MotionList from '@/components/admin/MotionList';
import { RenderIcon } from '@/components/utils/renderIcon';

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="animate-pulse h-64 rounded-xl bg-gray-100" />
      </div>
    );
  }
  if (error) return <p className="text-red-600 p-8 text-center">{error}</p>;

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="项目总数" value={stats?.projects_count ?? 0} sub="已收录软件与开源项目" delay={0} />
        <StatCard label="版本数量" value={stats?.versions_count ?? 0} sub="全部版本记录" delay={0.05} />
        <StatCard label="AI Provider" value={stats?.ai_providers_count ?? 0} sub="启用的 AI 接口配置" delay={0.1} />
        <StatCard label="最近运营" value={(stats?.recent_ops || []).length} sub="近期运行记录" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近更新项目 */}
        <AdminCard title="最近更新项目" description="按最近更新时间排序" delay={0.1}>
          <MotionList className="divide-y divide-gray-100">
            {(stats?.recent_projects || []).map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                <span className="shrink-0 grid place-items-center">
                  <RenderIcon icon={p.icon} size={28} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(p.latest_update_time)}</p>
                </div>
                <Badge variant="blue">{p.latest_version}</Badge>
              </div>
            ))}
            {(stats?.recent_projects || []).length === 0 && (
              <p className="p-6 text-center text-gray-400 text-sm">暂无项目</p>
            )}
          </MotionList>
        </AdminCard>

        {/* 最近版本 */}
        <AdminCard title="最近版本" description="最新发布的版本记录" delay={0.15}>
          <MotionList className="divide-y divide-gray-100">
            {(stats?.recent_versions || []).map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                <span className="shrink-0 grid place-items-center">
                  <RenderIcon icon={v.project.icon} size={28} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{v.project.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(v.update_time)}</p>
                </div>
                <Badge variant="blue">{v.version}</Badge>
              </div>
            ))}
            {(stats?.recent_versions || []).length === 0 && (
              <p className="p-6 text-center text-gray-400 text-sm">暂无版本</p>
            )}
          </MotionList>
        </AdminCard>
      </div>

      {/* 最近运营 */}
      <AdminCard title="最近运营记录" description="后台与流水线的运行状态" delay={0.2}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">阶段</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">开始</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">错误</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {(stats?.recent_ops || []).map((op) => (
                <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-500">#{op.id}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">{op.phase}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${OPS_BADGE[op.status] || 'bg-gray-100 text-gray-600'}`}>
                      {op.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatRelativeTime(op.startedAt)}</td>
                  <td className="px-6 py-3 text-xs text-red-500 max-w-[240px] truncate">{op.error || ''}</td>
                </tr>
              ))}
              {(stats?.recent_ops || []).length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400 text-sm">暂无运营记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
