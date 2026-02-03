import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Inicializar Firebase Admin directamente para evitar dependencias de @autodealers/core
function getFirestore() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error: any) {
      // Si ya está inicializado, obtener la instancia existente
      if (error.code === 'app/duplicate-app') {
        return admin.firestore();
      }
      throw error;
    }
  }
  return admin.firestore();
}

export async function GET(request: NextRequest) {
  try {
    const db = getFirestore();
    
    // Obtener tenants directamente desde Firestore sin usar @autodealers/core
    // para evitar dependencias de billing
    const snapshot = await db
      .collection('tenants')
      .where('status', '==', 'active')
      .get();
    
    const activeTenants = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        // Solo incluir si tiene subdomain
        if (!data.subdomain) return null;
        
        return {
          id: doc.id,
          name: data.name,
          subdomain: data.subdomain,
          type: data.type,
        };
      })
      .filter(Boolean); // Filtrar nulls

    return NextResponse.json({ tenants: activeTenants });
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

