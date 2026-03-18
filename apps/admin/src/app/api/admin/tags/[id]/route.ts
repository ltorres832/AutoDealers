import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { updateTag, deleteTag } from '@autodealers/crm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const { id } = await params;
    await updateTag(tenantId, id, body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: error.message || 'Error updating tag' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const { id } = await params;
    await deleteTag(tenantId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: error.message || 'Error deleting tag' },
      { status: 500 }
    );
  }
}
