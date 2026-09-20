// Utilidad para obtener configuración de precios

import { getFirestore } from '@autodealers/shared';
import { DEFAULT_BANNER_PLACEMENT_CONFIG, mergeStoredBannerPlacements } from './ad-placements';

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
    vehicle_page: {
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
    ...DEFAULT_BANNER_PLACEMENT_CONFIG,
  },
  limits: {
    maxActivePromotions: 12,
    maxActiveBanners: 4,
  },
};

let cachedConfig: PricingConfig | null = null;
let cacheTimestamp: number = 0;
/** TTL corto: la config la edita el admin en Firestore y debe verse rápido en todas las instancias (sin redeploy). */
const CACHE_DURATION = 15 * 1000; // 15 segundos

function mergeBannerPricing(banners: PricingConfig['banners'] | Record<string, unknown> | undefined): PricingConfig['banners'] {
  const stored = (banners || {}) as Record<string, { durations?: number[]; prices?: Record<number, number> }>;
  if (stored && !stored.hero && stored.durations) {
    const oldBanners = stored as { durations?: number[]; prices?: Record<number, number> };
    return mergeStoredBannerPlacements({
      hero: {
        durations: oldBanners.durations || [7, 15, 30],
        prices: oldBanners.prices || DEFAULT_BANNER_PLACEMENT_CONFIG.hero.prices,
      },
      sidebar: {
        durations: oldBanners.durations || [7, 15, 30],
        prices: oldBanners.prices || DEFAULT_BANNER_PLACEMENT_CONFIG.sidebar.prices,
      },
      between_content: {
        durations: oldBanners.durations || [7, 15, 30],
        prices: oldBanners.prices || DEFAULT_BANNER_PLACEMENT_CONFIG.between_content.prices,
      },
      sponsors_section: {
        durations: oldBanners.durations || [7, 15, 30],
        prices: oldBanners.prices || DEFAULT_BANNER_PLACEMENT_CONFIG.sponsors_section.prices,
      },
    });
  }
  return mergeStoredBannerPlacements(stored);
}

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
      cachedConfig = {
        ...defaultConfig,
        ...config,
        promotions: {
          ...defaultConfig.promotions,
          ...(config.promotions || {}),
        },
        banners: mergeBannerPricing(config.banners),
      };
      cacheTimestamp = now;
      return cachedConfig;
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
  placement: 'hero' | 'sidebar' | 'between_content' | 'sponsors_section' | 'vehicle_page',
  duration: number
): Promise<number> {
  const config = await getPricingConfig();
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
  placement: 'hero' | 'sidebar' | 'between_content' | 'sponsors_section' | 'vehicle_page'
): Promise<number[]> {
  const config = await getPricingConfig();
  return config.banners[placement]?.durations || [7, 15, 30];
}

/**
 * Limpia el cache de configuración
 */
export function clearPricingConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}


