// Sistema de preguntas frecuentes automáticas

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface FAQ {
  id: string;
  tenantId: string;
  question: string;
  answer: string;
  category?: string;
  keywords: string[]; // Palabras clave para matching
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea una FAQ
 */
export async function createFAQ(
  faq: Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FAQ> {
  const docRef = db
    .collection('tenants')
    .doc(faq.tenantId)
    .collection('faqs')
    .doc();

  await docRef.set({
    ...faq,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    id: docRef.id,
    ...faq,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene FAQs activas
 */
export async function getActiveFAQs(tenantId: string): Promise<FAQ[]> {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('faqs')
    .where('isActive', '==', true)
    .orderBy('order', 'asc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as FAQ;
  });
}

/**
 * Busca FAQ por pregunta o keywords
 */
export async function findFAQ(
  tenantId: string,
  query: string
): Promise<FAQ | null> {
  const faqs = await getActiveFAQs(tenantId);
  const queryLower = query.toLowerCase();

  // Buscar por pregunta exacta
  for (const faq of faqs) {
    if (faq.question.toLowerCase().includes(queryLower)) {
      return faq;
    }
  }

  // Buscar por keywords
  for (const faq of faqs) {
    const hasKeyword = faq.keywords.some((keyword) =>
      queryLower.includes(keyword.toLowerCase())
    );
    if (hasKeyword) {
      return faq;
    }
  }

  return null;
}





