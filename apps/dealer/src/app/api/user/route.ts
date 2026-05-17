import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthIncludingSeller } from '@/lib/auth';
import { isDealerPortalRole, isSellerRole } from '@/lib/dealer-portal-roles';
import { getUserById } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthIncludingSeller(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isDealerPortalRole(auth.role) && !isSellerRole(auth.role)) {
      return NextResponse.json(
        { error: 'Rol no permitido en este portal', role: auth.role },
        { status: 403 }
      );
    }

    const user = await getUserById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isDealerPortalRole(user.role) && !isSellerRole(user.role)) {
      return NextResponse.json(
        { error: 'Rol no permitido en este portal', role: user.role },
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





