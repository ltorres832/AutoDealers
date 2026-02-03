import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

// POST - Pausar/Reanudar un anuncio
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const adDoc = await db.collection('sponsored_content').doc(id).get();
    
    if (!adDoc.exists) {
      return NextResponse.json(
        { error: 'Anuncio no encontrado' },
        { status: 404 }
      );
    }

    const data = adDoc.data();
    
    // Verificar que el anuncio pertenezca al anunciante
    if (data?.advertiserId !== auth.userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body; // 'pause' o 'resume'

    let newStatus: string;
    if (action === 'pause') {
      if (data?.status !== 'active' && data?.status !== 'approved') {
        return NextResponse.json(
          { error: 'Solo se pueden pausar anuncios activos o aprobados' },
          { status: 400 }
        );
      }
      newStatus = 'paused';
    } else if (action === 'resume') {
      if (data?.status !== 'paused') {
        return NextResponse.json(
          { error: 'Solo se pueden reanudar anuncios pausados' },
          { status: 400 }
        );
      }
      // Si estaba aprobado, volver a activo, si no, mantener como pausado hasta aprobación
      newStatus = data?.approvedAt ? 'active' : 'pending';
    } else {
      return NextResponse.json(
        { error: 'Acción inválida. Use "pause" o "resume"' },
        { status: 400 }
      );
    }

    await db.collection('sponsored_content').doc(id).update({
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  } catch (error: any) {
    console.error('Error pausing/resuming ad:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

