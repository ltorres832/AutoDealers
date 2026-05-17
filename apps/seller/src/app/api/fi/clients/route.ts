// API route para gestionar clientes F&I (Seller)
// GET: Obtener todos los clientes
// POST: Crear un nuevo cliente

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

// Implementación directa para evitar problemas de webpack
async function createFIClientDirect(
  tenantId: string,
  clientData: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    identification?: string;
    vehicleId?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehiclePrice?: number;
    downPayment?: number;
    hasTradeIn?: boolean;
    tradeInDetails?: Record<string, unknown>;
    createdBy: string;
  }
) {
  const db = getFirestore();
  const clientRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .doc();

  const client = {
    ...clientData,
    tenantId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await clientRef.set(client);

  return {
    id: clientRef.id,
    ...clientData,
    tenantId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function getFIClientsDirect(tenantId: string) {
  const db = getFirestore();
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es seller
    if (user.role !== 'seller') {
      return NextResponse.json({ error: 'Solo vendedores pueden acceder' }, { status: 403 });
    }

    // Obtener tenantId del documento de usuario si no está en auth
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(user.userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userData = userDoc.data();
    const tenantId = user.tenantId || userData?.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'No se pudo determinar el tenantId' }, { status: 400 });
    }

    const fiGate = await requireTenantFeature(tenantId, 'useFIModule');
    if (fiGate) return fiGate;

    const clients = await getFIClientsDirect(tenantId);

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('Error en GET /api/fi/clients:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener clientes F&I' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.userId) {
      console.error('❌ POST /api/fi/clients - No auth o userId');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es seller
    if (user.role !== 'seller') {
      console.error('❌ POST /api/fi/clients - Usuario no es seller:', user.role);
      return NextResponse.json({ error: 'Solo vendedores pueden crear clientes F&I' }, { status: 403 });
    }

    // Obtener tenantId del documento de usuario si no está en auth
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(user.userId).get();
    
    if (!userDoc.exists) {
      console.error('❌ POST /api/fi/clients - Usuario no encontrado:', user.userId);
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userData = userDoc.data();
    const tenantId = user.tenantId || userData?.tenantId;

    if (!tenantId) {
      console.error('❌ POST /api/fi/clients - No tenantId disponible para usuario:', user.userId);
      return NextResponse.json({ error: 'No se pudo determinar el tenantId' }, { status: 400 });
    }

    const fiGatePost = await requireTenantFeature(tenantId, 'useFIModule');
    if (fiGatePost) return fiGatePost;

    console.log('✅ POST /api/fi/clients - Auth OK:', {
      userId: user.userId,
      tenantId,
      role: user.role,
    });

    const body = await request.json();
    const {
      name,
      phone,
      email,
      address,
      identification,
      vehicleId,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehiclePrice,
      downPayment,
      hasTradeIn,
      tradeInDetails,
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Nombre y teléfono son requeridos' },
        { status: 400 }
      );
    }

    console.log('📝 POST /api/fi/clients - Creando cliente F&I:', {
      tenantId,
      name,
      phone,
      createdBy: user.userId,
    });

    const client = await createFIClientDirect(tenantId, {
      name,
      phone,
      email,
      address,
      identification,
      vehicleId,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehiclePrice,
      downPayment,
      hasTradeIn,
      tradeInDetails,
      createdBy: user.userId,
    });

    console.log('✅ POST /api/fi/clients - Cliente F&I creado exitosamente:', client.id);

    return NextResponse.json({ client }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/fi/clients:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear cliente F&I' },
      { status: 500 }
    );
  }
}

