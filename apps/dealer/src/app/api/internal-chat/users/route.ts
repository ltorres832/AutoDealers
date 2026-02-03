import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getSubUsers } from '@autodealers/core';

function getDb() {
  return getFirestore();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const users: any[] = [];

    // 1. Obtener todos los vendedores (sub-users)
    try {
      const sellers = await getSubUsers(auth.tenantId);
      sellers.forEach(seller => {
        if (seller.id !== auth.userId) {
          users.push({
            id: seller.id,
            name: seller.name || seller.email,
            email: seller.email,
            role: 'seller',
            status: (seller as any).status || 'active',
            tenantId: seller.tenantId || auth.tenantId,
          });
        }
      });
    } catch (error) {
      console.warn('Error obteniendo sub-users:', error);
    }

    // 2. Obtener usuarios de la colección users con diferentes roles
    const rolesToFetch = ['seller', 'fi_manager', 'manager', 'admin'];
    
    for (const role of rolesToFetch) {
      try {
        const snapshot = await db.collection('users')
          .where('tenantId', '==', auth.tenantId)
          .where('role', '==', role)
          .get();

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id !== auth.userId && (data.status === 'active' || !data.status)) {
            // Evitar duplicados
            if (!users.find(u => u.id === doc.id || u.email === data.email)) {
              users.push({
                id: doc.id,
                name: data.name || data.email,
                email: data.email,
                role: data.role || role,
                status: data.status || 'active',
                tenantId: data.tenantId || auth.tenantId,
              });
            }
          }
        });
      } catch (error) {
        console.warn(`Error obteniendo usuarios con rol ${role}:`, error);
      }
    }

    // 3. Obtener usuarios de sub_users con dealerTenantId
    try {
      const subUsersSnapshot = await db
        .collection('sub_users')
        .where('dealerTenantId', '==', auth.tenantId)
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
              tenantId: data.tenantId || auth.tenantId,
            });
          }
        }
      });
    } catch (error) {
      console.warn('Error obteniendo sub_users:', error);
    }

    // Eliminar duplicados por ID o email
    const uniqueUsers = Array.from(
      new Map(users.map((u: any) => [u.id || u.email, u])).values()
    );

    // Ordenar por nombre
    uniqueUsers.sort((a, b) => {
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

