export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createSubUser, getSubUsers } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subUsers = await getSubUsers(auth.tenantId, auth.userId);

    return NextResponse.json({ subUsers });
  } catch (error) {
    console.error('Error fetching sub users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const subUser = await createSubUser(
      auth.tenantId,
      auth.userId,
      {
        email: body.email,
        password: body.password,
        name: body.name,
        role: body.role,
        permissions: body.permissions,
      }
    );

    return NextResponse.json({ subUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating sub user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}





