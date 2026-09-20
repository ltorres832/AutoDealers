export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getRequiredPoliciesForUser } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const language = (searchParams.get('language') || 'es') as 'es' | 'en';
    const policies = await getRequiredPoliciesForUser(auth.userId, 'advertiser', undefined, language);
    return NextResponse.json({ policies }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('Error fetching required advertiser policies:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener políticas requeridas' },
      { status: 500 }
    );
  }
}
