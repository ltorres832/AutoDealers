export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { acceptPolicy } from '@autodealers/core';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: policyId } = await params;
    
    const body = await request.json();
    const { userId } = body;

    console.log('🔍 Aceptando política:', {
      policyId,
      userId,
      policyIdType: typeof policyId,
      policyIdLength: policyId?.length,
    });

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    if (!policyId) {
      return NextResponse.json(
        { error: 'policyId es requerido' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await acceptPolicy(userId, policyId, ipAddress, userAgent);
    console.log('✅ Política aceptada exitosamente:', policyId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const { id: policyIdFromParams } = await params;
    console.error('❌ Error accepting policy:', {
      error: error.message,
      stack: error.stack,
      policyId: policyIdFromParams || 'unknown',
    });
    return NextResponse.json(
      { error: error.message || 'Error al aceptar política' },
      { status: 500 }
    );
  }
}

