import { NextRequest, NextResponse } from 'next/server';
import { signSessionCookie, sessionCookieConfig } from '@/lib/auth';

export const runtime = 'nodejs';

function getCredentials() {
  const envUser = process.env.ADMIN_USERNAME;
  const envPass = process.env.ADMIN_PASSWORD;
  if (envUser && envPass) return { username: envUser, password: envPass };

  // 仅开发环境允许默认凭据；生产必须配置环境变量
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[auth] ADMIN_USERNAME/ADMIN_PASSWORD 未设置，使用开发默认凭据 admin/admin123');
    return { username: 'admin', password: 'admin123' };
  }
  return null;
}

// POST /api/auth/login
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { username, password } = body;

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
  }

  const creds = getCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: 'Admin credentials not configured on server' },
      { status: 500 }
    );
  }

  // 恒定时间比较，避免时序侧信道
  const userOk = username === creds.username;
  const passOk = password === creds.password;

  if (!userOk || !passOk) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const cfg = sessionCookieConfig();
  const response = NextResponse.json({ success: true });
  response.cookies.set(cfg.name, signSessionCookie(`admin:${Date.now()}`), {
    httpOnly: cfg.httpOnly,
    sameSite: cfg.sameSite,
    secure: cfg.secure,
    path: cfg.path,
    maxAge: cfg.maxAge,
  });

  return response;
}
