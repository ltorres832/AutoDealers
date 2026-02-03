import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { suspendCorporateEmail } from '@autodealers/crm';
import { initializeFirebase } from '@autodealers/core';

initializeFirebase();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { emailId } = await params;
    await suspendCorporateEmail(emailId, auth.tenantId || '');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error suspending corporate email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


