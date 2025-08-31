/*
 * @Date: 2025-08-31
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-31
 * @FilePath: /LogUp/components/AdminSidebar.tsx
 * Helllllloo!
 */
'use client';
import {
    Sidebar,
    SidebarContent,
    // SidebarFooter,
    // SidebarGroup,
    SidebarHeader,
} from '@/components/ui/sidebar';
import { useRouter, usePathname } from 'next/navigation';

const datamain = [
    { id: 0, label: '首页', href: '/admin' },
    { id: 1, label: '项目管理', href: '/admin/projects' },
    { id: 2, label: '版本管理', href: '/admin/versions' },
    { id: 3, label: '广告', href: '/admin/ads' },
    { id: 4, label: '用户', href: '/admin/users' },
];

export default function AdminSidebar() {
    const router = useRouter();
    const pathname = usePathname();

    const handleItemClick = (href: string) => {
        router.push(href);
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
            </div>
        </Sidebar>
    );
}
