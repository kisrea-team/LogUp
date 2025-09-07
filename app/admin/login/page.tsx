/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-17
 * @FilePath: /LogUp/app/admin/login/page.tsx
 * Helllllloo!
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Card,
    // CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
export default function AdminLoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Simple authentication check (in a real app, this would be done server-side)
        if (username === 'admin' && password === 'admin123') {
            // Set authentication data
            const authData = {
                isLoggedIn: true,
                username: username,
                loginTime: new Date().toISOString(),
                rememberMe: rememberMe
            };

            if (rememberMe) {
                // 如果选择"记住我"，使用localStorage（1天过期）
                localStorage.setItem('adminAuth', JSON.stringify(authData));
                // 同时设置cookie作为备用（1天过期）
                document.cookie = 'adminLoggedIn=true; path=/; max-age=86400'; // 1 day
            } else {
                // 如果不选择"记住我"，使用sessionStorage（3小时过期）
                sessionStorage.setItem('adminAuth', JSON.stringify(authData));
                // 设置cookie（3小时过期）
                document.cookie = 'adminLoggedIn=true; path=/; max-age=10800'; // 3 hours
            }

            router.push('/admin');
        } else {
            setError('用户名或密码错误');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <Card className="w-full max-w-sm">
                        <CardHeader>
                            <CardTitle>登录后台</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* <form> */}
                                <div className="flex flex-col gap-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="username">账号</Label>
                                        <Input
                                            id="username"
                                            type="username"
                                            placeholder="用户名"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <div className="flex items-center">
                                            <Label htmlFor="password">密码</Label>
                                        </div>
                                        <Input
                                            id="password"
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            id="rememberMe"
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <Label htmlFor="rememberMe" className="text-sm text-gray-600">
                                            记住我
                                        </Label>
                                    </div>
                                </div>
                            {/* </form> */}
                        </CardContent>
                        <CardFooter className="flex-col gap-2">
                            <Button type="submit" className="w-full" disabled={loading}>
                                登录
                            </Button>
                        </CardFooter>
                    </Card>

                    {error && <p>{error}</p>}
                </form>

                <div className="text-center text-sm text-gray-500">
                    <p>默认账号: admin</p>
                    <p>默认密码: admin123</p>
                    <p className="mt-2 text-xs">
                        💡 勾选&ldquo;记住我&rdquo;可保持登录1天，不勾选则保持3小时
                    </p>
                </div>
            </div>
        </div>
    );
}
