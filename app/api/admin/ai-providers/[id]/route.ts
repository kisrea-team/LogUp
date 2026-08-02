import { NextRequest, NextResponse } from 'next/server';
import { updateProvider, deleteProvider } from '@/lib/ai-providers';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

// PUT /api/admin/ai-providers/[id] - 修改（apiKey 留空表示不改）
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  const params = await props.params;
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const updated = await updateProvider(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating ai provider:', error);
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 });
  }
}

// DELETE /api/admin/ai-providers/[id] - 删除
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  const params = await props.params;
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  try {
    const deleted = await deleteProvider(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ai provider:', error);
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 });
  }
}
