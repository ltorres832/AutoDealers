import { NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET() {
  try {
    const configDoc = await db.collection('landingConfig').doc('main').get();
    
    if (!configDoc.exists) {
      // Valores por defecto
      return NextResponse.json({
        hero: {
          title: 'Simplifica la compra y venta de autos',
          subtitle: 'Encuentra el vehículo perfecto o vende el tuyo. La plataforma que conecta compradores y vendedores de manera simple y eficiente.',
          primaryButtonText: 'Buscar Vehículos',
          secondaryButtonText: 'Ver Ofertas Especiales',
        },
        login: {
          registerDealerText: 'Regístrate como Dealer',
          registerSellerText: 'Regístrate como Vendedor',
        },
        banners: {
          title: 'Banners Premium',
          rotationTimes: {
            hero: 5,
            sidebar: 7,
            betweenContent: 7,
          },
        },
        promotions: {
          title: '🔥 Ofertas Especiales',
          subtitle: 'Promociones destacadas de nuestros concesionarios',
        },
        vehicles: {
          title: 'Catálogo de Vehículos',
          subtitle: 'Encuentra el vehículo perfecto para ti',
        },
        contact: {
          title: '¿Necesitas Ayuda?',
          subtitle: 'Contáctanos y te ayudaremos a encontrar el vehículo perfecto',
        },
      });
    }

    const data = configDoc.data();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching landing config:', error);
    // Retornar valores por defecto en caso de error
    return NextResponse.json({
      hero: {
        title: 'Simplifica la compra y venta de autos',
        subtitle: 'Encuentra el vehículo perfecto o vende el tuyo. La plataforma que conecta compradores y vendedores de manera simple y eficiente.',
        primaryButtonText: 'Buscar Vehículos',
        secondaryButtonText: 'Ver Ofertas Especiales',
      },
      login: {
        registerDealerText: 'Regístrate como Dealer',
        registerSellerText: 'Regístrate como Vendedor',
      },
        banners: {
          title: 'Banners Premium',
          rotationTimes: {
            hero: 5,
            sidebar: 7,
            betweenContent: 7,
          },
        },
      promotions: {
        title: '🔥 Ofertas Especiales',
        subtitle: 'Promociones destacadas de nuestros concesionarios',
      },
      vehicles: {
        title: 'Catálogo de Vehículos',
        subtitle: 'Encuentra el vehículo perfecto para ti',
      },
      contact: {
        title: '¿Necesitas Ayuda?',
        subtitle: 'Contáctanos y te ayudaremos a encontrar el vehículo perfecto',
      },
      legal: {
        showPromotionDisclaimer: true,
        promotionDisclaimer: 'Las promociones aumentan la visibilidad de los anuncios. No garantizan contactos ni ventas.',
      },
    });
  }
}
