import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener el dealer actual para verificar si tiene múltiples dealers asociados
    const currentUserDoc = await db.collection('users').doc(auth.userId).get();
    const currentUserData = currentUserDoc.data();

    // Si el usuario tiene dealers asociados, obtenerlos
    const associatedDealers = currentUserData?.associatedDealers || [];

    const dealers = [];

    // Agregar el dealer actual
    const currentTenantDoc = await db.collection('tenants').doc(auth.tenantId).get();
    if (currentTenantDoc.exists) {
      const tenantData = currentTenantDoc.data();
      dealers.push({
        id: auth.tenantId,
        name: tenantData?.name || 'Mi Cuenta',
      });
    }

    // Agregar dealers asociados
    if (associatedDealers.length > 0) {
      const associatedDealersDocs = await Promise.all(
        associatedDealers.map((id: string) => db.collection('tenants').doc(id).get())
      );

      associatedDealersDocs.forEach((doc) => {
        if (doc.exists) {
          const data = doc.data();
          dealers.push({
            id: doc.id,
            name: data?.name || 'Dealer',
          });
        }
      });
    }

    return NextResponse.json({ dealers });
  } catch (error: any) {
    console.error('Error fetching dealers:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, dealers: [] },
      { status: 500 }
    );
  }
}



