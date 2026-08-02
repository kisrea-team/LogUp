'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Card,
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
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const resp = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                setError(data?.error || '登录失败，请检查账号密码');
                return;
            }

            // 成功后会话 cookie 已由服务端签发（HttpOnly），直接进入后台
            router.push('/admin');
        } catch (err) {
            console.error('登录请求失败:', err);
            setError('无法连接到服务器');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <Card className="w-full max-w-sm">
                        <CardHeader>
                            <CardTitle>登录后台</CardTitle>
                            <CardDescription>使用管理员凭据登录</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="username">账号</Label>
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="用户名"
                                        autoComplete="username"
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
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-2">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? '登录中...' : '登录'}
                            </Button>
                        </CardFooter>
                    </Card>

                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                </form>

                <div className="text-center text-sm text-gray-500">
                    <p>管理员账号由环境变量 ADMIN_USERNAME / ADMIN_PASSWORD 配置</p>
                    <p className="mt-1 text-xs">开发环境未配置时默认 admin / admin123</p>
                </div>
            </div>
        </div>
    );
}
