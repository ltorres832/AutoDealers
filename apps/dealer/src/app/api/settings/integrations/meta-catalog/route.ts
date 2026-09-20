/**
 * Catálogo de vehículos de Meta del tenant:
 * GET  → estado (activado, product_count, última sincronización)
 * POST → { action: 'enable' | 'sync' | 'disable' | 'create_campaign' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTenantById } from '@autodealers/core';
import {
  ensureTenantVehicleCatalog,
  requestVehicleFeedSync,
  disableTenantVehicleCatalog,
  getVehicleCatalogStatus,
  createVehicleCatalogCampaign,
} from '@autodealers/core/meta-vehicle-catalog';
import { buildTenantSiteUrl, buildPublicWebUrl } from '@autodealers/shared/platform-urls';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const status = await getVehicleCatalogStatus(auth.tenantId);
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Error fetching Meta catalog status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'enable') {
      const tenant = await getTenantById(auth.tenantId);
      if (!tenant) {
        return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
      }
      const result = await ensureTenantVehicleCatalog({
        tenantId: auth.tenantId,
        tenantName: tenant.name || auth.tenantId,
      });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, config: result.config });
    }

    if (action === 'sync') {
      const result = await requestVehicleFeedSync(auth.tenantId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'disable') {
      const result = await disableTenantVehicleCatalog(auth.tenantId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'create_campaign') {
      const name = String(body.name || '').trim();
      const dailyBudget = Number(body.dailyBudget);
      const durationDays = Math.floor(Number(body.durationDays) || 0);
      if (!name || !Number.isFinite(dailyBudget) || dailyBudget <= 0 || durationDays < 1) {
        return NextResponse.json(
          { error: 'Nombre, presupuesto diario y duración (días) son requeridos' },
          { status: 400 }
        );
      }
      const tenant = await getTenantById(auth.tenantId);
      const subdomain = String(tenant?.subdomain || '').trim();
      const linkUrl = subdomain
        ? buildTenantSiteUrl(subdomain)
        : buildPublicWebUrl(`/${auth.tenantId}`);

      const result = await createVehicleCatalogCampaign({
        tenantId: auth.tenantId,
        userId: auth.userId,
        name,
        dailyBudget,
        durationDays,
        countries: Array.isArray(body.countries) && body.countries.length ? body.countries : undefined,
        linkUrl,
        activate: body.activate === true,
      });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        campaignId: result.campaignId,
        adSetId: result.adSetId,
        adId: result.adId,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in Meta catalog action:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
