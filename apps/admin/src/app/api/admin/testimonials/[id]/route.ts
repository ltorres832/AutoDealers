import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { initializeFirebase, getFirestore } from '@autodealers/core';

initializeFirebase();
const db = getFirestore();

export const dynamic = 'force-dynamic';

// PUT: Actualizar testimonio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, role, text, image, rating, order, isActive } = body;

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (text !== undefined) updateData.text = text;
    if (image !== undefined) updateData.image = image;
    if (rating !== undefined) updateData.rating = rating;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Operación simple sin timeout artificial
    await db.collection('testimonials').doc(id).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error actualizando testimonio:', error);
    return NextResponse.json(
      { error: 'Error al actualizar testimonio', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar testimonio
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    
    // Operación simple sin timeout artificial
    await db.collection('testimonials').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error eliminando testimonio:', error);
    return NextResponse.json(
      { error: 'Error al eliminar testimonio', details: error.message },
      { status: 500 }
    );
  }
}

