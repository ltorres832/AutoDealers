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

    // Actualizar métrica de click
    await updateSponsoredContentMetrics(id, 'click');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating click metric:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

