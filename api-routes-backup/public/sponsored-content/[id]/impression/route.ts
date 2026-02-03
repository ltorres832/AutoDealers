import { NextRequest, NextResponse } from 'next/server';

export async function generateStaticParams() {
  return [];
}
import { updateSponsoredContentMetrics } from '@autodealers/core';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID requerido' },
        { status: 400 }
      );
    }

    // Actualizar métrica de impresión con validación de límites
    const result = await updateSponsoredContentMetrics(id, 'impression');

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.reason || 'Límite alcanzado',
          paused: true 
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating impression metric:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

