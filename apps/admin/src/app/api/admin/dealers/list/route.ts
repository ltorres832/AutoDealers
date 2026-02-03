import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getFirestore } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * GET - Obtiene lista de dealers para selectores
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const db = getFirestore();

    // Obtener todos los tenants de tipo dealer
    const dealersSnapshot = await db
      .collection('tenants')
      .where('type', '==', 'dealer')
      .where('status', '==', 'active')
      .orderBy('name', 'asc')
      .limit(100)
      .get();

    const dealers = dealersSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      email: doc.data().email || '',
      companyName: doc.data().companyName || '',
      subdomain: doc.data().subdomain || '',
    }));

    return createSuccessResponse({ dealers });
  } catch (error: any) {
    console.error('Error fetching dealers:', error);
    return createErrorResponse(error.message || 'Error al cargar dealers', 500);
  }
}


