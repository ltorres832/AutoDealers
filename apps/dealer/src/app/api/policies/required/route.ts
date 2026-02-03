export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getRequiredPoliciesForUser } from '@autodealers/core';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role') as 'admin' | 'dealer' | 'seller' | 'public' | 'advertiser' | null;
    const tenantId = searchParams.get('tenantId') || undefined;
    const language = (searchParams.get('language') || 'es') as 'es' | 'en';

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId y role son requeridos' },
        { status: 400 }
      );
    }

    const policies = await getRequiredPoliciesForUser(userId, role, tenantId, language);
    return NextResponse.json({ policies });
  } catch (error: any) {
    console.error('Error fetching required policies:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener políticas requeridas' },
      { status: 500 }
    );
  }
}


