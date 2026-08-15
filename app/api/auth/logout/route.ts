import { NextResponse } from 'next/server';
import { sessionCookieConfig } from '@/lib/auth';

export const runtime = 'nodejs';

// POST /api/auth/logout
export async function POST() {
  const cfg = sessionCookieConfig();
  const response = NextResponse.json({ success: true });
  response.cookies.set(cfg.name, '', {
    httpOnly: cfg.httpOnly,
    sameSite: cfg.sameSite,
    secure: cfg.secure,
    path: cfg.path,
    maxAge: 0,
  });
  return response;
}
