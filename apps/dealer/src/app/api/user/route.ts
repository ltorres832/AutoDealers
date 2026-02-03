import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getUserById } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que sea dealer
    if (auth.role !== 'dealer') {
      console.error(`❌ [DEALER API] Usuario ${auth.userId} intentó acceder con rol ${auth.role}`);
      return NextResponse.json(
        { error: 'Solo dealers pueden acceder aquí', role: auth.role },
        { status: 403 }
      );
    }

    const user = await getUserById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verificar nuevamente el rol del usuario en Firestore
    if (user.role !== 'dealer') {
      console.error(`❌ [DEALER API] Usuario ${user.id} tiene rol ${user.role} en Firestore`);
      return NextResponse.json(
        { error: 'Solo dealers pueden acceder aquí', role: user.role },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        membershipId: user.membershipId, // CRÍTICO: Incluir membershipId
        status: user.status, // CRÍTICO: Incluir status
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





