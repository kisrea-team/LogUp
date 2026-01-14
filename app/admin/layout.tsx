/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-09-07
 * @FilePath: /LogUp/app/admin/layout.tsx
 * Helllllloo!
 */
'use client';

import AdminSidebar from '@/components/AdminSidebar';
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
    SidebarHeader,
} from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/ui/site-header';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';

    // 如果是登录页面，不显示侧边栏
    if (isLoginPage) {
        return <div className="min-h-screen">{children}</div>;
    }

    // 其他admin页面显示侧边栏
    return (
        <div className="min-h-screen">
            <SidebarProvider className="flex w-full min-h-svh">
                <AdminSidebar />
                <SidebarInset>
                    <div className="w-full">
                        {/* <SidebarHeader/> */}
                        <SiteHeader />
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}
