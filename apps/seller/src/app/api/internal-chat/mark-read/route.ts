import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { markInternalMessagesAsRead } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

// Lazy initialization para evitar dependencias circulares
function getDb() {
  return getFirestore();
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getDb();
    
    // Obtener información del usuario para determinar tenantIds relevantes
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

    // Obtener información del otro usuario
    const otherUserDoc = await db.collection('users').doc(userId).get();
    const otherUserData = otherUserDoc.data();

    // Determinar el tenantId correcto
    let tenantIdsToMark = [auth.tenantId];
    
    if (userData?.dealerId && otherUserData?.tenantId === userData.dealerId) {
      // El seller está marcando mensajes de su dealer
      tenantIdsToMark = [userData.dealerId];
    } else if (otherUserData?.tenantId && otherUserData.tenantId !== auth.tenantId) {
      // Los usuarios tienen diferentes tenantIds, marcar en ambos
      tenantIdsToMark = [auth.tenantId, otherUserData.tenantId];
    }

    // Marcar como leído en todos los tenants relevantes
    for (const tenantId of tenantIdsToMark) {
      if (!tenantId) continue;
      try {
        await markInternalMessagesAsRead(tenantId, userId, auth.userId);
      } catch (error: any) {
        console.warn(`⚠️ Error marcando mensajes como leídos en tenant ${tenantId || 'unknown'}:`, error.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error marking messages as read:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}



