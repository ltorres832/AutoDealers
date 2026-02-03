import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTenantById, updateTenant } from '@autodealers/core';
import { uploadFile } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getTenantById(auth.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({
      logo: tenant.branding?.logo || '',
      favicon: tenant.branding?.favicon || '',
      subdomain: tenant.subdomain || '',
    });
  } catch (error) {
    console.error('Error fetching branding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const logoFile = formData.get('logo') as File | null;
    const faviconFile = formData.get('favicon') as File | null;

    const tenant = await getTenantById(auth.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const brandingUpdates: { logo?: string; favicon?: string } = {};

    // Subir logo si se proporciona
    if (logoFile) {
      const logoBuffer = Buffer.from(await logoFile.arrayBuffer());
      const logoUrl = await uploadFile(
        auth.tenantId,
        logoBuffer,
        `logo.${logoFile.name.split('.').pop()}`,
        logoFile.type,
        'branding'
      );
      brandingUpdates.logo = logoUrl;
    }

    // Subir favicon si se proporciona
    if (faviconFile) {
      const faviconBuffer = Buffer.from(await faviconFile.arrayBuffer());
      const faviconUrl = await uploadFile(
        auth.tenantId,
        faviconBuffer,
        `favicon.${faviconFile.name.split('.').pop()}`,
        faviconFile.type,
        'branding'
      );
      brandingUpdates.favicon = faviconUrl;
    }

    // Actualizar tenant
    await updateTenant(auth.tenantId, {
      branding: {
        ...tenant.branding,
        ...brandingUpdates,
      },
    });

    return NextResponse.json({
      success: true,
      ...brandingUpdates,
    });
  } catch (error) {
    console.error('Error updating branding:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}



