'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface AiProviderView {
  id: number;
  name: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  priority: number;
  apiKeyMasked: string;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProviderForm {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  priority: number;
  enabled: boolean;
}

const EMPTY_FORM: ProviderForm = {
  name: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  priority: 100,
  enabled: true,
};

export default function AiProvidersAdminPage() {
  const [providers, setProviders] = useState<AiProviderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AiProviderView | null>(null);
  const [form, setForm] = useState<ProviderForm>(EMPTY_FORM);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await apiFetch('/admin/ai-providers');
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        throw new Error(d?.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setProviders(Array.isArray(data?.data) ? data.data : []);
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const startEdit = (p: AiProviderView) => {
    setEditing(p);
    setForm({
      name: p.name,
      baseUrl: p.baseUrl,
      apiKey: '',
      model: p.model,
      priority: p.priority,
      enabled: p.enabled,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        const resp = await apiFetch(`/admin/ai-providers/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        if (!resp.ok) {
          const d = await resp.json().catch(() => ({}));
          throw new Error(d?.error || `HTTP ${resp.status}`);
        }
      } else {
        if (!form.apiKey) throw new Error('请填写 API Key');
        const resp = await apiFetch('/admin/ai-providers', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        if (!resp.ok) {
          const d = await resp.json().catch(() => ({}));
          throw new Error(d?.error || `HTTP ${resp.status}`);
        }
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditing(null);
      await fetchProviders();
    } catch (err: any) {
      setError(err?.message || '保存失败');
    }
  };

  const handleToggle = async (p: AiProviderView) => {
    try {
      await apiFetch(`/admin/ai-providers/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !p.enabled }),
      });
      await fetchProviders();
    } catch (e: any) {
      setError(e?.message || '切换失败');
    }
  };

  const handleDelete = async (p: AiProviderView) => {
    if (!confirm(`确定删除 AI Provider「${p.name}」？`)) return;
    try {
      const resp = await apiFetch(`/admin/ai-providers/${p.id}`, { method: 'DELETE' });
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        throw new Error(d?.error || `HTTP ${resp.status}`);
      }
      await fetchProviders();
    } catch (e: any) {
      setError(e?.message || '删除失败');
    }
  };

  const inputCls =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">AI Provider 配置</h1>
        <Button onClick={startCreate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          新增 Provider
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* 新增/编辑表单 */}
      {showForm && (
        <div className="rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">{editing ? '编辑 Provider' : '新增 Provider'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                <input className={inputCls} required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如：硅基流动-HunyuanMT" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型 *</label>
                <input className={inputCls} required value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="如：tencent/Hunyuan-MT-7B" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">接口地址（OpenAI 兼容）*</label>
                <input className={inputCls} required type="url" value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder="https://api.siliconflow.cn/v1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key {editing ? '（留空则不修改）' : '*'}
                </label>
                <input className={inputCls} type="password" value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={editing ? '••••••••' : 'sk-...'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">优先级（数字小优先）</label>
                <input className={inputCls} type="number" value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 100 })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="enabled" type="checkbox" checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              <label htmlFor="enabled" className="text-sm text-gray-700">启用</label>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                保存
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
                取消
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 列表 */}
      {loading ? (
        <p className="text-gray-500 py-8 text-center">加载中...</p>
      ) : providers.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">
          尚未配置 AI Provider。未配置时 /api/translate 回退到 NVIDIA_API_KEY 环境变量。
        </p>
      ) : (
        <div className="rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">模型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">接口地址</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">API Key</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">优先级</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {providers.map((p) => (
                <tr key={p.id} className={p.enabled ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.model}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[220px] truncate">{p.baseUrl}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.hasApiKey ? p.apiKeyMasked : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.priority}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(p)}
                      className={`px-2 py-1 text-xs rounded-full ${
                        p.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {p.enabled ? '启用' : '停用'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => startEdit(p)} className="text-sm text-blue-600 hover:underline">编辑</button>
                    <button onClick={() => handleDelete(p)} className="text-sm text-red-500 hover:underline">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
