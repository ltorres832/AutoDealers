export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Solo admin puede acceder a notificaciones globales
    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    // Intentar obtener notificaciones con orderBy
    try {
      let query = db
        .collection('notifications')
        .where('userId', '==', auth.userId);

      if (unreadOnly) {
        query = query.where('read', '==', false);
      }

      query = query.orderBy('createdAt', 'desc').limit(limit);

      const notificationsSnapshot = await query.get();

      const notifications = notificationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }));

      return NextResponse.json({ notifications });
    } catch (queryError: any) {
      // Si el error es por índice faltante, obtener sin orderBy
      if (queryError.code === 9 || queryError.message?.includes('index')) {
        console.warn('⚠️ Índice faltante en Firestore para notificaciones. Obteniendo sin orderBy...');
        
        let query = db
          .collection('notifications')
          .where('userId', '==', auth.userId);

        if (unreadOnly) {
          query = query.where('read', '==', false);
        }

        query = query.limit(limit);

        const notificationsSnapshot = await query.get();

        const notifications = notificationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }));

        // Ordenar manualmente por fecha
        notifications.sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return bTime - aTime; // Descendente
        });

        return NextResponse.json({ notifications });
      }
      
      // Si es otro tipo de error, relanzarlo
      throw queryError;
    }
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    // Retornar array vacío en lugar de error para no romper la UI
    return NextResponse.json({ notifications: [] });
  }
}

