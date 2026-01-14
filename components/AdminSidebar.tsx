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
import { clearAdminAuth } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const datamain = [
    { id: 0, label: '首页', href: '/admin' },
    { id: 1, label: '项目管理', href: '/admin/projects' },
    { id: 2, label: '版本管理', href: '/admin/versions' },
    { id: 5, label: '爬虫管理', href: '/admin/crawler' },
    { id: 3, label: '广告', href: '/admin/ads' },
    { id: 4, label: '用户', href: '/admin/users' },
];

export default function AdminSidebar() {
    const router = useRouter();
    const pathname = usePathname();

    const handleItemClick = (href: string) => {
        router.push(href);
    };

    const handleLogout = () => {
        clearAdminAuth();
        router.push('/admin/login');
    };

    return (
        <Sidebar className="p-1.5">
            <div className="w-64">
                <SidebarHeader className="sidebar-icon p-2">
                    <p className="text-xl">LogUp</p>
                </SidebarHeader>
                <SidebarContent className="sidebar-list">
                    {datamain.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <div
                                key={item.id}
                                className={`sidebar-list--item cursor-pointer transition-all duration-200 ${
                                    isActive
                                        ? 'bg-blue-100 text-blue-700 font-medium'
                                        : 'hover:bg-gray-100'
                                }`}
                                onClick={() => handleItemClick(item.href)}
                            >
                                <p>{item.label}</p>
                            </div>
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
