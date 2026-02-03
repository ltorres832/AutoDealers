'use client';

import { useState, useEffect } from 'react';

interface PricingConfig {
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
  currency: string;
  taxRate: number;
}

export function usePricingConfig() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Obtener configuración desde API (más simple y confiable)
    fetch('/api/public/pricing-config')
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setConfig(data.config);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching pricing config:', err);
        setError(err.message);
        setLoading(false);
      });

    // Configurar polling cada 30 segundos para sincronización en tiempo real
    const interval = setInterval(() => {
      fetch('/api/public/pricing-config')
        .then(res => res.json())
        .then(data => {
          if (data.config) {
            setConfig(data.config);
          }
        })
        .catch(() => {
          // Silenciar errores en polling
        });
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []);

  return { config, loading, error };
}

// Función helper para obtener precio de banner
export function getBannerPrice(
  config: PricingConfig | null,
  placement: 'hero' | 'sidebar' | 'between_content' | 'sponsors_section',
  duration: number
): number {
  if (!config) return 0;
  return config.banners[placement]?.prices[duration] || 0;
}

// Función helper para obtener precio de promoción
export function getPromotionPrice(
  config: PricingConfig | null,
  scope: 'vehicle' | 'dealer' | 'seller',
  duration: number
): number {
  if (!config) return 0;
  return config.promotions[scope]?.prices[duration] || 0;
}

