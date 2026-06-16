import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getUserById } from '@autodealers/core';
import { resolveIndependentSellerWorkspace } from '@/lib/seller-workspace';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(auth.userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isIndependentWorkspace = await resolveIndependentSellerWorkspace({
      tenantId: user.tenantId,
      userId: user.id,
      dealerId: user.dealerId,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        dealerId: user.dealerId,
        isIndependentWorkspace,
        mustChangePassword: user.mustChangePassword === true,
        createdByAdmin: user.createdByAdmin === true,
        adminMembershipSelectionRequired: user.adminMembershipSelectionRequired === true,
        adminMembershipAccess: user.adminMembershipAccess,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





