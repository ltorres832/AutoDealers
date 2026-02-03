export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  createDynamicFeature,
  getDynamicFeatures,
  updateDynamicFeature,
  deleteDynamicFeature,
} from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as any;
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const features = await getDynamicFeatures(category, activeOnly);

    return NextResponse.json({ features });
  } catch (error) {
    console.error('Error fetching dynamic features:', error);
    return NextResponse.json(
      { features: [] },
      { status: 200 }
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
      key,
      name,
      description,
      type,
      category,
      defaultValue,
      options,
      min,
      max,
      unit,
      isActive,
    } = body;

    // Validar campos requeridos
    if (!key || !name || !description || !type || !category) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Validar formato de clave
    if (!/^[a-z0-9_]+$/.test(key)) {
      return NextResponse.json(
        { error: 'La clave solo puede contener letras minúsculas, números y guiones bajos' },
        { status: 400 }
      );
    }

    const feature = await createDynamicFeature(
      {
        key,
        name,
        description,
        type,
        category,
        defaultValue,
        options,
        min,
        max,
        unit,
        isActive: isActive !== undefined ? isActive : true,
      },
      auth.userId || 'admin'
    );

    // Sincronizar con todas las membresías existentes
    await syncDynamicFeatureToMemberships(key, defaultValue);

    return NextResponse.json({ feature }, { status: 201 });
  } catch (error) {
    console.error('Error creating dynamic feature:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Sincroniza una feature dinámica con todas las membresías existentes
 */
async function syncDynamicFeatureToMemberships(
  featureKey: string,
  defaultValue: any
) {
  const { getFirestore } = await import('@autodealers/core');
  const db = getFirestore();

  // Obtener todas las membresías
  const membershipsSnapshot = await db.collection('memberships').get();

  const batch = db.batch();
  membershipsSnapshot.docs.forEach((doc) => {
    const membershipRef = db.collection('memberships').doc(doc.id);
    const currentFeatures = doc.data().features || {};
    
    // Solo agregar si no existe
    if (currentFeatures[featureKey] === undefined) {
      batch.update(membershipRef, {
        [`features.${featureKey}`]: defaultValue !== undefined 
          ? defaultValue 
          : null,
      });
    }
  });

  await batch.commit();
  console.log(`Feature dinámica "${featureKey}" sincronizada con ${membershipsSnapshot.size} membresías`);
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Feature ID required' }, { status: 400 });
    }

    await updateDynamicFeature(id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating dynamic feature:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}





