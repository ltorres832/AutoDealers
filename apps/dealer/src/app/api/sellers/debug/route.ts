import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de diagnóstico para ver qué vendedores hay en Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const debug: any = {
      tenantId: auth.tenantId,
      userId: auth.userId,
    };

    // 1. Buscar en sub_users del tenant
    try {
      const subUsersSnapshot = await db
        .collection('tenants')
        .doc(auth.tenantId)
        .collection('sub_users')
        .get();
      
      debug.subUsersInTenant = {
        count: subUsersSnapshot.size,
        items: subUsersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })),
      };
    } catch (error: any) {
      debug.subUsersInTenant = { error: error.message };
    }

    // 2. Buscar en sub_users global con dealerTenantId
    try {
      const subUsersGlobalSnapshot = await db
        .collection('sub_users')
        .where('dealerTenantId', '==', auth.tenantId)
        .get();
      
      debug.subUsersGlobal = {
        count: subUsersGlobalSnapshot.size,
        items: subUsersGlobalSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })),
      };
    } catch (error: any) {
      debug.subUsersGlobal = { error: error.message };
    }

    // 3. Buscar en users con dealerId
    try {
      const usersSnapshot = await db
        .collection('users')
        .where('dealerId', '==', auth.tenantId)
        .get();
      
      debug.usersWithDealerId = {
        count: usersSnapshot.size,
        items: usersSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email,
          role: doc.data().role,
          tenantId: doc.data().tenantId,
          dealerId: doc.data().dealerId,
          status: doc.data().status,
        })),
      };
    } catch (error: any) {
      debug.usersWithDealerId = { error: error.message };
    }

    // 4. Buscar en users con role=seller y tenantId del dealer
    try {
      const usersInTenantSnapshot = await db
        .collection('users')
        .where('tenantId', '==', auth.tenantId)
        .where('role', '==', 'seller')
        .get();
      
      debug.usersInTenant = {
        count: usersInTenantSnapshot.size,
        items: usersInTenantSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email,
          role: doc.data().role,
          tenantId: doc.data().tenantId,
          dealerId: doc.data().dealerId,
          status: doc.data().status,
        })),
      };
    } catch (error: any) {
      debug.usersInTenant = { error: error.message };
    }

    // 5. Buscar TODOS los sellers (sin filtro de dealerId)
    try {
      const allSellersSnapshot = await db
        .collection('users')
        .where('role', '==', 'seller')
        .limit(50)
        .get();
      
      debug.allSellers = {
        count: allSellersSnapshot.size,
        items: allSellersSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email,
          tenantId: doc.data().tenantId,
          dealerId: doc.data().dealerId,
        })),
      };
    } catch (error: any) {
      debug.allSellers = { error: error.message };
    }

    return NextResponse.json({ debug });
  } catch (error: any) {
    console.error('Error en debug:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}



