export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPublicPoliciesForSubdomain } from '@/lib/public-policies';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'es';

    const result = await getPublicPoliciesForSubdomain(subdomain, language);

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('Error fetching public tenant policies:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener políticas' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
