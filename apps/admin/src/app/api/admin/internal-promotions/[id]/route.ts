import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();
const ADMIN_INTERNAL_TENANT_ID = 'system';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await db
      .collection('tenants')
      .doc(ADMIN_INTERNAL_TENANT_ID)
      .collection('promotions')
      .doc(id)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting internal promotion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: any = {
      ...body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Convertir fechas si existen
    if (body.startDate) updateData.startDate = admin.firestore.Timestamp.fromDate(new Date(body.startDate));
    if (body.endDate) updateData.endDate = admin.firestore.Timestamp.fromDate(new Date(body.endDate));
    if (body.expiresAt) updateData.expiresAt = admin.firestore.Timestamp.fromDate(new Date(body.expiresAt));

    await db
      .collection('tenants')
      .doc(ADMIN_INTERNAL_TENANT_ID)
      .collection('promotions')
      .doc(id)
      .update(updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating internal promotion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


