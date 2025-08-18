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
}

export default function AdminProjectList({ loading, progress, table, projects, handleDeleteProject }: AdminProjectListProps) {
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
                    <div className="min-w-full divide-y divide-gray-200">
                        <div className="bg-gray-50">
                            <div>
                                {table.map((colums) => (
                                    <p key={colums.key}>{colums.label}</p>
                                ))}
                            </div>
                        </div>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {projects.map((project) => (
                                <div key={project.id} className="hover:bg-gray-50">
                                    <div className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <span className="text-2xl mr-3">{project.icon}</span>
                                            <div className="text-sm font-medium text-gray-900">
                                                {project.name}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                            {project.latest_version}
                                        </span>
                                    </p>
                                    <p className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {project.latest_update_time}
                                    </p>
                                    <p className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {project.versions.length} 个版本
                                    </p>
                                    <p className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button
                                            onClick={() =>
                                                window.open(`/?project=${project.id}`, '_blank')
                                            }
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            查看
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProject(project.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            删除
                                        </button>
                                    </p>
                                </div>
                            ))}
                        </tbody>
                    </div>
                </div>
            )}
        </div>
    );
}
