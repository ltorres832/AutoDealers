import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

function getDb() {
  return getFirestore();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const users: any[] = [];

    // Obtener información del usuario actual
    const currentUserDoc = await db.collection('users').doc(auth.userId).get();
    const currentUserData = currentUserDoc.data();
    const dealerId = currentUserData?.dealerId;
    const tenantId = auth.tenantId || currentUserData?.tenantId;

    // 1. Obtener el dealer asignado
    if (dealerId) {
      try {
        // Buscar el dealer en su tenant
        const dealerTenantDoc = await db.collection('tenants').doc(dealerId).get();
        if (dealerTenantDoc.exists) {
          const dealerTenantData = dealerTenantDoc.data();
          // Buscar usuarios en el tenant del dealer
          const dealerUsersSnapshot = await db
            .collection('users')
            .where('tenantId', '==', dealerId)
            .where('role', '==', 'dealer')
            .get();

          dealerUsersSnapshot.forEach((doc) => {
            const data = doc.data();
            if (doc.id !== auth.userId && (data.status === 'active' || !data.status)) {
              users.push({
                id: doc.id,
                name: data.name || dealerTenantData?.name || data.email,
                email: data.email || dealerTenantData?.email,
                role: 'dealer',
                status: data.status || 'active',
                tenantId: dealerId,
              });
            }
          });

          // Si no hay usuarios dealer, usar la info del tenant
          if (dealerUsersSnapshot.empty && dealerTenantData) {
            users.push({
              id: dealerId,
              name: dealerTenantData.name || 'Dealer',
              email: dealerTenantData.email,
              role: 'dealer',
              status: 'active',
              tenantId: dealerId,
            });
          }
        }
      } catch (error) {
        console.warn('Error obteniendo dealer:', error);
      }
    }

    // 2. Obtener otros vendedores del mismo tenant o dealer
    const tenantIdsToSearch = [tenantId];
    if (dealerId && dealerId !== tenantId) {
      tenantIdsToSearch.push(dealerId);
    }

    for (const tid of tenantIdsToSearch) {
      if (!tid) continue;

      try {
        // Buscar vendedores en el tenant
        const sellersSnapshot = await db
          .collection('users')
          .where('tenantId', '==', tid)
          .where('role', '==', 'seller')
          .get();

        sellersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id !== auth.userId && (data.status === 'active' || !data.status)) {
            if (!users.find(u => u.id === doc.id || u.email === data.email)) {
              users.push({
                id: doc.id,
                name: data.name || data.email,
                email: data.email,
                role: 'seller',
                status: data.status || 'active',
                tenantId: tid,
              });
            }
          }
        });

        // Buscar otros roles (FI, manager, etc.)
        const otherRolesSnapshot = await db
          .collection('users')
          .where('tenantId', '==', tid)
          .where('role', 'in', ['fi_manager', 'manager', 'admin'])
          .get();

        otherRolesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id !== auth.userId && (data.status === 'active' || !data.status)) {
            if (!users.find(u => u.id === doc.id || u.email === data.email)) {
              users.push({
                id: doc.id,
                name: data.name || data.email,
                email: data.email,
                role: data.role,
                status: data.status || 'active',
                tenantId: tid,
              });
            }
          }
        });
      } catch (error) {
        console.warn(`Error obteniendo usuarios del tenant ${tid}:`, error);
      }
    }

    // 3. Buscar en sub_users
    if (tenantId) {
      try {
        const subUsersSnapshot = await db
          .collection('sub_users')
          .where('tenantId', '==', tenantId)
          .get();

        subUsersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id !== auth.userId && (data.status === 'active' || !data.status)) {
            if (!users.find(u => u.id === doc.id || u.email === data.email)) {
              users.push({
                id: doc.id,
                name: data.name || data.email,
                email: data.email,
                role: data.role || 'seller',
                status: data.status || 'active',
                tenantId: tenantId,
              });
            }
          }
        });
      } catch (error) {
        console.warn('Error obteniendo sub_users:', error);
      }
    }

    // Eliminar duplicados por ID o email
    const uniqueUsers = Array.from(
      new Map(users.map(u => [u.id || u.email, u])).values()
    );

    // Ordenar por rol y nombre
    uniqueUsers.sort((a, b) => {
      // Primero por rol (dealer primero, luego otros)
      if (a.role === 'dealer' && b.role !== 'dealer') return -1;
      if (a.role !== 'dealer' && b.role === 'dealer') return 1;
      
      // Luego por nombre
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return NextResponse.json({ users: uniqueUsers });
  } catch (error: any) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


