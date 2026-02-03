import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { initializeFirebase, getFirestore } from '@autodealers/core';

initializeFirebase();
const db = getFirestore();

export const dynamic = 'force-dynamic';

// GET: Obtener todos los testimonios
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Consulta simple sin timeouts artificiales - dejar que Firestore maneje su propio timeout
    try {
      const snapshot = await db.collection('testimonials')
        .limit(50)
        .get();

      // Filtrar y ordenar en memoria (más rápido para pocos registros)
      const testimonials = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((t: any) => t.isActive !== false) // Incluir activos y undefined
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

      return NextResponse.json({ testimonials });
    } catch (error: any) {
      // Si falla con DEADLINE_EXCEEDED u otro error, retornar array vacío
      console.error('Error obteniendo testimonios:', error.code || error.message);
      if (error.code === 4 || error.message?.includes('DEADLINE_EXCEEDED') || error.message?.includes('deadline')) {
        console.warn('Timeout en consulta de testimonios, retornando array vacío');
      }
      return NextResponse.json({ testimonials: [] });
    }
  } catch (error: any) {
    console.error('Error obteniendo testimonios:', error);
    return NextResponse.json(
      { error: 'Error al obtener testimonios', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo testimonio
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, role, text, image, rating = 5, order = 0 } = body;

    if (!name || !role || !text) {
      return NextResponse.json(
        { error: 'Nombre, rol y texto son requeridos' },
        { status: 400 }
      );
    }

    const testimonialData = {
      name,
      role,
      text,
      image: image || '👤',
      rating: rating || 5,
      order: order || 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Operación simple sin timeout artificial
    const docRef = await db.collection('testimonials').add(testimonialData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      testimonial: { id: docRef.id, ...testimonialData },
    });
  } catch (error: any) {
    console.error('Error creando testimonio:', error);
    return NextResponse.json(
      { error: 'Error al crear testimonio', details: error.message },
      { status: 500 }
    );
  }
}

