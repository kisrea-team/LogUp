'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminCard from '@/components/admin/AdminCard';

interface ExtractResult {
  version?: string | null;
  confidence?: string;
  source?: string;
  needsAiCheck?: boolean;
  matchedContext?: string | null;
}

export default function ExtractorAdminPage() {
  const [url, setUrl] = useState('');
  const [configured, setConfigured] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [probe, setProbe] = useState('');
  const [productName, setProductName] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const [auditUrl, setAuditUrl] = useState('');
  const [audit, setAudit] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const resp = await apiFetch('/admin/extractor');
      const data = await resp.json();
      setUrl(data?.url || '');
      setConfigured(Boolean(data?.configured));
      setHealth(data?.health ?? null);
    } catch (e: any) {
      setError(e?.message || '加载配置失败');
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const resp = await apiFetch('/admin/extractor', { method: 'PUT', body: JSON.stringify({ url }) });
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        throw new Error(d?.error || `HTTP ${resp.status}`);
      }
      setConfigured(Boolean(url));
      await loadConfig();
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setError('');
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await apiFetch('/admin/extractor', {
        method: 'POST',
        body: JSON.stringify({ probe: probe.trim(), productName: productName.trim() }),
      });
      const data = await resp.json();
      setTestResult(data);
    } catch (e: any) {
      setError(e?.message || '测试失败');
    } finally {
      setTesting(false);
    }
  };

  const loadAudit = async (kind: 'recent' | 'url') => {
    setAuditLoading(true);
    try {
      const qs = kind === 'url' && auditUrl ? `url=${encodeURIComponent(auditUrl)}` : `limit=20`;
      const resp = await apiFetch(`/admin/extractor/audit?${qs}`);
      const data = await resp.json();
      setAudit(data);
    } catch (e: any) {
      setAudit(e?.message ? { error: e.message } : null);
    } finally {
      setAuditLoading(false);
    }
  };

  // 挂载即加载最近审计，避免空区让人以为坏了
  useEffect(() => {
    loadAudit('recent');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showVersion = (v: any): string => v?.version || '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">版本提取器</h1>
        <p className="text-sm text-gray-500">配置 version-extractor 服务地址，版本任务（get-version / update-project / write-regex）优先走它。</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* 地址配置 */}
      <AdminCard title="服务地址">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:3000 或 https://…" className="flex-1" />
            <Button onClick={handleSave} disabled={saving || !url}>{saving ? '保存中…' : '保存'}</Button>
          </div>
          <div className="text-sm">
            状态：{configured ? <span className="text-green-600">已配置</span> : <span className="text-gray-400">未配置（走本地提取）</span>}
            {health && (
              <span className="ml-3">
                {health?.ok ? <span className="text-green-600">· 连接正常 ✓</span> : <span className="text-red-500">· 连接异常：{health?.error || JSON.stringify(health)}</span>}
              </span>
            )}
          </div>
        </div>
      </AdminCard>

      {/* 测试连接 */}
      <AdminCard title="测试提取">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={probe} onChange={(e) => setProbe(e.target.value)} placeholder="测一个 URL，如 https://windsurf.com/editor/releases" className="flex-1" />
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="产品名（可选，触发 LLM 兜底）" className="w-56" />
            <Button onClick={handleTest} disabled={testing || !probe}>{testing ? '测试中…' : '测试'}</Button>
          </div>
          {testResult && (
            <div className="space-y-3">
              {/* 连接 */}
              <div className="text-sm">
                连接：{testResult.health?.ok ? <span className="text-green-600">正常 ✓</span> : <span className="text-red-500">异常：{testResult.health?.error || JSON.stringify(testResult.health)}</span>}
              </div>
              {/* 版本结果 */}
              {testResult.extract?.version && (
                <div className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold">{testResult.extract.version.version}</span>
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">{testResult.extract.version.confidence}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{testResult.extract.version.source}</span>
                    {testResult.extract.version.needsAiCheck && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">需 AI 复核</span>}
                  </div>
                  {testResult.extract.version.matchedContext && (
                    <p className="mt-2 text-xs text-gray-500">
                      <span className="text-gray-400">上下文：</span>
                      <span className="bg-gray-50 px-1 py-0.5 rounded">{testResult.extract.version.matchedContext}</span>
                    </p>
                  )}
                </div>
              )}
              {testResult.extract?.error && <p className="text-sm text-red-500">提取失败：{testResult.extract.error}</p>}
              {/* 更新日志 */}
              {testResult.extract?.changelog?.content ? (
                <div className="rounded-md border p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <span className="font-semibold">更新日志</span>
                    {testResult.extract.changelog.version && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{testResult.extract.changelog.version}</span>}
                    {testResult.extract.changelog.date && <span className="text-xs text-gray-400">{testResult.extract.changelog.date}</span>}
                    {testResult.extract.changelog.source && <span className="text-xs text-gray-400">({testResult.extract.changelog.source})</span>}
                  </div>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs leading-relaxed text-gray-800">{testResult.extract.changelog.content}</pre>
                </div>
              ) : testResult.extract?.changelog ? (
                <p className="text-sm text-gray-400">未提取到更新日志内容</p>
              ) : null}
              {/* 审计概览 */}
              {testResult.audit?.count != null && (
                <p className="text-xs text-gray-400">审计库共 {testResult.audit.count} 条提取记录</p>
              )}
            </div>
          )}
        </div>
      </AdminCard>

      {/* 审计 */}
      <AdminCard title="提取审计（决策链：页面/候选/rank/LLM/最终）">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={auditUrl} onChange={(e) => setAuditUrl(e.target.value)} placeholder="按 URL 查决策链（可留空查最近）" className="flex-1" />
            <Button onClick={() => loadAudit(auditUrl ? 'url' : 'recent')} disabled={auditLoading}>查询</Button>
            <Button variant="outline" onClick={() => { setAuditUrl(''); loadAudit('recent'); }} disabled={auditLoading}>最近 20 条</Button>
          </div>
          {auditLoading && <p className="text-sm text-gray-400">加载中…</p>}
          {audit?.error && <p className="text-sm text-red-500">{audit.error}</p>}
          {audit?.found === false && <p className="text-sm text-gray-400">该 URL 无审计记录（还没提取过）。</p>}
          {audit?.extraction && (
            <div className="space-y-2 text-sm">
              <div>最终版本 <b>{audit.extraction.finalVersion}</b>（{audit.extraction.finalConfidence}）· rank seed {audit.extraction.rankSeed}（margin {Number(audit.extraction.rankMargin).toFixed(4)}）· LLM {audit.extraction.llmTriggered ? `已触发 → ${audit.extraction.llmAnswer}` : '未触发'}</div>
              <div>候选 {audit.candidates?.length || 0} 个：</div>
              <pre className="max-h-48 overflow-auto rounded bg-gray-100 p-2 text-xs">{(audit.candidates || []).slice(0, 15).map((c: any) => `${c.version}  prob=${Number(c.prob).toFixed(3)}${c.isSeed ? ' [seed]' : ''}`).join('\n')}</pre>
            </div>
          )}
          {Array.isArray(audit?.rows) && (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-1 pr-2">URL</th><th className="pr-2">最终版本</th><th className="pr-2">置信</th><th className="pr-2">LLM</th>
                  </tr>
                </thead>
                <tbody>
                  {(audit.rows as any[]).map((r: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="py-1 pr-2 max-w-[280px] truncate">{r.url}</td>
                      <td className="pr-2">{r.finalVersion}</td>
                      <td className="pr-2">{r.finalConfidence}</td>
                      <td className="pr-2">{r.llmTriggered ? (r.llmAnswer || '—') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminCard>
    </div>
  );
}
