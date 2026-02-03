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
        limits: {
          maxActivePromotions: 12,
          maxActiveBanners: 4,
          maxPromotionsPerUser: 5,
          maxBannersPerUser: 2,
          maxPromotionsPerDealer: 10,
          maxPromotionsPerSeller: 3,
          maxBannersPerDealer: 3,
          maxBannersPerSeller: 1,
          minPromotionDuration: 1,
          maxPromotionDuration: 90,
          minBannerDuration: 7,
          maxBannerDuration: 90,
        },
        currency: 'USD',
        taxRate: 0,
        discounts: {
          enabled: false,
          volumeDiscounts: [],
          membershipDiscounts: [],
        },
        restrictions: {
          cooldownBetweenPromotions: 0,
          cooldownBetweenBanners: 0,
          requireApproval: false,
        },
      };

      // Crear configuración por defecto
      await db.collection('admin_config').doc('pricing').set({
        ...defaultConfig,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ config: defaultConfig });
    }

    const config = configDoc.data();
    
    if (!config) {
      // Si no hay config, retornar valores por defecto
      const defaultConfig = {
        promotions: {
          paid: { price: 50, duration: 30 },
          premium: { price: 100, duration: 30 },
        },
        banners: {
          hero: { price: 200, duration: 30 },
          sidebar: { price: 100, duration: 30 },
          between_content: { price: 150, duration: 30 },
          sponsors_section: { price: 80, duration: 30 },
        },
        limits: {
          maxBanners: 4,
          maxPromotions: 10,
        },
      };
      return NextResponse.json({ config: defaultConfig });
    }
    
    // Asegurar que la estructura esté completa y migrar estructura antigua si existe
    const needsMigration = !config.banners?.hero || !config.banners?.sidebar || !config.banners?.between_content || !config.banners?.sponsors_section;
    
    if (needsMigration || !config.promotions || !config.banners || !config.limits) {
      // Valores por defecto completos
      const defaultConfig = {
        promotions: {
          vehicle: {
            durations: [3, 7, 15, 30],
            prices: { 3: 9.99, 7: 19.99, 15: 34.99, 30: 59.99 },
          },
          dealer: {
            durations: [3, 7, 15, 30],
            prices: { 3: 49.99, 7: 89.99, 15: 149.99, 30: 199.99 },
          },
          seller: {
            durations: [3, 7, 15, 30],
            prices: { 3: 24.99, 7: 44.99, 15: 79.99, 30: 119.99 },
          },
        },
        banners: {
          hero: {
            durations: [7, 15, 30],
            prices: { 7: 199, 15: 349, 30: 599 },
          },
          sidebar: {
            durations: [7, 15, 30],
            prices: { 7: 99, 15: 149, 30: 299 },
          },
          between_content: {
            durations: [7, 15, 30],
            prices: { 7: 149, 15: 249, 30: 449 },
          },
          sponsors_section: {
            durations: [7, 15, 30],
            prices: { 7: 79, 15: 129, 30: 229 },
          },
        },
        limits: {
          maxActivePromotions: 12,
          maxActiveBanners: 4,
          maxPromotionsPerUser: 5,
          maxBannersPerUser: 2,
          maxPromotionsPerDealer: 10,
          maxPromotionsPerSeller: 3,
          maxBannersPerDealer: 3,
          maxBannersPerSeller: 1,
          minPromotionDuration: 1,
          maxPromotionDuration: 90,
          minBannerDuration: 7,
          maxBannerDuration: 90,
        },
        currency: 'USD',
        taxRate: 0,
        discounts: {
          enabled: false,
          volumeDiscounts: [],
          membershipDiscounts: [],
        },
        restrictions: {
          cooldownBetweenPromotions: 0,
          cooldownBetweenBanners: 0,
          requireApproval: false,
        },
      };
      
      // Migrar estructura antigua de banners si existe
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
      
      const mergedConfig = {
        ...defaultConfig,
        ...config,
        promotions: {
          ...defaultConfig.promotions,
          ...(config.promotions || {}),
        },
        banners: {
          ...defaultConfig.banners,
          ...(config.banners || {}),
        },
        limits: {
          ...defaultConfig.limits,
          ...(config.limits || {}),
        },
        currency: config.currency || defaultConfig.currency,
        taxRate: config.taxRate !== undefined ? config.taxRate : defaultConfig.taxRate,
        discounts: {
          ...defaultConfig.discounts,
          ...(config.discounts || {}),
        },
        restrictions: {
          ...defaultConfig.restrictions,
          ...(config.restrictions || {}),
        },
      };
      
      return NextResponse.json({ config: mergedConfig });
    }
    
    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Error fetching pricing config:', error);
    
    // Si es un error de autenticación, devolver 401
    if (error.message?.includes('Unauthorized') || error.message?.includes('auth')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Debes estar autenticado como administrador' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Missing config' },
        { status: 400 }
      );
    }

    // Validar estructura
    if (!config.promotions || !config.banners || !config.limits) {
      return NextResponse.json(
        { error: 'Invalid config structure' },
        { status: 400 }
      );
    }

    // Actualizar configuración
    await db.collection('admin_config').doc('pricing').set({
      ...config,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true, message: 'Configuración actualizada exitosamente' });
  } catch (error: any) {
    console.error('Error updating pricing config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

