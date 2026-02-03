import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

// Endpoint público para obtener configuración de precios (sin autenticación requerida)
export async function GET(request: NextRequest) {
  try {
    // Obtener configuración de precios
    const configDoc = await db.collection('admin_config').doc('pricing').get();
    
    if (!configDoc.exists) {
      // Valores por defecto
      const defaultConfig = {
        promotions: {
          vehicle: {
            durations: [3, 7, 15, 30],
            prices: {
              3: 9.99,
              7: 19.99,
              15: 34.99,
              30: 59.99,
            },
          },
          dealer: {
            durations: [3, 7, 15, 30],
            prices: {
              3: 49.99,
              7: 89.99,
              15: 149.99,
              30: 199.99,
            },
          },
          seller: {
            durations: [3, 7, 15, 30],
            prices: {
              3: 24.99,
              7: 44.99,
              15: 79.99,
              30: 119.99,
            },
          },
        },
        banners: {
          hero: {
            durations: [7, 15, 30],
            prices: {
              7: 199,
              15: 349,
              30: 599,
            },
          },
          sidebar: {
            durations: [7, 15, 30],
            prices: {
              7: 99,
              15: 149,
              30: 299,
            },
          },
          between_content: {
            durations: [7, 15, 30],
            prices: {
              7: 149,
              15: 249,
              30: 449,
            },
          },
          sponsors_section: {
            durations: [7, 15, 30],
            prices: {
              7: 79,
              15: 129,
              30: 229,
            },
          },
        },
        currency: 'USD',
        taxRate: 0,
      };

      return NextResponse.json({ config: defaultConfig });
    }

    const config = configDoc.data();
    
    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }
    
    // Migrar estructura antigua si existe
    if (config.banners && !config.banners.hero && config.banners.durations) {
      const oldBanners = config.banners;
      config.banners = {
        hero: {
          durations: oldBanners.durations || [7, 15, 30],
          prices: oldBanners.prices || { 7: 199, 15: 349, 30: 599 },
        },
        sidebar: {
          durations: oldBanners.durations || [7, 15, 30],
          prices: oldBanners.prices || { 7: 99, 15: 149, 30: 299 },
        },
        between_content: {
          durations: oldBanners.durations || [7, 15, 30],
          prices: oldBanners.prices || { 7: 149, 15: 249, 30: 449 },
        },
        sponsors_section: {
          durations: oldBanners.durations || [7, 15, 30],
          prices: oldBanners.prices || { 7: 79, 15: 129, 30: 229 },
        },
      };
    }
    
    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Error fetching pricing config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

