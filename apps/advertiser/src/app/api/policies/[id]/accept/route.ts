export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { acceptPolicy } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: policyId } = await params;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await acceptPolicy(auth.userId, policyId, ipAddress, userAgent);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error accepting advertiser policy:', error);
    return NextResponse.json(
      { error: error.message || 'Error al aceptar política' },
      { status: 500 }
    );
  }
}
