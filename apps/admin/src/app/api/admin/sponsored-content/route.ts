import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createSponsoredContent } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let query: any = db.collection('sponsored_content').orderBy('createdAt', 'desc');

    if (status) {
      query = db.collection('sponsored_content').where('status', '==', status).orderBy('createdAt', 'desc');
    }

    const snapshot = await query.get();
    const content = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate()?.toISOString(),
        endDate: data.endDate?.toDate()?.toISOString(),
        approvedAt: data.approvedAt?.toDate()?.toISOString(),
        createdAt: data.createdAt?.toDate()?.toISOString(),
        updatedAt: data.updatedAt?.toDate()?.toISOString(),
      };
    });

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('Error fetching sponsored content:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      advertiserId,
      advertiserName,
      title,
      description,
      type,
      placement,
      imageUrl,
      videoUrl,
      linkUrl,
      linkType,
      budget,
      budgetType,
      startDate,
      endDate,
      targetLocation,
      targetVehicleTypes,
      status,
    } = body;

    // Validar campos requeridos
    if (!advertiserId || !title || !description || !placement || !imageUrl || !linkUrl || !budget || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Crear contenido patrocinado
    const content = await createSponsoredContent({
      advertiserId,
      advertiserName,
      title,
      description,
      type: type || 'banner',
      placement,
      imageUrl,
      videoUrl,
      linkUrl,
      linkType: linkType || 'external',
      budget: typeof budget === 'number' ? budget : parseFloat(budget),
      budgetType: budgetType || 'monthly',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      targetLocation,
      targetVehicleTypes,
      status: status || 'pending',
    });

    return NextResponse.json({ content }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sponsored content:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
