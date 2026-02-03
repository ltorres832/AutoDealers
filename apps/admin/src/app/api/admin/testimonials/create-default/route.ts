import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { initializeFirebase, getFirestore } from '@autodealers/core';

initializeFirebase();
const db = getFirestore();

export const dynamic = 'force-dynamic';

// POST: Crear testimonios por defecto
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const defaultTestimonials = [
      {
        name: 'Carlos Rodríguez',
        role: 'CEO, AutoMax',
        text: 'AutoDealers transformó completamente nuestro negocio. Las ventas aumentaron un 40% en 3 meses. La plataforma es intuitiva y el soporte es excepcional.',
        image: '👨‍💼',
        rating: 5,
        order: 0,
        isActive: true,
      },
      {
        name: 'María González',
        role: 'Gerente de Ventas, MotoWorld',
        text: 'La mejor inversión que hemos hecho. El CRM y la IA nos ahorran 20 horas semanales. Nuestro equipo está más organizado y productivo que nunca.',
        image: '👩‍💼',
        rating: 5,
        order: 1,
        isActive: true,
      },
      {
        name: 'Juan Pérez',
        role: 'Owner, Premium Cars',
        text: 'Soporte increíble, funcionalidades potentes y fácil de usar. 100% recomendado. Nuestros clientes están más satisfechos y nuestras ventas han crecido significativamente.',
        image: '🧑‍💼',
        rating: 5,
        order: 2,
        isActive: true,
      },
    ];

    const results = {
      created: [] as string[],
      errors: [] as string[],
    };

    for (const testimonial of defaultTestimonials) {
      try {
        // Buscar solo por nombre (más rápido que dos where)
        const existing = await db.collection('testimonials')
          .where('name', '==', testimonial.name)
          .limit(1)
          .get();

        if (existing.empty) {
          // Crear nuevo testimonio
          await db.collection('testimonials').add({
            ...testimonial,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          
          results.created.push(`${testimonial.name} - ${testimonial.role}`);
        } else {
          // Actualizar el existente
          const docId = existing.docs[0].id;
          await db.collection('testimonials').doc(docId).update({
            ...testimonial,
            updatedAt: new Date().toISOString(),
          });
          
          results.created.push(`${testimonial.name} - ${testimonial.role} (actualizado)`);
        }
      } catch (error: any) {
        // Si hay timeout o error, continuar con el siguiente
        const errorMsg = error.code === 4 ? 'Timeout' : error.message;
        results.errors.push(`${testimonial.name}: ${errorMsg}`);
        console.error(`Error procesando testimonio ${testimonial.name}:`, error.code || error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Testimonios procesados: ${results.created.length} creados/actualizados, ${results.errors.length} errores`,
      results,
    });
  } catch (error: any) {
    console.error('Error creando testimonios por defecto:', error);
    return NextResponse.json(
      { error: 'Error al crear testimonios', details: error.message },
      { status: 500 }
    );
  }
}

