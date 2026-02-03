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

export async function GET() {
  try {
    const dbInstance = getFirestore();
    
    // Intentar obtener testimonios activos ordenados
    let snapshot;
    try {
      snapshot = await dbInstance.collection('testimonials')
        .where('isActive', '==', true)
        .orderBy('order', 'asc')
        .get();
    } catch (error: any) {
      // Si falla por falta de índice, obtener todos y filtrar en memoria
      if (error.message?.includes('index')) {
        console.warn('Índice compuesto no encontrado, filtrando en memoria...');
        const allSnapshot = await dbInstance.collection('testimonials').get();
        const allTestimonials = allSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((t: any) => t.isActive === true)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        
        return NextResponse.json({
          testimonials: allTestimonials.map((t: any) => ({
            id: t.id,
            name: t.name,
            role: t.role,
            text: t.text,
            image: t.image || '👤',
            rating: t.rating || 5,
          })),
        });
      }
      throw error;
    }

    if (snapshot.empty) {
      return NextResponse.json({ testimonials: [] });
    }

    const testimonials = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        role: data.role,
        text: data.text,
        image: data.image || '👤',
        rating: data.rating || 5,
      };
    });

    return NextResponse.json({ testimonials });
  } catch (error: any) {
    console.error('Error obteniendo testimonios:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener testimonios',
        details: error.message,
        testimonials: [],
      },
      { status: 500 }
    );
  }
}

