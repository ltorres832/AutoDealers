import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getInternalConversations } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

// Lazy initialization para evitar dependencias circulares
function getDb() {
  return getFirestore();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    
    // Obtener información del usuario para determinar tenantIds relevantes
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

    // Si el seller tiene dealerId, buscar conversaciones en ambos tenants
    const tenantIdsToSearch = [auth.tenantId];
    if (userData?.dealerId && userData.dealerId !== auth.tenantId) {
      tenantIdsToSearch.push(userData.dealerId);
    }

    // Logging reducido - solo en desarrollo y solo ocasionalmente
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      console.log('🔍 Buscando conversaciones');
    }

    // Buscar conversaciones en todos los tenants relevantes
    const allConversations: any[] = [];
    for (const tenantId of tenantIdsToSearch) {
      if (!tenantId) continue;
      try {
        const conversations = await getInternalConversations(tenantId, auth.userId);
        allConversations.push(...conversations);
      } catch (error: any) {
        console.warn(`⚠️ Error obteniendo conversaciones del tenant ${tenantId || 'unknown'}:`, error.message);
      }
    }

    // Obtener información actualizada de todos los usuarios involucrados
    const userIds = new Set<string>();
    for (const conv of allConversations) {
      userIds.add(conv.otherUserId);
    }

    // Obtener información de usuarios desde la base de datos
    const usersMap = new Map<string, { id: string; name: string; email: string; role: string }>();
    for (const userId of userIds) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          usersMap.set(userId, {
            id: userId,
            name: userData?.name || userData?.email || 'Usuario',
            email: userData?.email || '',
            role: userData?.role || '',
          });
        }
      } catch (error) {
        console.warn(`⚠️ Error obteniendo información del usuario ${userId}:`, error);
      }
    }

    // Consolidar conversaciones por otherUserId (eliminar duplicados y mantener la más reciente)
    // Y actualizar los nombres con información de la base de datos
    const conversationsMap = new Map<string, any>();
    for (const conv of allConversations) {
      const userInfo = usersMap.get(conv.otherUserId);
      const updatedConv = {
        ...conv,
        otherUserName: userInfo?.name || conv.otherUserName || 'Usuario',
      };

      const existing = conversationsMap.get(conv.otherUserId);
      if (!existing || 
          (updatedConv.lastMessage && existing.lastMessage && 
           updatedConv.lastMessage.createdAt > existing.lastMessage.createdAt)) {
        conversationsMap.set(conv.otherUserId, updatedConv);
      } else if (updatedConv.unreadCount > 0) {
        // Si hay mensajes no leídos, sumar los contadores
        existing.unreadCount = (existing.unreadCount || 0) + updatedConv.unreadCount;
      }
    }

    // Obtener tenantId de cada usuario para filtrar correctamente
    const userTenantMap = new Map<string, string>();
    for (const userId of userIds) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userDocData = userDoc.data();
          userTenantMap.set(userId, userDocData?.tenantId || '');
        }
      } catch (error) {
        console.warn(`⚠️ Error obteniendo tenantId del usuario ${userId}:`, error);
      }
    }

    // Filtrar conversaciones: mostrar todas las conversaciones que tienen mensajes
    // Solo excluir el propio usuario
    const filteredConversations: any[] = [];
    for (const conv of Array.from(conversationsMap.values())) {
      // Excluir el propio usuario
      if (conv.otherUserId === auth.userId) continue;
      
      // Si hay información del usuario, usarla para validar
      const userInfo = usersMap.get(conv.otherUserId);
      
      // Si no hay información del usuario pero hay mensajes, incluir la conversación de todos modos
      if (!userInfo) {
        // Incluir conversaciones aunque no tengamos info del usuario (puede ser un usuario eliminado o de otro tenant)
        filteredConversations.push(conv);
        continue;
      }
      
      // Permitir conversaciones con el dealer
      if (userData?.dealerId && userInfo.id === userData.dealerId) {
        filteredConversations.push(conv);
        continue;
      }
      
      // Permitir conversaciones con otros sellers del mismo tenant o del tenant del dealer
      if (userInfo.role === 'seller') {
        const otherUserTenantId = userTenantMap.get(conv.otherUserId);
        if (otherUserTenantId === auth.tenantId || otherUserTenantId === userData?.dealerId) {
          filteredConversations.push(conv);
          continue;
        }
      }
      
      // Permitir conversaciones con otros roles (F&I, manager, etc.) del mismo tenant
      const otherUserTenantId = userTenantMap.get(conv.otherUserId);
      if (otherUserTenantId === auth.tenantId || otherUserTenantId === userData?.dealerId) {
        filteredConversations.push(conv);
        continue;
      }
      
      // Si no se cumplió ninguna condición pero hay mensajes, incluir de todos modos
      // (esto asegura que las conversaciones activas siempre se muestren)
      if (conv.lastMessage) {
        filteredConversations.push(conv);
      }
    }

    const conversations = filteredConversations;

    // Logging reducido

    return NextResponse.json({
      conversations: conversations.map((conv) => {
        // Convertir lastMessage a string si es un objeto
        let lastMessageStr: string | null = null;
        let lastMessageTime: Date | null = null;
        
        if (conv.lastMessage) {
          if (typeof conv.lastMessage === 'string') {
            lastMessageStr = conv.lastMessage;
          } else if (conv.lastMessage.content) {
            lastMessageStr = conv.lastMessage.content;
            lastMessageTime = conv.lastMessage.createdAt instanceof Date 
              ? conv.lastMessage.createdAt 
              : (conv.lastMessage.createdAt?.toDate ? conv.lastMessage.createdAt.toDate() : new Date());
          } else if (typeof conv.lastMessage === 'object') {
            // Si es un objeto, intentar obtener el contenido
            lastMessageStr = (conv.lastMessage as any).content || (conv.lastMessage as any).text || 'Mensaje';
            lastMessageTime = (conv.lastMessage as any).createdAt instanceof Date 
              ? (conv.lastMessage as any).createdAt 
              : ((conv.lastMessage as any).createdAt?.toDate ? (conv.lastMessage as any).createdAt.toDate() : new Date());
          }
        }
        
        return {
          userId: conv.otherUserId,
          userName: conv.otherUserName || 'Usuario',
          otherUserId: conv.otherUserId,
          otherUserName: conv.otherUserName || 'Usuario',
          lastMessage: lastMessageStr,
          lastMessageTime: lastMessageTime ? lastMessageTime.toISOString() : null,
          unreadCount: conv.unreadCount || 0,
          createdAt: conv.createdAt instanceof Date 
            ? conv.createdAt.toISOString() 
            : (conv.createdAt?.toISOString ? conv.createdAt.toISOString() : new Date().toISOString()),
        };
      }),
    });
  } catch (error: any) {
    console.error('❌ Error fetching conversations (seller):', error.message || error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}



