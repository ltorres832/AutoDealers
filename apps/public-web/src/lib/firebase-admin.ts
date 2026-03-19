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
      // Intentar cargar credenciales del entorno
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'autodealers-7f62e';
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (projectId && clientEmail && privateKey) {
        console.log('📄 Initializing Firebase Admin with service account for project:', projectId);
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        // En Google Cloud (App Hosting), esto detectará las Application Default Credentials (ADC) automáticamente
        console.log('☁️ Initializing Firebase Admin using App Hosting Environment (ADC)');
        admin.initializeApp({
          projectId: projectId,
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


