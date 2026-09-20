import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getLeads } from '@autodealers/crm';
import { getTenantSales } from '@autodealers/crm';
import { getAppointments } from '@autodealers/crm';
import { getVehicles } from '@autodealers/inventory';
import { getCampaigns } from '@autodealers/core';
import { getPromotions } from '@autodealers/core';
import { getScheduledPosts } from '@autodealers/core';
import {
  normalizePromoVideoUrls,
  sellerPromoVideoFields,
} from '@autodealers/shared/promo-video-urls';
import { countSellerInventory, getSellerUsage } from '@autodealers/core';
import { stripWhatsAppPlatforms } from '@/lib/seller-network-activity';

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
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
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

    // Inventario del vendedor (por sellerId, no todo el tenant)
    const allVehicles = await getVehicles(sellerTenantId);
    const sellerVehicles = allVehicles.filter(
      (v) =>
        (v as { sellerId?: string }).sellerId === sellerId ||
        (v as { assignedTo?: string }).assignedTo === sellerId
    );
    const sellerUsage = await getSellerUsage(auth.tenantId, sellerId, sellerTenantId);
    const sellerInventoryCount = await countSellerInventory(
      auth.tenantId,
      sellerId,
      sellerTenantId
    );

    // Campañas y promociones del vendedor
    const allCampaigns = await getCampaigns(sellerTenantId);
    const sellerCampaigns = allCampaigns.filter(
      (c) => (c as { createdBy?: string }).createdBy === sellerId
    );
    const activeCampaigns = sellerCampaigns.filter(
      (c) => c.status === 'active' || c.status === 'scheduled'
    );
    const pastCampaigns = sellerCampaigns.filter(
      (c) => c.status === 'completed' || c.status === 'cancelled'
    );

    const allPromotions = await getPromotions(sellerTenantId);
    const sellerPromotions = allPromotions.filter(
      (p) => (p as { createdBy?: string }).createdBy === sellerId
    );
    const activePromotions = sellerPromotions.filter(
      (p) => p.status === 'active' || p.status === 'scheduled'
    );
    const pastPromotions = sellerPromotions.filter(
      (p) => p.status === 'expired' || p.status === 'paused'
    );

    let socialPosts: any[] = [];
    try {
      socialPosts = await getScheduledPosts(sellerTenantId, sellerId);
      socialPosts = socialPosts.map((p) => ({
        id: p.id,
        content: p.content,
        platforms: stripWhatsAppPlatforms(p.platforms),
        status: p.status,
        scheduledFor: p.scheduledFor instanceof Date ? p.scheduledFor.toISOString() : p.scheduledFor,
        publishedAt: p.publishedAt instanceof Date ? p.publishedAt.toISOString() : p.publishedAt,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      }));
    } catch (e) {
      console.warn('seller social posts', e);
    }

    const campaignsPayload = sellerCampaigns.slice(0, 15).map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      platforms: stripWhatsAppPlatforms(c.platforms),
      startDate: (c as any).startedAt instanceof Date
        ? (c as any).startedAt.toISOString()
        : (c as any).startedAt || (c as any).startDate,
      endDate: (c as any).endedAt instanceof Date
        ? (c as any).endedAt.toISOString()
        : (c as any).endedAt || (c as any).endDate,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    }));

    const promotionsPayload = sellerPromotions.slice(0, 15).map((p) => ({
      id: p.id,
      name: (p as any).name || (p as any).title,
      status: p.status,
      startDate: p.startDate instanceof Date ? p.startDate.toISOString() : p.startDate,
      endDate: p.endDate instanceof Date ? p.endDate.toISOString() : p.endDate,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    }));

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
        publicPromoVideoUrls: normalizePromoVideoUrls(
          sellerData.publicPromoVideoUrls,
          sellerData.publicPromoVideoUrl
        ),
        publicPromoVideoUrl:
          normalizePromoVideoUrls(sellerData.publicPromoVideoUrls, sellerData.publicPromoVideoUrl)[0] ||
          '',
        departmentTemplate: sellerData.departmentTemplate || null,
        modulePermissions: sellerData.modulePermissions || {},
        permissions: sellerData.permissions || {},
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
        totalVehicles: sellerInventoryCount,
        availableVehicles,
        soldVehicles,
        totalCampaigns: sellerCampaigns.length,
        activeCampaigns: activeCampaigns.length,
        pastCampaigns: pastCampaigns.length,
        totalPromotions: sellerPromotions.length,
        activePromotions: activePromotions.length,
        pastPromotions: pastPromotions.length,
        totalSocialPosts: socialPosts.length,
        scheduledSocialPosts: socialPosts.filter((p) => p.status === 'scheduled').length,
        publishedSocialPosts: socialPosts.filter((p) => p.status === 'published').length,
      },
      usage: sellerUsage,
      leads: sellerLeads.slice(0, 10),
      sales: sellerSales.slice(0, 10),
      appointments: sellerAppointments.slice(0, 10),
      vehicles: sellerVehicles.slice(0, 10),
      campaigns: campaignsPayload,
      promotions: promotionsPayload,
      socialPosts: socialPosts.slice(0, 15),
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
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
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
    if (body.departmentTemplate !== undefined) {
      updates.departmentTemplate = body.departmentTemplate || null;
    }
    if (body.modulePermissions !== undefined && typeof body.modulePermissions === 'object') {
      updates.modulePermissions = body.modulePermissions;
    }
    if (body.publicPromoVideoUrls !== undefined || body.publicPromoVideoUrl !== undefined) {
      const urls = normalizePromoVideoUrls(body.publicPromoVideoUrls, body.publicPromoVideoUrl);
      Object.assign(updates, sellerPromoVideoFields(urls));
    }

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

