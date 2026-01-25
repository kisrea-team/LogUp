/*
 * @Date: 2025-08-18
 * @LastEditors: vhko
 * @LastEditTime: 2026-01-24
 * @FilePath: /LogUp/components/AdminProjectList.tsx
 * Helllllloo!
 */
// import Loading from '@/components/Loading';
import { Button } from './ui/button';
import { RenderIcon } from '@/components/utils/renderIcon';
import { Project } from '@/types/index';
import { formatRelativeTime } from '@/lib/utils';
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
}

export default function AdminProjectList({
    loading,
    progress,
    table,
    projects = [],
    handleDeleteProject,
    handleEditProject,
}: AdminProjectListProps) {
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
                                            {project.versions?.length ?? 0} 个版本
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm font-medium space-x-2">
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
        </div>
    );
}
