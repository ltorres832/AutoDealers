import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

function getDb() {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firestore no está inicializado');
  }
  return db;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const now = new Date();

    // Obtener información del usuario para determinar tenantId
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();
    const tenantId = auth.tenantId || userData?.tenantId || userData?.dealerId;

    if (!tenantId) {
      return NextResponse.json({ announcements: [] });
    }

    // Obtener anuncios activos del tenant
    let query = db
      .collection('tenants')
      .doc(tenantId)
      .collection('announcements')
      .where('isActive', '==', true);

    const snapshot = await query.get();
    const announcements: any[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Verificar fechas
      if (data.startDate && data.startDate.toDate() > now) {
        return; // Aún no ha comenzado
      }

      if (data.endDate && data.endDate.toDate() < now) {
        return; // Ya terminó
      }

      // Verificar si el usuario ya lo descartó
      if (data.dismissedBy && data.dismissedBy.includes(auth.userId)) {
        return;
      }

      // Verificar destinatarios
      if (data.targetType === 'selected' && data.targetUserIds && data.targetUserIds.length > 0) {
        if (!data.targetUserIds.includes(auth.userId)) {
          return; // No aplica a este usuario
        }
      }

      announcements.push({
        id: doc.id,
        title: data.title,
        message: data.content,
        content: data.content,
        contentType: data.contentType || 'text',
        mediaUrl: data.mediaUrl,
        type: 'announcement',
        priority: data.priority || 'medium',
        showDismissButton: true,
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });

    // Ordenar por prioridad (urgent > high > medium > low)
    const priorityOrder: { [key: string]: number } = { urgent: 4, high: 3, medium: 2, low: 1 };
    announcements.sort((a: any, b: any) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

    return NextResponse.json({ announcements });
  } catch (error: any) {
    console.error('Error fetching active announcements:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener anuncios activos' },
      { status: 500 }
    );
  }
}
