export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { deleteQuickListing } from '@autodealers/core';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    await deleteQuickListing(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('admin quick-listings DELETE:', e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
