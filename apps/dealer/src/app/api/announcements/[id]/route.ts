import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

function getDb() {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firestore no está inicializado');
  }
  return db;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: announcementId } = await params;
    const db = getDb();
    const announcementDoc = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('announcements')
      .doc(announcementId)
      .get();

    if (!announcementDoc.exists) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const data = announcementDoc.data();
    const announcement = {
      id: announcementDoc.id,
      ...data,
      startDate: data?.startDate?.toDate(),
      endDate: data?.endDate?.toDate(),
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      dismissedBy: data?.dismissedBy || [],
    };

    return NextResponse.json({ announcement });
  } catch (error: any) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: announcementId } = await params;
    const body = await request.json();
    const db = getDb();
    const announcementRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('announcements')
      .doc(announcementId);

    const updateData: any = {
      ...body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Eliminar campos que no deben actualizarse
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;
    delete updateData.tenantId;

    // Convertir fechas si existen
    if (updateData.startDate) {
      updateData.startDate = admin.firestore.Timestamp.fromDate(new Date(updateData.startDate));
    }
    if (updateData.endDate) {
      updateData.endDate = admin.firestore.Timestamp.fromDate(new Date(updateData.endDate));
    }

    await announcementRef.update(updateData);

    const updated = await announcementRef.get();
    const data = updated.data();
    const announcement = {
      id: updated.id,
      ...data,
      startDate: data?.startDate?.toDate(),
      endDate: data?.endDate?.toDate(),
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      dismissedBy: data?.dismissedBy || [],
    };

    return NextResponse.json({ announcement });
  } catch (error: any) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: announcementId } = await params;
    const db = getDb();
    await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('announcements')
      .doc(announcementId)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

