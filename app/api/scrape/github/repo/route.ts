function getBackendBaseUrl() {
  const fromEnv = process.env.BACKEND_NODE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const port = process.env.BACKEND_NODE_PORT || '8000';
  return `http://127.0.0.1:${port}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const backendUrl = `${getBackendBaseUrl()}/scrape/github/repo`;

    const resp = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { 'Content-Type': resp.headers.get('content-type') || 'application/json; charset=utf-8' },
    });
  } catch (error) {
    console.error('API error:', error);
    return Response.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

