import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configDoc = await db.collection('landingConfig').doc('main').get();
    
    if (!configDoc.exists) {
      // Valores por defecto
      return NextResponse.json({
        config: {
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
        },
      });
    }

    const data = configDoc.data();
    return NextResponse.json({ config: data });
  } catch (error: any) {
    console.error('Error fetching landing config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Config is required' },
        { status: 400 }
      );
    }

    await db.collection('landingConfig').doc('main').set({
      ...config,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: auth.userId,
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving landing config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
