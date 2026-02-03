export const dynamic = 'force-dynamic';
// API route para obtener clientes F&I (Dealer)
// GET: Obtener todos los clientes del tenant

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

// Implementación directa de getFIClients para evitar problemas de webpack
async function getFIClientsDirect(tenantId: string) {
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
      name: data.name || 'Sin nombre',
      phone: data.phone || '',
      email: data.email,
      address: data.address,
      vehicleMake: data.vehicleMake,
      vehicleModel: data.vehicleModel,
      vehicleYear: data.vehicleYear,
      vehiclePrice: data.vehiclePrice,
      downPayment: data.downPayment,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es dealer
    const allowedRoles = ['dealer', 'master_dealer', 'manager', 'dealer_admin'];
    if (!allowedRoles.includes(user.role as string)) {
      return NextResponse.json({ error: 'Solo dealers pueden acceder' }, { status: 403 });
    }

    const clients = await getFIClientsDirect(user.tenantId!);

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('Error en GET /api/fi/clients:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener clientes F&I' },
      { status: 500 }
    );
  }
}

