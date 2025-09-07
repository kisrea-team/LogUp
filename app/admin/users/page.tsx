/*
 * @Date: 2025-08-31
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-31
 * @FilePath: /LogUp/app/admin/users/page.tsx
 * 用户管理页面
 */
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function UsersPage() {
    // 模拟用户数据
    const users = [
        { id: 1, name: '张三', email: 'zhangsan@example.com', role: '管理员', status: '活跃' },
        { id: 2, name: '李四', email: 'lisi@example.com', role: '用户', status: '活跃' },
        { id: 3, name: '王五', email: 'wangwu@example.com', role: '用户', status: '禁用' },
    ];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">用户管理</h1>
                <Button>添加用户</Button>
            </div>

            {/* 搜索和筛选 */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Label htmlFor="search">搜索用户</Label>
                            <Input id="search" placeholder="输入用户名或邮箱..." />
                        </div>
                        <div className="flex-1">
                            <Label htmlFor="role">角色筛选</Label>
                            <select id="role" className="w-full p-2 border rounded-md">
                                <option value="">所有角色</option>
                                <option value="admin">管理员</option>
                                <option value="user">用户</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <Label htmlFor="status">状态筛选</Label>
                            <select id="status" className="w-full p-2 border rounded-md">
                                <option value="">所有状态</option>
                                <option value="active">活跃</option>
                                <option value="inactive">禁用</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 用户列表 */}
            <Card>
                <CardHeader>
                    <CardTitle>用户列表</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border">
                                    <th className="text-left p-2">ID</th>
                                    <th className="text-left p-2">姓名</th>
                                    <th className="text-left p-2">邮箱</th>
                                    <th className="text-left p-2">角色</th>
                                    <th className="text-left p-2">状态</th>
                                    <th className="text-left p-2">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border hover:bg-gray-50">
                                        <td className="p-2">{user.id}</td>
                                        <td className="p-2">{user.name}</td>
                                        <td className="p-2">{user.email}</td>
                                        <td className="p-2">
                                            <Badge variant={user.role === '管理员' ? 'default' : 'secondary'}>
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="p-2">
                                            <Badge variant={user.status === '活跃' ? 'default' : 'destructive'}>
                                                {user.status}
                                            </Badge>
                                        </td>
                                        <td className="p-2">
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline">编辑</Button>
                                                <Button size="sm" variant="destructive">删除</Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
