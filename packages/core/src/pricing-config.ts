// Utilidad para obtener configuración de precios

import { getFirestore } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

const db = getFirestore();

export interface PricingConfig {
  promotions: {
    vehicle: {
      durations: number[];
      prices: Record<number, number>;
    };
    dealer: {
      durations: number[];
      prices: Record<number, number>;
    };
    seller: {
      durations: number[];
      prices: Record<number, number>;
    };
  };
  banners: {
    hero: {
      durations: number[];
      prices: Record<number, number>;
    };
    sidebar: {
      durations: number[];
      prices: Record<number, number>;
    };
    between_content: {
      durations: number[];
      prices: Record<number, number>;
    };
    sponsors_section: {
      durations: number[];
      prices: Record<number, number>;
    };
  };
  limits: {
    maxActivePromotions: number;
    maxActiveBanners: number;
  };
}

const defaultConfig: PricingConfig = {
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
  },
};

let cachedConfig: PricingConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene la configuración de precios desde Firestore
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  // Verificar cache
  const now = Date.now();
  if (cachedConfig && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedConfig;
  }

  try {
    const configDoc = await getDb().collection('admin_config').doc('pricing').get();
    
    if (configDoc.exists) {
      const config = configDoc.data() as PricingConfig;
      cachedConfig = config;
      cacheTimestamp = now;
      return config;
    }
  } catch (error) {
    console.error('Error fetching pricing config:', error);
  }

  // Retornar configuración por defecto si no existe
  return defaultConfig;
}

/**
 * Obtiene el precio de una promoción
 */
export async function getPromotionPrice(
  scope: 'vehicle' | 'dealer' | 'seller',
  duration: number
): Promise<number> {
  const config = await getPricingConfig();
  return config.promotions[scope].prices[duration] || 0;
}

/**
 * Obtiene el precio de un banner según su placement
 */
export async function getBannerPrice(
  placement: 'hero' | 'sidebar' | 'between_content' | 'sponsors_section',
  duration: number
): Promise<number> {
  const config = await getPricingConfig();
  
  // Migrar estructura antigua si existe
  if (config.banners && !config.banners.hero && (config.banners as any).durations) {
    const oldBanners = config.banners as any;
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
  
  return config.banners[placement]?.prices[duration] || 0;
}

/**
 * Obtiene las duraciones disponibles para promociones
 */
export async function getPromotionDurations(
  scope: 'vehicle' | 'dealer' | 'seller'
): Promise<number[]> {
  const config = await getPricingConfig();
  return config.promotions[scope].durations;
}

/**
 * Obtiene las duraciones disponibles para banners según su placement
 */
export async function getBannerDurations(
  placement: 'hero' | 'sidebar' | 'between_content' | 'sponsors_section'
): Promise<number[]> {
  const config = await getPricingConfig();
  
  // Migrar estructura antigua si existe
  if (config.banners && !config.banners.hero && (config.banners as any).durations) {
    const oldBanners = config.banners as any;
    return oldBanners.durations || [7, 15, 30];
  }
  
  return config.banners[placement]?.durations || [7, 15, 30];
}

/**
 * Limpia el cache de configuración
 */
export function clearPricingConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}


