export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { listContactInquiries, type ContactInquiryStatus } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status') as ContactInquiryStatus | 'all' | null;
    const items = await listContactInquiries({
      status: status && status !== 'all' ? status : 'all',
      limit: 200,
    });

    return NextResponse.json({
      items: items.map((it) => ({
        ...it,
        createdAt: it.createdAt?.toISOString() ?? null,
        updatedAt: it.updatedAt?.toISOString() ?? null,
      })),
      total: items.length,
    });
  } catch (e) {
    console.error('admin contact-inquiries GET:', e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
