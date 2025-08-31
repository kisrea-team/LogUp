/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-31
 * @FilePath: /LogUp/app/admin/page.tsx
 * Helllllloo!
 */
'use client';
import AdminSidebar from '@/components/AdminSidebar';
import { AdminChartArea } from '@/components/Admin-chart';
import Link from 'next/link';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
export default function AdminPage() {
    return (
        <div>
            <SidebarProvider className="flex w-full min-h-svh">
                <AdminSidebar />
                <div className='w-full'>
                    <SidebarTrigger />
                    <AdminChartArea />
                    {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Link
                            href="/admin/projects"
                            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-blue-100 p-3 rounded-md">
                                    <div className="h-6 w-6 text-blue-600">📊</div>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">项目管理</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        添加、编辑、删除项目
                                    </p>
                                </div>
                            </div>
                        </Link>

                        <Link
                            href="/admin/versions"
                            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-green-100 p-3 rounded-md">
                                    <div className="h-6 w-6 text-green-600">🔄</div>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">版本管理</h3>
                                    <p className="mt-1 text-sm text-gray-500">管理项目版本信息</p>
                                </div>
                            </div>
                        </Link>

                        <Link
                            href="/admin/ads"
                            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-purple-100 p-3 rounded-md">
                                    <div className="h-6 w-6 text-purple-600">📢</div>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">广告管理</h3>
                                    <p className="mt-1 text-sm text-gray-500">查看广告性能数据</p>
                                </div>
                            </div>
                        </Link>
                    </div> */}
                </div>
            </SidebarProvider>
        </div>
    );
}
