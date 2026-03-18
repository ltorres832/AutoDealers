import { NextResponse } from 'next/server';
import { getFirestore } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Revalidar cada 5 minutos (configuración cambia poco)

export async function GET() {
  try {
    const db = getFirestore();
    // Obtener configuración de landing page
    const configDoc = await db.collection('site_config').doc('landing_config').get();

    if (configDoc.exists) {
      const config = configDoc.data();
      return NextResponse.json({ config }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // Valores por defecto si no existe configuración
    return NextResponse.json({
      config: {
        hero: {
          title: 'Encuentra tu vehículo perfecto',
          subtitle: 'Miles de opciones verificadas en un solo lugar',
          ctaText: 'Explorar Vehículos',
          ctaLink: '/vehicles',
          backgroundImage: null,
        },
        features: {
          enabled: true,
          items: [
            {
              title: 'Vehículos Verificados',
              description: 'Todos nuestros vehículos pasan por un proceso de verificación',
              icon: '✓',
            },
            {
              title: 'Financiamiento Disponible',
              description: 'Opciones de financiamiento flexibles para todos',
              icon: '💰',
            },
            {
              title: 'Atención Personalizada',
              description: 'Equipo de expertos listos para ayudarte',
              icon: '👥',
            },
          ],
        },
        testimonials: {
          enabled: true,
        },
        stats: {
          enabled: true,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching landing config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

