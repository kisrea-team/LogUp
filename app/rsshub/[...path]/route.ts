import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRsshubBaseUrl() {
  const fromEnv = process.env.RSSHUB_BASE_URL;
  return String(fromEnv || 'http://127.0.0.1:1200').replace(/\/+$/, '');
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await props.params;
  const rsshubBase = getRsshubBaseUrl();
  const pathname = `/${(path ?? []).join('/')}`.replace(/\/{2,}/g, '/');
  const targetUrl = `${rsshubBase}${pathname}${request.nextUrl.search}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        accept: request.headers.get('accept') || '*/*',
        'user-agent': request.headers.get('user-agent') || 'nextjs-proxy',
      },
      cache: 'no-store',
    });

    const headers = new Headers();
    const passthrough = ['content-type', 'cache-control', 'etag', 'last-modified'];
    for (const name of passthrough) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error('Error proxying RSSHub:', error);
    return Response.json({ error: 'Failed to proxy RSSHub' }, { status: 502 });
  }
}

