import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { createNotification } from '@autodealers/core';
import * as admin from 'firebase-admin';

function getDb() {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firestore no está inicializado');
  }
  return db;
}

export interface TenantAnnouncement {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  contentType: 'text' | 'image' | 'video';
  mediaUrl?: string;
  targetType: 'all' | 'selected';
  targetUserIds?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  dismissedBy?: string[];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    if (!db || typeof db.collection !== 'function') {
      console.error('❌ Firestore no está inicializado correctamente');
      return NextResponse.json(
        { error: 'Firestore no está inicializado' },
        { status: 500 }
      );
    }
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('announcements')
      .orderBy('createdAt', 'desc');

    if (activeOnly) {
      query = query.where('isActive', '==', true) as any;
    }

    const snapshot = await query.get();
    const announcements = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        dismissedBy: data.dismissedBy || [],
      };
    });

    return NextResponse.json({ announcements });
  } catch (error: any) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      content,
      contentType = 'text',
      mediaUrl,
      targetType = 'all',
      targetUserIds = [],
      priority = 'medium',
      startDate,
      endDate,
      sendNotifications = true,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'title and content are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    if (!db || typeof db.collection !== 'function') {
      console.error('❌ Firestore no está inicializado correctamente');
      return NextResponse.json(
        { error: 'Firestore no está inicializado' },
        { status: 500 }
      );
    }
    
    const announcementRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('announcements')
      .doc();

    const announcementData: any = {
      tenantId: auth.tenantId,
      title,
      content,
      contentType,
      mediaUrl: mediaUrl || null,
      targetType,
      targetUserIds: targetType === 'selected' ? targetUserIds : [],
      priority,
      isActive: true,
      dismissedBy: [],
      createdBy: auth.userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (startDate) {
      announcementData.startDate = admin.firestore.Timestamp.fromDate(new Date(startDate));
    }
    if (endDate) {
      announcementData.endDate = admin.firestore.Timestamp.fromDate(new Date(endDate));
    }

    await announcementRef.set(announcementData);

    const createdAnnouncement: TenantAnnouncement = {
      id: announcementRef.id,
      ...announcementData,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      dismissedBy: [],
    };

    // Enviar notificaciones a los destinatarios
    if (sendNotifications) {
      await sendAnnouncementNotifications(createdAnnouncement, auth.tenantId);
    }

    return NextResponse.json({ announcement: createdAnnouncement }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendAnnouncementNotifications(
  announcement: TenantAnnouncement,
  tenantId: string
): Promise<void> {
  const db = getDb();
  if (!db || typeof db.collection !== 'function') {
    console.error('❌ Firestore no está inicializado correctamente en sendAnnouncementNotifications');
    return;
  }
  
  let userIds: string[] = [];

  if (announcement.targetType === 'all') {
    // Obtener todos los usuarios del tenant (vendedores, F&I, etc.)
    const usersSnapshot = await db
      .collection('users')
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'active')
      .get();

    userIds = usersSnapshot.docs.map((doc) => doc.id);

    // También obtener sub_users
    const subUsersSnapshot = await db
      .collection('sub_users')
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'active')
      .get();

    userIds.push(...subUsersSnapshot.docs.map((doc) => doc.id));
  } else if (announcement.targetType === 'selected' && announcement.targetUserIds) {
    userIds = announcement.targetUserIds;
  }

  // Eliminar duplicados
  userIds = Array.from(new Set(userIds));

  // Enviar notificación a cada usuario
  for (const userId of userIds) {
    try {
      await createNotification({
        tenantId,
        userId,
        type: 'announcement' as any,
        title: announcement.title,
        message: announcement.content.length > 200 
          ? announcement.content.substring(0, 200) + '...' 
          : announcement.content,
        channels: ['system'],
        metadata: {
          announcementId: announcement.id,
          contentType: announcement.contentType,
          mediaUrl: announcement.mediaUrl,
          priority: announcement.priority,
        },
      });
    } catch (error) {
      console.warn(`Error sending notification to user ${userId}:`, error);
    }
  }
}

