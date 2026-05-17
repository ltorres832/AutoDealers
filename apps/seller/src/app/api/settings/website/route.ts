import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { deepMerge } from '@/lib/deep-merge';
import { normalizeWebsiteSettingsFromFirestore } from '@/lib/website-settings-normalize';

const db = getFirestore();

export const dynamic = 'force-dynamic';

function publicWebBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.replace(/\/$/, '') ||
    'https://autodealers-7f62e.web.app'
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [tenantDoc, userDoc] = await Promise.all([
      db.collection('tenants').doc(auth.tenantId).get(),
      db.collection('users').doc(auth.userId).get(),
    ]);

    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantData = tenantDoc.data() || {};
    const userData = userDoc.data() || {};
    const stored = (tenantData.websiteSettings as Record<string, unknown>) || {};
    const settings = normalizeWebsiteSettingsFromFirestore(stored);

    const tenantType = (tenantData.type as string) || '';
    const isIndependentSellerWorkspace = tenantType === 'seller' && !userData.dealerId;
    const subdomain = (tenantData.subdomain as string) || '';
    const catalogPath = `/seller/${auth.userId}`;
    const publicCatalogUrl = `${publicWebBaseUrl()}${catalogPath}`;

    const publicSubdomainUrl = subdomain
      ? `${publicWebBaseUrl()}/${subdomain}`
      : null;

    return NextResponse.json({
      settings,
      sellerId: auth.userId,
      subdomain,
      isIndependentSellerWorkspace,
      /** Catálogo personal del vendedor (recomendado para compartir con clientes). */
      publicCatalogUrl,
      publicCatalogPath: catalogPath,
      /** Sitio del espacio por subdominio (concesionario o vendedor independiente). */
      publicSubdomainUrl,
      publicWebBaseUrl: publicWebBaseUrl(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching website settings:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const tenantRef = db.collection('tenants').doc(auth.tenantId);
    const snap = await tenantRef.get();
    const existingWs = (snap.data()?.websiteSettings as Record<string, unknown>) || {};

    const merged = normalizeWebsiteSettingsFromFirestore(
      deepMerge(existingWs, body) as Record<string, unknown>
    );

    const patch: Record<string, unknown> = {
      websiteSettings: merged,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const userSnap = await db.collection('users').doc(auth.userId).get();
    const u = userSnap.data();
    if (u?.role === 'seller') {
      patch.sellerInfo = {
        id: auth.userId,
        name: (u.name as string) || '',
        photo: (u.photo as string) || (u.photoUrl as string) || '',
        bio: (u.bio as string) || (u.description as string) || '',
      };
      const phone = typeof u.phone === 'string' ? u.phone.trim() : '';
      const email = typeof u.email === 'string' ? u.email.trim() : '';
      if (phone) patch.contactPhone = phone;
      if (email) patch.contactEmail = email;
    }

    await tenantRef.update(patch);

    return NextResponse.json({ success: true, settings: merged });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating website settings:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
