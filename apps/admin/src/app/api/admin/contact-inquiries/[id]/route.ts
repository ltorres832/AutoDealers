export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { updateContactInquiry, type ContactInquiryStatus } from '@autodealers/core';

const VALID: ContactInquiryStatus[] = ['new', 'read', 'replied', 'archived'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = body.status as ContactInquiryStatus | undefined;
    const adminNotes =
      body.adminNotes === undefined
        ? undefined
        : body.adminNotes === null
          ? null
          : String(body.adminNotes);

    if (status && !VALID.includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    await updateContactInquiry(id, { status, adminNotes });

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    if (msg.includes('no encontrado')) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    console.error('admin contact-inquiries PATCH:', e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
