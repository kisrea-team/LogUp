import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const limit = request.nextUrl.searchParams.get('limit') || '8';
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
        const resp = await fetch(`${base}/everything/changes?limit=${limit}`);
        if (!resp.ok) return NextResponse.json({ success: false, data: [] }, { status: resp.status });
        const data = await resp.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ success: false, data: [] }, { status: 500 });
    }
}
