'use client';

import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">管理后台</h1>
          <p className="text-gray-600">欢迎来到管理后台，请选择要管理的功能模块</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                <p className="mt-1 text-sm text-gray-500">添加、编辑、删除项目</p>
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
        </div>
      </div>
    </div>
  );
}