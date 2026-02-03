import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getLeads } from '@autodealers/crm';
import { getTenantSales } from '@autodealers/crm';
import { getAppointments } from '@autodealers/crm';
import { getVehicles } from '@autodealers/inventory';
import { getCampaigns } from '@autodealers/core';
import { getPromotions } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * Obtiene información completa de un vendedor específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sellerId } = await params;
    const db = getFirestore();

    // Obtener información del vendedor
    const sellerDoc = await db.collection('users').doc(sellerId).get();
    if (!sellerDoc.exists) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }

    const sellerData = sellerDoc.data();
    
    // Verificar que el vendedor pertenezca a este dealer
    if (sellerData?.dealerId !== auth.tenantId && sellerData?.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'No tienes acceso a este vendedor' }, { status: 403 });
    }

    // Determinar el tenantId del vendedor (puede ser su propio tenant o el del dealer)
    const sellerTenantId = sellerData?.tenantId || auth.tenantId;

    // Obtener leads del vendedor
    const allLeads = await getLeads(sellerTenantId);
    const sellerLeads = allLeads.filter(lead => lead.assignedTo === sellerId);

    // Obtener ventas del vendedor
    const allSales = await getTenantSales(sellerTenantId);
    const sellerSales = allSales.filter(sale => sale.sellerId === sellerId);

    // Obtener citas del vendedor
    const allAppointments = await getAppointments(sellerTenantId);
    const sellerAppointments = allAppointments.filter(apt => apt.assignedTo === sellerId);

    // Obtener inventario del vendedor
    const allVehicles = await getVehicles(sellerTenantId);
    const sellerVehicles = allVehicles; // Todos los vehículos del tenant del vendedor

    // Obtener campañas del vendedor
    const allCampaigns = await getCampaigns(sellerTenantId);
    const activeCampaigns = allCampaigns.filter(c => c.status === 'active' || c.status === 'scheduled');
    const pastCampaigns = allCampaigns.filter(c => c.status === 'completed' || c.status === 'cancelled');

    // Obtener promociones del vendedor
    const allPromotions = await getPromotions(sellerTenantId);
    const activePromotions = allPromotions.filter(p => p.status === 'active' || p.status === 'scheduled');
    const pastPromotions = allPromotions.filter(p => p.status === 'expired' || p.status === 'paused');

    // Calcular estadísticas
    const completedSales = sellerSales.filter(s => s.status === 'completed');
    const totalRevenue = completedSales.reduce((sum, sale) => sum + (sale.salePrice || sale.total || 0), 0);
    const activeLeads = sellerLeads.filter(l => l.status === 'new' || l.status === 'contacted' || l.status === 'qualified').length;
    const upcomingAppointments = sellerAppointments.filter(apt => {
      const aptDate = apt.scheduledAt instanceof Date ? apt.scheduledAt : new Date(apt.scheduledAt);
      return aptDate >= new Date() && apt.status !== 'cancelled';
    }).length;
    const availableVehicles = sellerVehicles.filter(v => v.status === 'available').length;
    const soldVehicles = sellerVehicles.filter(v => v.status === 'sold').length;

    return NextResponse.json({
      seller: {
        id: sellerDoc.id,
        name: sellerData.name,
        email: sellerData.email,
        phone: sellerData.phone,
        status: sellerData.status || 'active',
        tenantId: sellerData.tenantId,
        dealerId: sellerData.dealerId,
        createdAt: sellerData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      },
      stats: {
        totalLeads: sellerLeads.length,
        activeLeads,
        totalSales: sellerSales.length,
        completedSales: completedSales.length,
        totalRevenue,
        totalAppointments: sellerAppointments.length,
        upcomingAppointments,
        totalVehicles: sellerVehicles.length,
        availableVehicles,
        soldVehicles,
        totalCampaigns: allCampaigns.length,
        activeCampaigns: activeCampaigns.length,
        pastCampaigns: pastCampaigns.length,
        totalPromotions: allPromotions.length,
        activePromotions: activePromotions.length,
        pastPromotions: pastPromotions.length,
      },
      leads: sellerLeads.slice(0, 10), // Últimos 10 leads
      sales: sellerSales.slice(0, 10), // Últimas 10 ventas
      appointments: sellerAppointments.slice(0, 10), // Próximas 10 citas
      vehicles: sellerVehicles.slice(0, 10), // Últimos 10 vehículos
    });
  } catch (error: any) {
    console.error('Error fetching seller details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Actualiza información del vendedor
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sellerId } = await params;
    const body = await request.json();
    const db = getFirestore();

    // Verificar que el vendedor pertenezca a este dealer
    const sellerDoc = await db.collection('users').doc(sellerId).get();
    if (!sellerDoc.exists) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }

    const sellerData = sellerDoc.data();
    if (sellerData?.dealerId !== auth.tenantId && sellerData?.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'No tienes acceso a este vendedor' }, { status: 403 });
    }

    // Actualizar solo campos permitidos
    const updates: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.status !== undefined) updates.status = body.status;

    await db.collection('users').doc(sellerId).update(updates);

    // Si se cambia el status, también actualizar en Firebase Auth
    if (body.status === 'suspended' || body.status === 'cancelled') {
      const { getAuth } = await import('@autodealers/core');
      const authInstance = getAuth();
      await authInstance.updateUser(sellerId, { disabled: true });
    } else if (body.status === 'active') {
      const { getAuth } = await import('@autodealers/core');
      const authInstance = getAuth();
      await authInstance.updateUser(sellerId, { disabled: false });
    }

    return NextResponse.json({ success: true, message: 'Vendedor actualizado correctamente' });
  } catch (error: any) {
    console.error('Error updating seller:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

