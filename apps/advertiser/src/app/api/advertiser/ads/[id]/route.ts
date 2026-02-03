import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

// GET - Obtener un anuncio específico
export async function GET(
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

    const ad = {
      id: adDoc.id,
      ...data,
      startDate: data?.startDate?.toDate() || new Date(),
      endDate: data?.endDate?.toDate() || new Date(),
      approvedAt: data?.approvedAt?.toDate(),
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      ctr: (data?.impressions || 0) > 0 ? ((data?.clicks || 0) / (data?.impressions || 0)) * 100 : 0,
    };

    return NextResponse.json({ ad });
  } catch (error: any) {
    console.error('Error fetching ad:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un anuncio
export async function PUT(
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

    // Solo permitir editar si está pendiente o pausado
    if (data?.status !== 'pending' && data?.status !== 'paused') {
      return NextResponse.json(
        { error: 'Solo se pueden editar anuncios pendientes o pausados' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      imageUrl,
      videoUrl,
      linkUrl,
      linkType,
      targetLocation,
      targetVehicleTypes,
      budget,
      budgetType,
      startDate,
      endDate,
    } = body;

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
    if (linkType !== undefined) updateData.linkType = linkType;
    if (targetLocation !== undefined) updateData.targetLocation = targetLocation;
    if (targetVehicleTypes !== undefined) updateData.targetVehicleTypes = targetVehicleTypes;
    if (budget !== undefined) updateData.budget = Number(budget);
    if (budgetType !== undefined) updateData.budgetType = budgetType;
    if (startDate !== undefined) updateData.startDate = admin.firestore.Timestamp.fromDate(new Date(startDate));
    if (endDate !== undefined) updateData.endDate = admin.firestore.Timestamp.fromDate(new Date(endDate));

    // Si se actualiza, volver a estado pendiente para revisión
    if (data?.status === 'paused') {
      updateData.status = 'pending';
    }

    await db.collection('sponsored_content').doc(id).update(updateData);

    const updatedDoc = await db.collection('sponsored_content').doc(id).get();
    const updatedData = updatedDoc.data();

    const ad = {
      id: updatedDoc.id,
      ...updatedData,
      startDate: updatedData?.startDate?.toDate() || new Date(),
      endDate: updatedData?.endDate?.toDate() || new Date(),
      approvedAt: updatedData?.approvedAt?.toDate(),
      createdAt: updatedData?.createdAt?.toDate() || new Date(),
      updatedAt: updatedData?.updatedAt?.toDate() || new Date(),
    };

    return NextResponse.json({
      success: true,
      ad,
    });
  } catch (error: any) {
    console.error('Error updating ad:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un anuncio
export async function DELETE(
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

    // Solo permitir eliminar si está pendiente, pausado o rechazado
    if (!['pending', 'paused', 'rejected'].includes(data?.status)) {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar anuncios pendientes, pausados o rechazados' },
        { status: 400 }
      );
    }

    await db.collection('sponsored_content').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting ad:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

