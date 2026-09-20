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

    const currentUserDoc = await db.collection('users').doc(auth.userId).get();
    const currentUserData = currentUserDoc.data();

    const networkId =
      typeof currentUserData?.dealerNetworkId === 'string'
        ? currentUserData.dealerNetworkId
        : undefined;
    const associatedDealers = currentUserData?.associatedDealers || [];

    const dealers: {
      id: string;
      name: string;
      status?: string;
      networkStatus?: string;
      role?: string;
      pending?: boolean;
    }[] = [];

    if (networkId) {
      const networkDoc = await db.collection('dealer_networks').doc(networkId).get();
      const network = networkDoc.data();
      const roster = Array.isArray(network?.dealers) ? network.dealers : [];

      for (const item of roster) {
        const tenantId = typeof item.tenantId === 'string' ? item.tenantId : '';
        if (!tenantId) {
          dealers.push({
            id: `pending:${String(item.name || item.displayName || 'dealer')}`,
            name: String(item.displayName || item.name || 'Dealer pendiente'),
            status: 'pending',
            networkStatus: String(item.status || 'pending_tenant_link'),
            role: String(item.role || 'member'),
            pending: true,
          });
          continue;
        }

        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        const tenantData = tenantDoc.data();
        dealers.push({
          id: tenantId,
          name: String(item.displayName || tenantData?.name || tenantData?.companyName || 'Dealer'),
          status: tenantData?.status || 'active',
          networkStatus: String(item.status || 'active'),
          role: String(item.role || 'member'),
          pending: false,
        });
      }

      return NextResponse.json({
        dealers,
        network: networkDoc.exists
          ? {
              id: networkDoc.id,
              maxDealers: network?.maxDealers ?? null,
              status: network?.status || 'active',
              dealerNames: network?.dealerNames || [],
            }
          : null,
      });
    }

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



