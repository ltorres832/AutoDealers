import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { deleteCorporateEmail } from '@autodealers/crm';
import { initializeFirebase } from '@autodealers/core';

initializeFirebase();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { emailId } = await params;
    await deleteCorporateEmail(emailId, auth.tenantId || '');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting corporate email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


