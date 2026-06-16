import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, PLATFORM_ADMIN_TENANT_ID } from '@autodealers/core';
import * as admin from 'firebase-admin';

function resolveNotificationTenantId(auth: { tenantId?: string; role?: string }) {
  return auth.tenantId || (auth.role === 'admin' ? PLATFORM_ADMIN_TENANT_ID : undefined);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = getFirestore();
    const tenantId = resolveNotificationTenantId(auth);

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    await db.collection('tenants').doc(tenantId).collection('notifications').doc(id).update({
      read: true,
      readAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


