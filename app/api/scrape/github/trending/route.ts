function getBackendBaseUrl() {
    const fromEnv = process.env.BACKEND_NODE_URL;
    if (fromEnv) return fromEnv.replace(/\/+$/, '');
    const port = process.env.BACKEND_NODE_PORT || '8000';
    return `http://127.0.0.1:${port}`;
}

// GET /api/scrape/github/trending — schedule status
export async function GET() {
    try {
        const resp = await fetch(`${getBackendBaseUrl()}/scrape/github/trending`, { method: 'GET' });
        const text = await resp.text();
        return new Response(text, {
            status: resp.status,
            headers: { 'Content-Type': resp.headers.get('content-type') || 'application/json; charset=utf-8' },
        });
    } catch (error) {
        console.error('[trending] GET error:', error);
        return Response.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/scrape/github/trending — trigger run or update schedule
// Body (all optional):
//   run_now: boolean          — run immediately (default true)
//   set_schedule: boolean     — update schedule config
//   interval_minutes: number  — schedule interval
//   language: string          — filter by language (e.g. "TypeScript")
//   since: "daily"|"weekly"|"monthly"
//   per_page: number          — how many trending repos to fetch (max 30)
//   limit_per_repo: number    — max releases per repo
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const resp = await fetch(`${getBackendBaseUrl()}/scrape/github/trending`, {
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
        console.error('[trending] POST error:', error);
        return Response.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
