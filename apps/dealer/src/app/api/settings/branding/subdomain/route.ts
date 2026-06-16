import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  canPerformAction,
  getFirestore,
  isTenantSubdomainSlugAvailable,
  validateTenantSubdomainSlug,
} from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subdomain } = body;

    const validation = await canPerformAction(auth.tenantId, 'useSubdomain');
    if (!validation.allowed) {
      return NextResponse.json(
        { error: validation.reason || 'Su membresía no incluye subdominio personalizado' },
        { status: 403 }
      );
    }

    const format = validateTenantSubdomainSlug(String(subdomain || ''));
    if (!format.ok) {
      return NextResponse.json({ error: format.error }, { status: 400 });
    }

    const available = await isTenantSubdomainSlugAvailable(format.slug, auth.tenantId);
    if (!available) {
      return NextResponse.json({ error: 'Subdomain already in use' }, { status: 400 });
    }

    await db.collection('tenants').doc(auth.tenantId).update({
      subdomain: format.slug,
      pendingSubdomain: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, subdomain: format.slug });
  } catch (error: any) {
    console.error('Error updating subdomain:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



