import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener filtro de dealer si se proporciona
    const searchParams = request.nextUrl.searchParams;
    const dealerFilter = searchParams.get('dealerId');

    // Si hay filtro, usarlo; de lo contrario usar el tenantId del usuario autenticado
    const dealerIdsToFilter = dealerFilter 
      ? [dealerFilter]
      : [auth.tenantId]; // Por defecto, el dealer actual

    // Si el usuario tiene múltiples dealers asociados, incluir todos si no hay filtro
    if (!dealerFilter) {
      const currentUserDoc = await db.collection('users').doc(auth.userId).get();
      const currentUserData = currentUserDoc.data();
      const associatedDealers = currentUserData?.associatedDealers || [];
      if (associatedDealers.length > 0) {
        dealerIdsToFilter.push(...associatedDealers);
      }
    }

    // Obtener todos los vendedores de los dealers seleccionados
    const sellersQueries = dealerIdsToFilter.map(dealerId =>
      db.collection('users')
        .where('role', '==', 'seller')
        .where('dealerId', '==', dealerId)
        .get()
    );

    const sellersSnapshots = await Promise.all(sellersQueries);
    const allSellers: any[] = [];
    sellersSnapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        if (!allSellers.find(s => s.id === doc.id)) {
          allSellers.push({ id: doc.id, data: doc.data() });
        }
      });
    });

    const activities = await Promise.all(
      allSellers.map(async (sellerDoc) => {
        const sellerData = sellerDoc.data;
        const sellerId = sellerDoc.id;
        
        // Obtener tenantId del seller (puede ser el mismo del dealer o uno propio)
        const sellerTenantId = sellerData.tenantId || auth.tenantId;

        // Obtener leads del seller
        const leadsSnapshot = await db
          .collection('tenants')
          .doc(sellerTenantId)
          .collection('leads')
          .where('assignedTo', '==', sellerId)
          .get();

        const leads = leadsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()?.toISOString(),
        }));

        // Obtener ventas del seller
        const salesSnapshot = await db
          .collection('tenants')
          .doc(sellerTenantId)
          .collection('sales')
          .where('sellerId', '==', sellerId)
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get();

        const sales = salesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()?.toISOString(),
        }));

        // Obtener citas del seller
        const appointmentsSnapshot = await db
          .collection('tenants')
          .doc(sellerTenantId)
          .collection('appointments')
          .where('sellerId', '==', sellerId)
          .orderBy('date', 'desc')
          .limit(10)
          .get();

        const appointments = appointmentsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate()?.toISOString(),
          };
        });

        // Obtener campañas (si existen)
        const campaignsSnapshot = await db
          .collection('tenants')
          .doc(sellerTenantId)
          .collection('campaigns')
          .where('createdBy', '==', sellerId)
          .get();

        const campaigns = campaignsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Calcular estadísticas
        const stats = {
          totalLeads: leads.length,
          activeLeads: leads.filter((l: any) => l.status !== 'closed' && l.status !== 'lost').length,
          totalSales: sales.length,
          totalRevenue: sales.reduce((sum: number, s: any) => sum + (s.price || 0), 0),
          totalAppointments: appointments.length,
          totalCampaigns: campaigns.length,
        };

        return {
          sellerId,
          sellerName: sellerData.name || 'Sin nombre',
          sellerEmail: sellerData.email || '',
          stats,
          recentLeads: leads.slice(0, 10),
          recentSales: sales,
          recentAppointments: appointments,
          recentCampaigns: campaigns,
        };
      })
    );

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('Error fetching sellers activity:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, activities: [] },
      { status: 500 }
    );
  }
}

