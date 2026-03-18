// Helper compartido para inicializar Firebase Admin
import * as admin from 'firebase-admin';

let firestoreInstance: admin.firestore.Firestore | null = null;
let initializationError: Error | null = null;

/**
 * Inicializa Firebase Admin y retorna Firestore
 * Lanza un error descriptivo si las credenciales no están configuradas
 */
export function getFirestore(): admin.firestore.Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  if (initializationError) {
    throw initializationError;
  }

  if (!admin.apps.length) {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        console.log('✅ Firebase Admin initialized with service account certificate');
      } else {
        // Fallback to Application Default Credentials (ADC) in Google Cloud environment
        console.log('ℹ️ Firebase Admin: Missing credentials, using Application Default Credentials (ADC)');
        admin.initializeApp({
          projectId: projectId || 'autodealers-7f62e',
        });
      }

      console.log('✅ Firebase Admin initialized successfully');
      firestoreInstance = admin.firestore();
      return firestoreInstance;
    } catch (error: any) {
      if (error.code === 'app/duplicate-app') {
        firestoreInstance = admin.firestore();
        return firestoreInstance;
      }
      console.error('❌ Firebase Admin initialization error:', error.message);
      initializationError = error;
      throw error;
    }
  }

  firestoreInstance = admin.firestore();
  return firestoreInstance;
}

/**
 * Inicializa Firebase Admin y retorna Auth
 */
export function getAuth(): admin.auth.Auth {
  if (!admin.apps.length) {
    getFirestore(); // Inicializa si no está hecho
  }
  return admin.auth();
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


