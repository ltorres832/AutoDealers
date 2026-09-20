export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPublicPolicyByType } from '@/lib/public-policies';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string; type: string }> }
) {
  try {
    const { subdomain, type } = await params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'es';

    const policy = await getPublicPolicyByType(type, { subdomain, language });

    if (!policy) {
      return NextResponse.json(
        { error: 'Política no encontrada' },
        {
          status: 404,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    return NextResponse.json(
      { policy },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('Error fetching public tenant policy:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener política' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
