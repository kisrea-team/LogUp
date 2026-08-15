// 管理后台鉴权工具
//
// 两种认证方式：
// 1. Session Cookie：admin 登录后由 /api/auth/login 签发 HMAC 签名的 HttpOnly cookie
// 2. API Key：运营脚本 / 流水线通过 `x-admin-key` 请求头访问写接口（env ADMIN_API_KEY）
import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'logup_admin_session';

const SESSION_MAX_AGE = 3 * 60 * 60; // 3 小时

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') return 'logup-dev-session-secret';
  throw new Error('ADMIN_SESSION_SECRET is not set in production');
}

function hmacSign(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('hex');
}

// 生成签名 cookie 值：`${payload}.${signature}`
export function signSessionCookie(payload: string): string {
  return `${payload}.${hmacSign(payload)}`;
}

export function verifySessionCookie(value: string | null | undefined): boolean {
  if (!value) return false;
  // Next.js 设置 cookie 时会对值做 URL 编码(如 ':' → %3A),验签前先解码
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  const dot = decoded.lastIndexOf('.');
  if (dot <= 0 || dot >= decoded.length - 1) return false;
  const payload = decoded.slice(0, dot);
  const sig = decoded.slice(dot + 1);
  const expected = hmacSign(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function sessionCookieConfig() {
  return {
    name: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

function getAdminApiKey(): string {
  return process.env.ADMIN_API_KEY || '';
}

// 校验写接口请求：session cookie 或 x-admin-key 任一通过即可
export async function verifyAdminRequest(request: Request): Promise<boolean> {
  if (getAdminApiKey()) {
    const key = request.headers.get('x-admin-key');
    if (key && key === getAdminApiKey()) return true;
  }
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  return verifySessionCookie(match ? match[1] : null);
}

// 校验 admin 后台页面访问（proxy 使用）：仅 session cookie
export function isAdminPageAuthenticated(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  return verifySessionCookie(match ? match[1] : null);
}

// 写接口守卫：session cookie 或 x-admin-key 任一通过；未通过返回 401 响应
export async function unauthorizedIfNotAdmin(request: Request): Promise<NextResponse | null> {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
