/*
 * @Date: 2025-08-31
 * @LastEditors: vhko
 * @LastEditTime: 2025-09-06
 * @FilePath: /LogUp/components/AdminSidebar.tsx
 * Helllllloo!
 */
'use client';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    // SidebarGroup,
    SidebarHeader,
} from '@/components/ui/sidebar';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { clearAdminAuth } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const datamain = [
    { id: 0, label: '首页', href: '/admin' },
    { id: 1, label: '项目管理', href: '/admin/projects' },
    { id: 2, label: '广告', href: '/admin/ads' },
    { id: 3, label: '用户', href: '/admin/users' },
    { id: 4, label: '爬虫管理', href: '/admin/crawler' },
    { id: 5, label: '运营控制', href: '/admin/ops' },
    { id: 6, label: '微任务', href: '/admin/tasks' },
    { id: 7, label: 'AI Provider', href: '/admin/ai' },
    { id: 8, label: '版本提取器', href: '/admin/extractor' },
];

export default function AdminSidebar() {
    const router = useRouter();
    const pathname = usePathname();

    const handleItemClick = (href: string) => {
        router.push(href);
    };

    const handleLogout = async () => {
        await clearAdminAuth();
        router.push('/admin/login');
    };

    return (
        <Sidebar className="p-2">
            <div className="w-64">
                <SidebarHeader className="sidebar-icon p-3">
                    <p className="text-xl font-bold tracking-tight">LogUp</p>
                    <p className="text-xs text-gray-400">管理后台</p>
                </SidebarHeader>
                <SidebarContent className="sidebar-list px-2 space-y-0.5">
                    {datamain.map((item, i) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: i * 0.03 }}
                            >
                                <div
                                    className={`sidebar-list--item cursor-pointer rounded-lg px-3 py-2 transition-all duration-200 ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                    onClick={() => handleItemClick(item.href)}
                                >
                                    <p className="text-sm font-medium">{item.label}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </SidebarContent>
                <SidebarFooter className="p-4">
                    <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                            <p>管理员</p>
                        </div>
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            size="sm"
                            className="w-full"
                        >
                            退出登录
                        </Button>
                    </div>
                </SidebarFooter>
            </div>
        </Sidebar>
    );
}
