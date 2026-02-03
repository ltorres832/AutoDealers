import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Inicializar Firebase Admin directamente
let db: admin.firestore.Firestore;

function getFirestore() {
  if (!db) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    db = admin.firestore();
  }
  return db;
}

/**
 * Obtiene todas las membresías activas para mostrar en el landing page
 * Filtra por tipo (dealer/seller) si se proporciona
 */
export async function GET(request: Request) {
  try {
    const dbInstance = getFirestore();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'dealer' | 'seller' | null;

    let query: admin.firestore.Query = dbInstance
      .collection('memberships')
      .where('isActive', '==', true);

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return NextResponse.json({ memberships: [] });
    }

    const memberships = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        price: data.price,
        currency: data.currency || 'USD',
        billingCycle: data.billingCycle || 'monthly',
        features: data.features || {},
        stripePriceId: data.stripePriceId || null,
      };
    });

    // Ordenar por precio ascendente
    memberships.sort((a, b) => a.price - b.price);

    return NextResponse.json({ memberships });
  } catch (error: any) {
    console.error('Error obteniendo membresías:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener membresías',
        details: error.message,
        memberships: [], // Retornar array vacío en caso de error
      },
      { status: 500 }
    );
  }
}
