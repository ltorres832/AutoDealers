export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createTenant, getTenants } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenants = await getTenants();

    // Agregar estadísticas a cada tenant
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const [usersSnapshot, vehiclesSnapshot, leadsSnapshot] = await Promise.all([
          db.collection('users').where('tenantId', '==', tenant.id).get(),
          db.collection('tenants').doc(tenant.id).collection('vehicles').get(),
          db.collection('tenants').doc(tenant.id).collection('leads').get(),
        ]);

        // Calcular calificaciones promedio del tenant
        let avgDealerRating = 0;
        let avgSellerRating = 0;
        let dealerRatingCount = 0;
        let sellerRatingCount = 0;

        if (tenant.type === 'dealer') {
          // Para dealers, obtener calificación del dealer principal
          const dealerUsers = usersSnapshot.docs.filter(doc => doc.data().role === 'dealer');
          if (dealerUsers.length > 0) {
            const dealerData = dealerUsers[0].data();
            avgDealerRating = dealerData?.dealerRating || 0;
            dealerRatingCount = dealerData?.dealerRatingCount || 0;
          }
        } else {
          // Para sellers, obtener calificación promedio de todos los sellers
          const sellerUsers = usersSnapshot.docs.filter(doc => doc.data().role === 'seller');
          if (sellerUsers.length > 0) {
            const ratings = sellerUsers
              .map(doc => doc.data().sellerRating || 0)
              .filter(rating => rating > 0);
            if (ratings.length > 0) {
              avgSellerRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
              sellerRatingCount = sellerUsers.reduce((sum, doc) => sum + (doc.data().sellerRatingCount || 0), 0);
            }
          }
        }

        return {
          ...tenant,
          userCount: usersSnapshot.size,
          vehicleCount: vehiclesSnapshot.size,
          leadCount: leadsSnapshot.size,
          // Calificaciones
          avgDealerRating,
          dealerRatingCount,
          avgSellerRating,
          sellerRatingCount,
        };
      })
    );

    return NextResponse.json({ tenants: tenantsWithStats });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, subdomain, companyName } = body;

    const tenant = await createTenant(
      name, 
      type, 
      subdomain, 
      undefined, // membershipId (se puede agregar después)
      type === 'dealer' ? companyName : undefined // companyName solo para dealers
    );

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

