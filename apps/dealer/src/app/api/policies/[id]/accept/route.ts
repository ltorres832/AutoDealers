export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { acceptPolicy } from '@autodealers/core';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const { id: policyId } = await params;
    await acceptPolicy(policyId, userId, ipAddress, userAgent);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error accepting policy:', error);
    return NextResponse.json(
      { error: error.message || 'Error al aceptar política' },
      { status: 500 }
    );
  }
}

