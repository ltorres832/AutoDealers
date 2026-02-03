// API route para obtener solicitudes F&I (Dealer)
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const db = getFirestore();
    let query: admin.firestore.Query = db
      .collection('tenants')
      .doc(user.tenantId!)
      .collection('fi_requests');

    // Aplicar filtro de status si se proporciona
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    // Intentar con orderBy, pero si falla por índice faltante, hacer sin orderBy
    let snapshot;
    try {
      snapshot = await query.orderBy('createdAt', 'desc').get();
    } catch (error: any) {
      // Si es error de índice, hacer sin orderBy y ordenar en memoria
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.log('⚠️ Índice faltante, obteniendo sin orderBy y ordenando en memoria');
        snapshot = await query.get();
      } else {
        throw error;
      }
    }

    const requests = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        history: (data.history || []).map((h: any) => ({
          ...h,
          timestamp: h.timestamp?.toDate() || new Date(),
        })),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        submittedAt: data.submittedAt?.toDate() || undefined,
        reviewedAt: data.reviewedAt?.toDate() || undefined,
      };
    });

    // Ordenar en memoria por createdAt (más reciente primero)
    requests.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Error en GET /api/fi/requests:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener solicitudes F&I' },
      { status: 500 }
    );
  }
}
