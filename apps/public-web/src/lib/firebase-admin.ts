import {
  getFirestore as sharedGetFirestore,
  getAuth as sharedGetAuth,
} from '@autodealers/shared/firebase-server';
import * as admin from 'firebase-admin';

/**
 * Inicializa Firebase Admin y retorna Firestore
 * Usa la implementación compartida para consistencia en todo el monorepo
 */
export function getFirestore(): admin.firestore.Firestore {
  return sharedGetFirestore();
}

/**
 * Inicializa Firebase Admin y retorna Auth
 */
export function getAuth(): admin.auth.Auth {
  return sharedGetAuth();
}


/**
 * Obtiene un tenant por subdomain
 */
export async function getTenantBySubdomain(subdomain: string) {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection('tenants')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    if (data.status !== 'active') {
      return null;
    }

    return {
      id: doc.id,
      ...data,
    };
  } catch (error) {
    console.error('Error in getTenantBySubdomain:', error);
    return null;
  }
}


