export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getActivePolicies } from '@autodealers/core';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const { searchParams } = new URL(request.url);
    const language = (searchParams.get('language') || 'es') as 'es' | 'en';
    
    const policies = await getActivePolicies(
      type as any,
      'public',
      undefined,
      language
    );
    
    if (policies.length === 0) {
      return NextResponse.json(
        { error: 'Política no encontrada' },
        { status: 404 }
      );
    }
    
    // Retornar la política más reciente
    const policy = policies[0];
    
    return NextResponse.json({ policy });
  } catch (error: any) {
    console.error('Error fetching policy:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener política' },
      { status: 500 }
    );
  }
}

