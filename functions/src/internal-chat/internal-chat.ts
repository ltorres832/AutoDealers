// Cloud Functions para Internal Chat
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Obtener usuarios para chat interno
export const getInternalChatUsers = onCall(async (request) => {
  const { tenantId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const users: any[] = [];

    // Obtener usuarios de diferentes roles
    const rolesToFetch = ['seller', 'fi_manager', 'manager', 'dealer_admin'];
    
    for (const role of rolesToFetch) {
      try {
        const snapshot = await db
          .collection('users')
          .where('tenantId', '==', tenantId)
          .where('role', '==', role)
          .get();

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id !== auth.uid && (data.status === 'active' || !data.status)) {
            if (!users.find((u) => u.id === doc.id || u.email === data.email)) {
              users.push({
                id: doc.id,
                name: data.name || data.email,
                email: data.email,
                role: data.role || role,
                status: data.status || 'active',
                tenantId: data.tenantId || tenantId,
              });
            }
          }
        });
      } catch (error) {
        console.warn(`Error obteniendo usuarios con rol ${role}:`, error);
      }
    }

    // Eliminar duplicados
    const uniqueUsers = Array.from(
      new Map(users.map((u: any) => [u.id || u.email, u])).values()
    );

    // Ordenar por nombre
    uniqueUsers.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return { users: uniqueUsers };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener usuarios: ${error.message}`);
  }
});

// Enviar mensaje interno
export const sendInternalMessage = onCall(async (request) => {
  const { tenantId, toUserId, message, type } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !toUserId || !message) {
    throw new HttpsError('invalid-argument', 'tenantId, toUserId y message son requeridos');
  }

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('internal_messages')
      .doc();

    await docRef.set({
      fromUserId: auth.uid,
      toUserId,
      message,
      type: type || 'text',
      read: false,
      createdAt: new Date(),
    });

    return { id: docRef.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al enviar mensaje: ${error.message}`);
  }
});

// Obtener conversación
export const getConversation = onCall(async (request) => {
  const { tenantId, otherUserId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !otherUserId) {
    throw new HttpsError('invalid-argument', 'tenantId y otherUserId son requeridos');
  }

  try {
    // Obtener mensajes donde el usuario actual es remitente o destinatario
    const sentMessages = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('internal_messages')
      .where('fromUserId', '==', auth.uid)
      .where('toUserId', '==', otherUserId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const receivedMessages = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('internal_messages')
      .where('fromUserId', '==', otherUserId)
      .where('toUserId', '==', auth.uid)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const allMessages = [
      ...sentMessages.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })),
      ...receivedMessages.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })),
    ];

    // Ordenar por fecha
    allMessages.sort((a, b) => {
      const dateA = a.createdAt?.millisecondsSinceEpoch || 0;
      const dateB = b.createdAt?.millisecondsSinceEpoch || 0;
      return dateA.compareTo(dateB);
    });

    return { messages: allMessages };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener conversación: ${error.message}`);
  }
});

// Marcar mensajes como leídos
export const markMessagesAsRead = onCall(async (request) => {
  const { tenantId, fromUserId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !fromUserId) {
    throw new HttpsError('invalid-argument', 'tenantId y fromUserId son requeridos');
  }

  try {
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('internal_messages')
      .where('fromUserId', '==', fromUserId)
      .where('toUserId', '==', auth.uid)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true, readAt: new Date() });
    });

    await batch.commit();

    return { success: true, count: snapshot.size };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al marcar mensajes como leídos: ${error.message}`);
  }
});


