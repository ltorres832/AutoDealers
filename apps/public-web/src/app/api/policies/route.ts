import { NextRequest, NextResponse } from 'next/server';
import { getPublicPlatformPolicies } from '@/lib/public-policies';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'es';
    const policies = await getPublicPlatformPolicies(language);

    const response = NextResponse.json({ policies });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Error fetching public policies:', error);
    return NextResponse.json(
      { error: 'Error al obtener políticas públicas', policies: [] },
      { status: 500 }
    );
  }
}
