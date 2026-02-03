import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getFirestore } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * GET - Obtiene lista de vendedores
 * Query params opcionales:
 * - dealerId: Filtra vendedores de un dealer específico
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const dealerId = searchParams.get('dealerId');

    const db = getFirestore();
    let query = db.collection('users').where('role', '==', 'seller');

    // Si se especifica un dealer, filtrar por ese dealer
    if (dealerId) {
      query = query.where('tenantId', '==', dealerId);
    }

    const sellersSnapshot = await query
      .orderBy('name', 'asc')
      .limit(200)
      .get();

    const sellers = sellersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        tenantId: data.tenantId,
        dealerId: data.dealerId || null,
        status: data.status || 'active',
      };
    });

    // Si se filtró por dealer, obtener el nombre del dealer también
    let dealerName = null;
    if (dealerId) {
      const dealerDoc = await db.collection('tenants').doc(dealerId).get();
      if (dealerDoc.exists) {
        dealerName = dealerDoc.data()?.name;
      }
    }

    return createSuccessResponse({
      sellers,
      dealerName,
      count: sellers.length,
    });
  } catch (error: any) {
    console.error('Error fetching sellers:', error);
    return createErrorResponse(error.message || 'Error al cargar vendedores', 500);
  }
}


