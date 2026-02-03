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
      
      if (!projectId || !clientEmail || !privateKey) {
        const missing = [];
        if (!projectId) missing.push('FIREBASE_PROJECT_ID');
        if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
        if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
        
        const error = new Error(
          `Firebase credentials missing: ${missing.join(', ')}. ` +
          `Please create .env.local file in apps/public-web/ with these variables. ` +
          `Run: node get-firebase-credentials.js to set it up automatically.`
        );
        initializationError = error;
        throw error;
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      
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


