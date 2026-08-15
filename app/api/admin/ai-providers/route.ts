import { NextRequest, NextResponse } from 'next/server';
import { listProviders, createProvider } from '@/lib/ai-providers';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/admin/ai-providers - 列表（api_key 脱敏）
export async function GET(request: NextRequest) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  try {
    const providers = await listProviders();
    return NextResponse.json({ success: true, data: providers });
  } catch (error) {
    console.error('Error listing ai providers:', error);
    return NextResponse.json({ error: 'Failed to list providers' }, { status: 500 });
  }
}

// POST /api/admin/ai-providers - 新增
export async function POST(request: NextRequest) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const { name, baseUrl, apiKey, model, enabled, priority } = body;
    if (!name || !baseUrl || !apiKey || !model) {
      return NextResponse.json({ error: 'name, baseUrl, apiKey, model are required' }, { status: 400 });
    }
    const provider = await createProvider({ name, baseUrl, apiKey, model, enabled, priority });
    return NextResponse.json({ success: true, data: provider }, { status: 201 });
  } catch (error) {
    console.error('Error creating ai provider:', error);
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
  }
}
