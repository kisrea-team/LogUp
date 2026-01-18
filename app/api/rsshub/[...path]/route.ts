import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRsshubBaseUrl() {
  const fromEnv = process.env.RSSHUB_BASE_URL;
  return String(fromEnv || 'http://127.0.0.1:1200').replace(/\/+$/, '');
}

async function proxy(request: NextRequest, path: string) {
  const rsshubBase = getRsshubBaseUrl();
  const pathname = `/${path}`.replace(/\/{2,}/g, '/');
  const targetUrl = `${rsshubBase}${pathname}${request.nextUrl.search}`;

  const upstream = await fetch(targetUrl, {
    method: request.method,
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
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await props.params;
  try {
    return await proxy(request, (path ?? []).join('/'));
  } catch (error) {
    console.error('Error proxying RSSHub:', error);
    return Response.json({ error: 'Failed to proxy RSSHub' }, { status: 502 });
  }
}

export async function HEAD(
  request: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await props.params;
  try {
    const resp = await proxy(request, (path ?? []).join('/'));
    return new Response(null, { status: resp.status, headers: resp.headers });
  } catch (error) {
    console.error('Error proxying RSSHub:', error);
    return new Response(null, { status: 502 });
  }
}

