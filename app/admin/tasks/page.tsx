'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import AdminCard from '@/components/admin/AdminCard';

interface TaskDef {
  type: string;
  label: string;
  engine: string;
  description: string;
  inputs: Array<{ key: string; label: string; type: string; required?: boolean; placeholder?: string }>;
}

interface Task {
  taskId: string;
  type: string;
  engine: string;
  inputs: Record<string, unknown>;
  status: string;
  progress: number;
  result?: unknown;
  error?: string | null;
  createdAt: string;
  finishedAt?: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-orange-100 text-orange-700',
};

export default function TasksAdminPage() {
  const [defs, setDefs] = useState<TaskDef[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [type, setType] = useState('');
  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const resp = await apiFetch('/ops/task');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setTasks(Array.isArray(data?.data) ? data.data : []);
    } catch (e: any) {
      setError(e?.message || '无法获取任务');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadDefs = async () => {
      try {
        // 从后端拉取任务定义：暂用内置常量（后端也内置，这里直接映射到注册表）
        const known: TaskDef[] = [
          { type: 'get-version', label: '获取版本号 + 建议正则', engine: 'in-app', description: '抓取页面提取最新版本号，并给出可写入的 version_regex 建议', inputs: [
            { key: 'url', label: '页面 URL', type: 'text', required: true, placeholder: 'https://example.com/download' },
            { key: 'version_regex', label: '已知正则（可选）', type: 'text', placeholder: 'Version\\s+(\\d+\\.\\d+)' },
          ]},
          { type: 'probe', label: '探测页面', engine: 'in-app', description: '探测 URL 可访问性、状态码、是否 JS 渲染/反爬', inputs: [{ key: 'url', label: '页面 URL', type: 'text', required: true }] },
          { type: 'verify-url', label: '验证 URL', engine: 'in-app', description: '验证 URL 可达且含版本信息', inputs: [{ key: 'url', label: '页面 URL', type: 'text', required: true }] },
          { type: 'detect-feed', label: '检测 RSS/Atom', engine: 'in-app', description: '扫描页面 RSS/Atom feed', inputs: [{ key: 'url', label: '页面 URL', type: 'text', required: true }] },
          { type: 'github-repo', label: 'GitHub 仓库信息', engine: 'in-app', description: '抓取单个仓库信息', inputs: [{ key: 'repo', label: 'owner/repo', type: 'text', required: true }] },
          { type: 'github-releases', label: 'GitHub Releases', engine: 'in-app', description: '抓取仓库 releases', inputs: [{ key: 'repo', label: 'owner/repo', type: 'text', required: true }, { key: 'limit', label: '条数上限', type: 'number' }] },
          { type: 'github-trending', label: 'GitHub 热门', engine: 'in-app', description: '抓取最近热门仓库', inputs: [{ key: 'language', label: '语言', type: 'text' }, { key: 'per_page', label: '数量', type: 'number' }] },
          { type: 'update-project', label: '更新单项目', engine: 'in-app', description: '更新单个项目到最新版本', inputs: [{ key: 'project', label: '项目名或 ID', type: 'text', required: true }] },
          { type: 'write-regex', label: '生成正则（AI）', engine: 'ai', description: '为反爬页面生成正则（需 GH Actions）', inputs: [{ key: 'url', label: '页面 URL', type: 'text', required: true }] },
          { type: 'inspect-page', label: 'F12 检查页面（AI）', engine: 'ai', description: 'chrome-devtools 检查（需 GH Actions）', inputs: [{ key: 'url', label: '页面 URL', type: 'text', required: true }] },
          { type: 'add-project', label: '收录新项目（AI）', engine: 'ai', description: '完整收录新项目（需 GH Actions）', inputs: [{ key: 'name', label: '项目名', type: 'text', required: true }, { key: 'url', label: '来源 URL', type: 'text' }] },
        ];
        setDefs(known);
      } catch {}
    };
    loadDefs();
    fetchTasks();
    pollRef.current = setInterval(fetchTasks, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchTasks]);

  const currentDef = defs.find((d) => d.type === type);

  const handleDispatch = async () => {
    try {
      setBusy(true);
      setError('');
      // 只记录历史，不派发执行（执行统一走 version-extractor 特定入口：项目"获取最新版本"）
      const resp = await apiFetch('/ops/task', { method: 'POST', body: JSON.stringify({ type, inputs, recordOnly: true }) });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setInputs({});
      await fetchTasks();
    } catch (e: any) {
      setError(e?.message || '派发失败');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (taskId: string) => {
    try {
      await apiFetch(`/ops/task/${taskId}`, { method: 'POST' });
      await fetchTasks();
    } catch (e: any) {
      setError(e?.message || '取消失败');
    }
  };

  const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">微任务控制台</h1>
        <p className="text-sm text-gray-500 mt-1">细粒度运营操作：只记录历史，不派发执行。执行统一走 version-extractor（项目"获取最新版本"）。</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 派发微任务 —— 已废弃：执行统一走 version-extractor（项目"获取最新版本"），本页仅留任务历史 */}
      <AdminCard title="派发微任务（已废弃）" description="任务执行已统一走 version-extractor 站内完成（项目'获取最新版本'）。本页仅保留任务历史记录。">
        <div className="p-6 text-sm text-gray-500">
          <p>手动派发微任务已废弃。</p>
          <p className="mt-1">获取最新版本 / 更新项目请到「项目管理」页使用"获取最新版本"。本页下方为历史记录。</p>
        </div>
      </AdminCard>

      {/* 任务列表 */}
      <AdminCard title="任务历史" description="最近的任务记录，2.5 秒自动刷新">
        {loading ? (
          <p className="p-8 text-center text-gray-500">加载中...</p>
        ) : tasks.length === 0 ? (
          <p className="p-8 text-center text-gray-500">暂无任务</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">任务</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">状态</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">引擎</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">进度</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">创建</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">结果</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {tasks.map((task) => (
                  <tr key={task.taskId}>
                    <td className="px-4 py-2 text-sm text-gray-800">{task.type}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_STYLE[task.status] || 'bg-gray-100'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">{task.engine}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{Math.round(task.progress * 100)}%</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{formatRelativeTime(task.createdAt)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 max-w-[300px] truncate">
                      {task.error || (task.result ? JSON.stringify(task.result).slice(0, 150) : '')}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {(task.status === 'queued' || task.status === 'running') && (
                        <button onClick={() => handleCancel(task.taskId)} className="text-red-500 hover:underline text-xs">取消</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
