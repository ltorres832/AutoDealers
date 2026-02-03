// Endpoint de debug para verificar solicitudes F&I en Firestore (Dealer)
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

    const db = getFirestore();
    
    // Obtener TODAS las solicitudes sin filtros
    const allRequestsSnapshot = await db
      .collection('tenants')
      .doc(user.tenantId!)
      .collection('fi_requests')
      .get();

    const allRequests = allRequestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));

    return NextResponse.json({
      debug: {
        tenantId: user.tenantId,
        userId: user.userId,
        userRole: user.role,
        totalRequests: allRequests.length,
        allRequests: allRequests.map((r: any) => ({
          id: r.id,
          createdBy: r.createdBy,
          status: r.status,
          clientId: r.clientId,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error en GET /api/fi/debug:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error al obtener debug info',
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

