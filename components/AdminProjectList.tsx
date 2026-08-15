/*
 * @Date: 2025-08-18
 * @LastEditors: vhko
 * @LastEditTime: 2026-01-24
 * @FilePath: /LogUp/components/AdminProjectList.tsx
 * Helllllloo!
 */
// import Loading from '@/components/Loading';
'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { RenderIcon } from '@/components/utils/renderIcon';
import { Project } from '@/types/index';
import { formatRelativeTime } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { motion } from 'framer-motion';

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
const MotionTableRow = motion(TableRow);
interface TableColumn {
    key: string;
    label: string;
}

interface AdminProjectListProps {
    loading: boolean;
    progress: number;
    table: TableColumn[];
    projects: Project[];
    handleDeleteProject: (id: number) => void;
    handleEditProject?: (project: Project) => void;
    onVersionUpdated?: () => void;
}

export default function AdminProjectList({
    loading,
    progress,
    table,
    projects = [],
    handleDeleteProject,
    handleEditProject,
    onVersionUpdated,
}: AdminProjectListProps) {
    // 每行"获取最新版本"状态：loading + 结果弹窗
    const [fetchState, setFetchState] = useState<Record<number, { loading: boolean }>>({});
    const [resultModal, setResultModal] = useState<{
        project: Project;
        message: string;
        extracted: string | null; // 提取到的版本（交叉校验失败时才有，供人工审核）
    } | null>(null);

    // 版本管理弹窗（合并原"版本管理"页）：项目 → 版本列表 + 添加
    const [versionsModal, setVersionsModal] = useState<{ project: Project; versions: any[]; loading: boolean } | null>(null);
    const [versionForm, setVersionForm] = useState<{ version: string; update_time: string; content: string; download_url: string }>({
        version: '',
        update_time: new Date().toISOString().split('T')[0],
        content: '',
        download_url: '',
    });

    const openVersions = async (project: Project) => {
        setVersionsModal({ project, versions: [], loading: true });
        try {
            const resp = await apiFetch(`/projects/${project.id}`);
            const data = await resp.json();
            setVersionsModal({ project, versions: data?.versions || data?.data?.versions || [], loading: false });
        } catch {
            setVersionsModal({ project, versions: [], loading: false });
        }
    };

    const addVersion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!versionsModal || !versionForm.version) return;
        try {
            await apiFetch('/versions', {
                method: 'POST',
                body: JSON.stringify({ project_id: versionsModal.project.id, ...versionForm }),
            });
            setVersionForm({ version: '', update_time: new Date().toISOString().split('T')[0], content: '', download_url: '' });
            await openVersions(versionsModal.project);
            if (onVersionUpdated) onVersionUpdated();
        } catch (err: unknown) {
            alert(`添加失败: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    const deleteVersion = async (id: number) => {
        if (!versionsModal || !confirm('删除该版本？')) return;
        try {
            await apiFetch(`/versions/${id}`, { method: 'DELETE' });
            await openVersions(versionsModal.project);
            if (onVersionUpdated) onVersionUpdated();
        } catch (err: unknown) {
            alert(`删除失败: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    // 派发 in-app update-project 任务（内部走 version-extractor API，带 productName）→ SSE 轮询结果
    const handleFetchVersion = async (project: Project) => {
        setFetchState((prev) => ({ ...prev, [project.id]: { loading: true } }));
        try {
            const resp = await apiFetch('/ops/task', {
                method: 'POST',
                body: JSON.stringify({ type: 'update-project', inputs: { project: project.name } }),
            });
            if (!resp.ok) {
                const d = await resp.json().catch(() => ({}));
                throw new Error(d?.error || `HTTP ${resp.status}`);
            }
            const { taskId } = await resp.json();
            // SSE 轮询任务状态，直到 success/failed
            const sse = await apiFetch(`/ops/task/${taskId}`, {
                headers: { Accept: 'text/event-stream' },
            });
            const text = await sse.text();
            const events = text.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
            let message = '任务超时';
            let extracted: string | null = null;
            for (const ev of events) {
                if (ev === '[DONE]') continue;
                try {
                    const data = JSON.parse(ev);
                    const task = data?.data;
                    if (task?.status === 'success') {
                        const r = task?.result || {};
                        message = `最新版本: ${r.new_version || r.version || '—'}${r.confidence ? ` (${r.confidence})` : ''}`;
                        break;
                    }
                    if (task?.status === 'failed') {
                        const r = task?.result || {};
                        extracted = r?.extracted || null;
                        message = `失败: ${task?.error || task?.log || 'unknown'}`;
                        break;
                    }
                } catch { /* 忽略解析失败的事件 */ }
            }
            setFetchState((prev) => ({ ...prev, [project.id]: { loading: false } }));
            setResultModal({ project, message, extracted });
            if (message.startsWith('最新版本') && onVersionUpdated) onVersionUpdated();
        } catch (e: unknown) {
            setFetchState((prev) => ({ ...prev, [project.id]: { loading: false } }));
            setResultModal({ project, message: `失败: ${e instanceof Error ? e.message : String(e)}`, extracted: null });
        }
    };

    // 人工审核：批准 → 记录并重新提取（命中 review 直接采用）；拒绝 → 记录为负样本
    const handleReview = async (decision: 'approve' | 'reject') => {
        const m = resultModal;
        if (!m || !m.extracted) return;
        const sourceUrl = m.project.update_source_url || '';
        try {
            await apiFetch('/admin/version-review', {
                method: 'POST',
                body: JSON.stringify({ url: sourceUrl, version: m.extracted, decision, projectId: m.project.id, context: m.message }),
            });
            if (decision === 'approve') {
                setResultModal(null);
                await handleFetchVersion(m.project); // 重新提取：review 命中 → 跳过交叉校验直接采用
            } else {
                setResultModal({ ...m, message: `已记录拒绝 ${m.extracted}（将作为负样本）` });
            }
        } catch (e: unknown) {
            setResultModal({ ...m, message: `审核失败: ${e instanceof Error ? e.message : String(e)}` });
        }
    };

    return (
        <div className=" rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">项目列表</h2>
            </div>

            {loading ? (
                <div className="p-8 text-center">
                    {/* <Loading progress={progress} /> */}
                    <p className="text-gray-600 mt-4">加载中...</p>
                </div>
            ) : (
                <div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {table.map((column) => (
                                    <TableHead key={column.key} className=" items-center">
                                        {column.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody className=" divide-y divide-gray-200">
                            {(projects || []).length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={table.length + 1}
                                        className="px-6 py-8 text-center"
                                    >
                                        <p className="text-gray-500">暂无项目数据</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                (projects || []).map((project) => (
                                    <MotionTableRow
                                        key={project.id}
                                        className="hover:bg-gray-100"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.95 }}
                                        onHoverStart={() => console.log('hover started!')}
                                    >
                                        <TableCell className="whitespace-normal">
                                            <div className="flex items-center w-50">
                                                <span className="text-2xl mr-3">
                                                    <RenderIcon icon={project.icon} />
                                                </span>
                                                <div className="text-sm whitespace-normal truncate">{project.name}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                {project.latest_version}
                                            </span>
                                        </TableCell>
                                        <TableCell className="">
                                            {formatRelativeTime(project.latest_update_time)}
                                        </TableCell>
                                        <TableCell className="">
                                            {project.author || '未知'}
                                        </TableCell>
                                        <TableCell className="">
                                            {project.type || '未分类'}
                                        </TableCell>
                                        <TableCell className="">
                                            {project.tags && project.tags.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {project.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600"
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="">
                                            {project.versionCount ?? project.versions?.length ?? 0} 个版本
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm font-medium space-x-2">
                                            {project.update_source_url && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleFetchVersion(project)}
                                                    disabled={fetchState[project.id]?.loading}
                                                    className="text-purple-600 hover:text-purple-900"
                                                >
                                                    {fetchState[project.id]?.loading ? '获取中…' : '获取最新版本'}
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                onClick={() => openVersions(project)}
                                                className="text-cyan-600 hover:text-cyan-900"
                                            >
                                                版本
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() =>
                                                    window.open(`/?project=${project.id}`, '_blank')
                                                }
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                查看
                                            </Button>
                                            {handleEditProject && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleEditProject(project)}
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    编辑
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleDeleteProject(project.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                删除
                                            </Button>
                                        </TableCell>
                                    </MotionTableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* 获取最新版本结果弹窗 */}
            {resultModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setResultModal(null)}
                >
                    <div
                        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="mb-3 text-lg font-semibold text-gray-900">
                            {resultModal.project.name} — 获取结果
                        </h3>
                        {resultModal.project.update_source_url && (
                            <p className="mb-2 text-xs text-gray-500 break-all">
                                来源：<a href={resultModal.project.update_source_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{resultModal.project.update_source_url}</a>
                            </p>
                        )}
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
                            {resultModal.message}
                        </pre>
                        {resultModal.extracted && (
                            <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm">
                                <p className="text-amber-800">提取到 <b>{resultModal.extracted}</b>，但与库值交叉校验异常，需人工确认。</p>
                                <p className="mt-1 text-xs text-amber-600">批准 → 下次直接采用该版本；拒绝 → 记录为负样本（供重训）。</p>
                                <div className="mt-2 flex gap-2">
                                    <Button variant="outline" onClick={() => handleReview('approve')} className="text-green-700 hover:text-green-900">批准</Button>
                                    <Button variant="outline" onClick={() => handleReview('reject')} className="text-red-600 hover:text-red-900">拒绝</Button>
                                </div>
                            </div>
                        )}
                        <div className="mt-4 flex justify-end">
                            <Button variant="outline" onClick={() => setResultModal(null)}>
                                关闭
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 版本管理弹窗 */}
            {versionsModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setVersionsModal(null)}
                >
                    <div
                        className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="mb-3 text-lg font-semibold text-gray-900">
                            {versionsModal.project.name} — 版本管理（{versionsModal.versions.length}）
                        </h3>

                        {/* 版本列表 */}
                        {versionsModal.loading ? (
                            <p className="text-sm text-gray-400">加载中…</p>
                        ) : versionsModal.versions.length === 0 ? (
                            <p className="text-sm text-gray-400">暂无版本记录</p>
                        ) : (
                            <div className="max-h-56 overflow-auto divide-y divide-gray-100">
                                {versionsModal.versions.map((v) => (
                                    <div key={v.id} className="flex items-center gap-3 py-2 text-sm">
                                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">{v.version}</span>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(v.update_time).toLocaleDateString()}</span>
                                        <span className="flex-1 truncate text-gray-600">{v.content || ''}</span>
                                        <button onClick={() => deleteVersion(v.id)} className="text-xs text-red-500 hover:text-red-700">删除</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 添加版本 */}
                        <form onSubmit={addVersion} className="mt-4 space-y-2 border-t pt-3">
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                                    placeholder="版本号（如 v3.2.0）"
                                    value={versionForm.version}
                                    onChange={(e) => setVersionForm({ ...versionForm, version: e.target.value })}
                                    required
                                />
                                <input
                                    type="date"
                                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                                    value={versionForm.update_time}
                                    onChange={(e) => setVersionForm({ ...versionForm, update_time: e.target.value })}
                                />
                            </div>
                            <input
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="下载链接"
                                value={versionForm.download_url}
                                onChange={(e) => setVersionForm({ ...versionForm, download_url: e.target.value })}
                            />
                            <textarea
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="版本内容 / 更新日志"
                                rows={3}
                                value={versionForm.content}
                                onChange={(e) => setVersionForm({ ...versionForm, content: e.target.value })}
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="submit" disabled={!versionForm.version}>添加版本</Button>
                                <Button type="button" variant="outline" onClick={() => setVersionsModal(null)}>关闭</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
