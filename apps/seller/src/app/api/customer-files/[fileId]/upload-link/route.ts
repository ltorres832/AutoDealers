import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getCustomerFileById } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await params;
    const file = await getCustomerFileById(auth.tenantId, fileId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
    const uploadLink = `${baseUrl}/upload-documents/${file.uploadToken}`;

    return NextResponse.json({ uploadLink, token: file.uploadToken });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating upload link:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
