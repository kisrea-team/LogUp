/*
 * @Date: 2025-08-18
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-18
 * @FilePath: /LogUp/components/AdminProjectList.tsx
 * Helllllloo!
 */
// import Loading from '@/components/Loading';

interface Project {
    id: number;
    icon: string;
    name: string;
    latest_version: string;
    latest_update_time: string;
    describe?: string;
    summar?: string;
    author?: string;
    type?: string;
    versions: any[];
}

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

export default function AdminProjectList({ loading, progress, table, projects, handleDeleteProject, handleEditProject }: AdminProjectListProps) {
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">项目列表</h2>
            </div>

            {loading ? (
                <div className="p-8 text-center">
                    {/* <Loading progress={progress} /> */}
                    <p className="text-gray-600 mt-4">加载中...</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {table.map((column) => (
                                    <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {projects.map((project) => (
                                <tr key={project.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <span className="text-2xl mr-3">{project.icon}</span>
                                            <div className="text-sm font-medium text-gray-900">
                                                {project.name}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                            {project.latest_version}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {project.latest_update_time}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {project.author || '未知'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {project.type || '未分类'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {project.summar || '暂无简介'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {project.versions.length} 个版本
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button
                                            onClick={() =>
                                                window.open(`/?project=${project.id}`, '_blank')
                                            }
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            查看
                                        </button>
                                        {handleEditProject && (
                                            <button
                                                onClick={() => handleEditProject(project)}
                                                className="text-green-600 hover:text-green-900"
                                            >
                                                编辑
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteProject(project.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            删除
                                        </button>
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
