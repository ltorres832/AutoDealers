// Sistema de respuestas automáticas

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface AutoResponse {
  id: string;
  tenantId: string;
  name: string;
  trigger: {
    type: 'keyword' | 'question' | 'always';
    keywords?: string[];
    question?: string;
  };
  response: string;
  channels: ('whatsapp' | 'facebook' | 'instagram' | 'email' | 'sms')[];
  isActive: boolean;
  priority: number; // Mayor prioridad = se evalúa primero
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea una respuesta automática
 */
export async function createAutoResponse(
  response: Omit<AutoResponse, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AutoResponse> {
  const docRef = db
    .collection('tenants')
    .doc(response.tenantId)
    .collection('auto_responses')
    .doc();

  await docRef.set({
    ...response,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    id: docRef.id,
    ...response,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene respuestas automáticas activas
 */
export async function getActiveAutoResponses(
  tenantId: string
): Promise<AutoResponse[]> {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('auto_responses')
    .where('isActive', '==', true)
    .orderBy('priority', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as AutoResponse;
  });
}

/**
 * Encuentra respuesta automática para un mensaje
 */
export async function findAutoResponse(
  tenantId: string,
  message: string,
  channel: string
): Promise<AutoResponse | null> {
  const responses = await getActiveAutoResponses(tenantId);

  // Filtrar por canal
  const channelResponses = responses.filter((r) =>
    r.channels.includes(channel as any)
  );

  const messageLower = message.toLowerCase();

  // Buscar por prioridad
  for (const response of channelResponses) {
    if (response.trigger.type === 'always') {
      return response;
    }

    if (response.trigger.type === 'keyword' && response.trigger.keywords) {
      const hasKeyword = response.trigger.keywords.some((keyword) =>
        messageLower.includes(keyword.toLowerCase())
      );
      if (hasKeyword) {
        return response;
      }
    }

    if (response.trigger.type === 'question' && response.trigger.question) {
      // Comparación simple (se puede mejorar con IA)
      if (
        messageLower.includes(response.trigger.question.toLowerCase()) ||
        response.trigger.question.toLowerCase().includes(messageLower)
      ) {
        return response;
      }
    }
  }

  return null;
}





