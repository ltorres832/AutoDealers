import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role'); // 'dealer' o 'seller'

    let query = db.collection('users') as any;
    
    if (role) {
      query = query.where('role', '==', role);
    }

    const usersSnapshot = await query.where('status', '==', 'active').get();

    const users = [];
    const tenantCache: Record<string, any> = {};

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const tenantId = data.tenantId;

      // Obtener información del tenant (con cache)
      let tenantInfo = tenantCache[tenantId];
      if (!tenantInfo && tenantId) {
        try {
          const tenantDoc = await db.collection('tenants').doc(tenantId).get();
          if (tenantDoc.exists) {
            tenantInfo = {
              id: tenantId,
              name: tenantDoc.data()?.name || 'Sin nombre',
            };
            tenantCache[tenantId] = tenantInfo;
          }
        } catch (error) {
          tenantInfo = { id: tenantId, name: 'Sin nombre' };
        }
      }

      users.push({
        id: doc.id,
        email: data.email,
        name: data.name,
        role: data.role,
        tenantId: data.tenantId,
        tenantName: tenantInfo?.name || 'Sin tenant',
        dealerId: data.dealerId,
        createdAt: data.createdAt?.toDate()?.toISOString(),
      });
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


