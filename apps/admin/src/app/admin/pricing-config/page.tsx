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
  limits: {
    maxActivePromotions: number;
    maxActiveBanners: number;
    maxPromotionsPerUser: number; // Límite por usuario individual
    maxBannersPerUser: number; // Límite por usuario individual
    maxPromotionsPerDealer: number; // Límite específico para dealers
    maxPromotionsPerSeller: number; // Límite específico para sellers
    maxBannersPerDealer: number; // Límite específico para dealers
    maxBannersPerSeller: number; // Límite específico para sellers
    minPromotionDuration: number; // Duración mínima en días
    maxPromotionDuration: number; // Duración máxima en días
    minBannerDuration: number; // Duración mínima en días
    maxBannerDuration: number; // Duración máxima en días
  };
  currency: string; // Moneda por defecto
  taxRate: number; // Tasa de impuestos (porcentaje)
  discounts: {
    enabled: boolean;
    volumeDiscounts: { // Descuentos por volumen
      minQuantity: number;
      discountPercent: number;
    }[];
    membershipDiscounts: { // Descuentos por membresía
      membershipId: string;
      discountPercent: number;
    }[];
  };
  restrictions: {
    cooldownBetweenPromotions: number; // Días de espera entre promociones
    cooldownBetweenBanners: number; // Días de espera entre banners
    requireApproval: boolean; // Requiere aprobación del admin
  };
}

export default function PricingConfigPage() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      // Obtener token de autenticación
      const token = document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1] || 
                    localStorage.getItem('authToken');
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('Fetching pricing config...');
      const response = await fetch('/api/admin/pricing-config', {
        method: 'GET',
        headers,
        credentials: 'include', // Incluir cookies
      });
      
      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        setMessage({ 
          type: 'error', 
          text: 'No autorizado. Por favor, inicia sesión nuevamente como administrador.' 
        });
        // Usar valores por defecto
        const defaultConfig: PricingConfig = {
          promotions: {
            vehicle: { durations: [3, 7, 15, 30], prices: { 3: 9.99, 7: 19.99, 15: 34.99, 30: 59.99 } },
            dealer: { durations: [3, 7, 15, 30], prices: { 3: 49.99, 7: 89.99, 15: 149.99, 30: 199.99 } },
            seller: { durations: [3, 7, 15, 30], prices: { 3: 24.99, 7: 44.99, 15: 79.99, 30: 119.99 } },
          },
          banners: {
            hero: { durations: [7, 15, 30], prices: { 7: 199, 15: 349, 30: 599 } },
            sidebar: { durations: [7, 15, 30], prices: { 7: 99, 15: 149, 30: 299 } },
            between_content: { durations: [7, 15, 30], prices: { 7: 149, 15: 249, 30: 449 } },
            sponsors_section: { durations: [7, 15, 30], prices: { 7: 79, 15: 129, 30: 229 } },
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
        setConfig(defaultConfig);
        setLoading(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.config) {
          console.log('Setting config:', data.config);
          setConfig(data.config);
        } else {
          console.error('No config in response:', data);
          setMessage({ type: 'error', text: 'No se recibió configuración del servidor' });
          // Usar valores por defecto
          const defaultConfig: PricingConfig = {
            promotions: {
              vehicle: { durations: [3, 7, 15, 30], prices: { 3: 9.99, 7: 19.99, 15: 34.99, 30: 59.99 } },
              dealer: { durations: [3, 7, 15, 30], prices: { 3: 49.99, 7: 89.99, 15: 149.99, 30: 199.99 } },
              seller: { durations: [3, 7, 15, 30], prices: { 3: 24.99, 7: 44.99, 15: 79.99, 30: 119.99 } },
            },
            banners: {
            hero: { durations: [7, 15, 30], prices: { 7: 199, 15: 349, 30: 599 } },
            sidebar: { durations: [7, 15, 30], prices: { 7: 99, 15: 149, 30: 299 } },
            between_content: { durations: [7, 15, 30], prices: { 7: 149, 15: 249, 30: 449 } },
            sponsors_section: { durations: [7, 15, 30], prices: { 7: 79, 15: 129, 30: 229 } },
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
          setConfig(defaultConfig);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('Error response:', errorData);
        setMessage({ type: 'error', text: errorData.error || `Error ${response.status}: ${response.statusText}` });
        // Usar valores por defecto incluso si hay error
        const defaultConfig: PricingConfig = {
          promotions: {
            vehicle: { durations: [3, 7, 15, 30], prices: { 3: 9.99, 7: 19.99, 15: 34.99, 30: 59.99 } },
            dealer: { durations: [3, 7, 15, 30], prices: { 3: 49.99, 7: 89.99, 15: 149.99, 30: 199.99 } },
            seller: { durations: [3, 7, 15, 30], prices: { 3: 24.99, 7: 44.99, 15: 79.99, 30: 119.99 } },
          },
          banners: {
            hero: { durations: [7, 15, 30], prices: { 7: 199, 15: 349, 30: 599 } },
            sidebar: { durations: [7, 15, 30], prices: { 7: 99, 15: 149, 30: 299 } },
            between_content: { durations: [7, 15, 30], prices: { 7: 149, 15: 249, 30: 449 } },
            sponsors_section: { durations: [7, 15, 30], prices: { 7: 79, 15: 129, 30: 229 } },
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
        setConfig(defaultConfig);
      }
    } catch (error: any) {
      console.error('Error fetching config:', error);
      setMessage({ type: 'error', text: error.message || 'Error al cargar la configuración' });
      // Usar valores por defecto en caso de error
      const defaultConfig: PricingConfig = {
        promotions: {
          vehicle: { durations: [3, 7, 15, 30], prices: { 3: 9.99, 7: 19.99, 15: 34.99, 30: 59.99 } },
          dealer: { durations: [3, 7, 15, 30], prices: { 3: 49.99, 7: 89.99, 15: 149.99, 30: 199.99 } },
          seller: { durations: [3, 7, 15, 30], prices: { 3: 24.99, 7: 44.99, 15: 79.99, 30: 119.99 } },
        },
        banners: {
          hero: { durations: [7, 15, 30], prices: { 7: 199, 15: 349, 30: 599 } },
          sidebar: { durations: [7, 15, 30], prices: { 7: 99, 15: 149, 30: 299 } },
          between_content: { durations: [7, 15, 30], prices: { 7: 149, 15: 249, 30: 449 } },
          sponsors_section: { durations: [7, 15, 30], prices: { 7: 79, 15: 129, 30: 229 } },
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
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!config) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/pricing-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Error al guardar' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  }

  function updatePromotionPrice(scope: 'vehicle' | 'dealer' | 'seller', duration: number, price: number) {
    if (!config) return;
    setConfig({
      ...config,
      promotions: {
        ...config.promotions,
        [scope]: {
          ...config.promotions[scope],
          prices: {
            ...config.promotions[scope].prices,
            [duration]: price,
          },
        },
      },
    });
  }

  function updateBannerPrice(placement: 'hero' | 'sidebar' | 'between_content' | 'sponsors_section', duration: number, price: number) {
    if (!config) return;
    setConfig({
      ...config,
      banners: {
        ...config.banners,
        [placement]: {
          ...config.banners[placement],
          prices: {
            ...config.banners[placement].prices,
            [duration]: price,
          },
        },
      },
    });
  }

  function addPromotionDuration(scope: 'vehicle' | 'dealer' | 'seller', duration: number) {
    if (!config) return;
    if (config.promotions[scope].durations.includes(duration)) return;
    
    setConfig({
      ...config,
      promotions: {
        ...config.promotions,
        [scope]: {
          ...config.promotions[scope],
          durations: [...config.promotions[scope].durations, duration].sort((a, b) => a - b),
          prices: {
            ...config.promotions[scope].prices,
            [duration]: 0,
          },
        },
      },
    });
  }

  function removePromotionDuration(scope: 'vehicle' | 'dealer' | 'seller', duration: number) {
    if (!config) return;
    if (config.promotions[scope].durations.length <= 1) return;
    
    const newPrices = { ...config.promotions[scope].prices };
    delete newPrices[duration];

    setConfig({
      ...config,
      promotions: {
        ...config.promotions,
        [scope]: {
          ...config.promotions[scope],
          durations: config.promotions[scope].durations.filter(d => d !== duration),
          prices: newPrices,
        },
      },
    });
  }

  function addBannerDuration(placement: 'hero' | 'sidebar' | 'between_content' | 'sponsors_section', duration: number) {
    if (!config) return;
    if (config.banners[placement].durations.includes(duration)) return;
    
    setConfig({
      ...config,
      banners: {
        ...config.banners,
        [placement]: {
          ...config.banners[placement],
          durations: [...config.banners[placement].durations, duration].sort((a, b) => a - b),
          prices: {
            ...config.banners[placement].prices,
            [duration]: 0,
          },
        },
      },
    });
  }

  function removeBannerDuration(placement: 'hero' | 'sidebar' | 'between_content' | 'sponsors_section', duration: number) {
    if (!config) return;
    if (config.banners[placement].durations.length <= 1) return;
    
    const newPrices = { ...config.banners[placement].prices };
    delete newPrices[duration];

    setConfig({
      ...config,
      banners: {
        ...config.banners,
        [placement]: {
          ...config.banners[placement],
          durations: config.banners[placement].durations.filter(d => d !== duration),
          prices: newPrices,
        },
      },
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600">Cargando configuración...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error al cargar la configuración</h2>
          <p className="text-red-600 mb-4">
            {message?.text || 'No se pudo cargar la configuración de precios. Por favor, intenta recargar la página.'}
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setMessage(null);
              fetchConfig();
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Configuración de Precios y Duraciones</h1>
        <p className="text-gray-600">Gestiona los precios y duraciones de promociones y banners premium</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Límites Globales */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Límites Globales</h2>
        
        {/* Límites Generales */}
        <div className="mb-6 pb-6 border-b">
          <h3 className="text-lg font-semibold mb-3">Límites Generales del Sistema</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Máximo de Promociones Activas (Global)</label>
              <input
                type="number"
                value={config?.limits?.maxActivePromotions ?? 12}
                onChange={(e) => config && setConfig({
                  ...config,
                  limits: { ...config.limits, maxActivePromotions: parseInt(e.target.value) || 0 }
                })}
                className="w-full border rounded px-3 py-2"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Límite total de promociones activas en todo el sistema</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Máximo de Banners Activos (Global)</label>
              <input
                type="number"
                value={config?.limits?.maxActiveBanners ?? 4}
                onChange={(e) => config && setConfig({
                  ...config,
                  limits: { ...config.limits, maxActiveBanners: parseInt(e.target.value) || 0 }
                })}
                className="w-full border rounded px-3 py-2"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Límite total de banners activos en todo el sistema</p>
            </div>
          </div>
        </div>

        {/* Límites por Usuario */}
        <div className="mb-6 pb-6 border-b">
          <h3 className="text-lg font-semibold mb-3">Límites por Usuario Individual</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Máximo de Promociones por Usuario</label>
              <input
                type="number"
                value={config?.limits?.maxPromotionsPerUser ?? 5}
                onChange={(e) => config && setConfig({
                  ...config,
                  limits: { ...config.limits, maxPromotionsPerUser: parseInt(e.target.value) || 0 }
                })}
                className="w-full border rounded px-3 py-2"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Máximo de promociones activas que puede tener un usuario</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Máximo de Banners por Usuario</label>
              <input
                type="number"
                value={config?.limits?.maxBannersPerUser ?? 2}
                onChange={(e) => config && setConfig({
                  ...config,
                  limits: { ...config.limits, maxBannersPerUser: parseInt(e.target.value) || 0 }
                })}
                className="w-full border rounded px-3 py-2"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Máximo de banners activos que puede tener un usuario</p>
            </div>
          </div>
        </div>

        {/* Límites por Tipo de Usuario */}
        <div className="mb-6 pb-6 border-b">
          <h3 className="text-lg font-semibold mb-3">Límites por Tipo de Usuario</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-blue-600">Dealers</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Máximo de Promociones</label>
                  <input
                    type="number"
                    value={config?.limits?.maxPromotionsPerDealer ?? 10}
                    onChange={(e) => config && setConfig({
                      ...config,
                      limits: { ...config.limits, maxPromotionsPerDealer: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Máximo de Banners</label>
                  <input
                    type="number"
                    value={config?.limits?.maxBannersPerDealer ?? 3}
                    onChange={(e) => config && setConfig({
                      ...config,
                      limits: { ...config.limits, maxBannersPerDealer: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-green-600">Vendedores</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Máximo de Promociones</label>
                  <input
                    type="number"
                    value={config?.limits?.maxPromotionsPerSeller ?? 3}
                    onChange={(e) => config && setConfig({
                      ...config,
                      limits: { ...config.limits, maxPromotionsPerSeller: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Máximo de Banners</label>
                  <input
                    type="number"
                    value={config?.limits?.maxBannersPerSeller ?? 1}
                    onChange={(e) => config && setConfig({
                      ...config,
                      limits: { ...config.limits, maxBannersPerSeller: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Límites de Duración */}
        <div className="mb-6 pb-6 border-b">
          <h3 className="text-lg font-semibold mb-3">Límites de Duración</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Promociones</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Duración Mínima (días)</label>
                  <input
                    type="number"
                    value={config?.limits?.minPromotionDuration ?? 1}
                    onChange={(e) => config && setConfig({
                      ...config,
                      limits: { ...config.limits, minPromotionDuration: parseInt(e.target.value) || 1 }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Duración Máxima (días)</label>
                  <input
                    type="number"
                    value={config?.limits?.maxPromotionDuration ?? 90}
                    onChange={(e) => config && setConfig({
                      ...config,
                      limits: { ...config.limits, maxPromotionDuration: parseInt(e.target.value) || 90 }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                  />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Banners</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Duración Mínima (días)</label>
                  <input
                    type="number"
                    value={config?.limits?.minBannerDuration ?? 7}
                    onChange={(e) => config && setConfig({
                      ...config,
                      limits: { ...config.limits, minBannerDuration: parseInt(e.target.value) || 7 }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Duración Máxima (días)</label>
                  <input
                    type="number"
                    value={config?.limits?.maxBannerDuration ?? 90}
                    onChange={(e) => config && setConfig({
                      ...config,
                      limits: { ...config.limits, maxBannerDuration: parseInt(e.target.value) || 90 }
                    })}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuración General */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Configuración General</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Moneda por Defecto</label>
              <select
                value={config?.currency ?? 'USD'}
                onChange={(e) => config && setConfig({
                  ...config,
                  currency: e.target.value
                })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="USD">USD - Dólar Estadounidense</option>
                <option value="EUR">EUR - Euro</option>
                <option value="MXN">MXN - Peso Mexicano</option>
                <option value="COP">COP - Peso Colombiano</option>
                <option value="ARS">ARS - Peso Argentino</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tasa de Impuestos (%)</label>
              <input
                type="number"
                value={config?.taxRate ?? 0}
                onChange={(e) => config && setConfig({
                  ...config,
                  taxRate: parseFloat(e.target.value) || 0
                })}
                className="w-full border rounded px-3 py-2"
                min="0"
                max="100"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Porcentaje de impuestos a aplicar (ej: 16 para IVA)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Restricciones y Reglas */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Restricciones y Reglas</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tiempo de Espera entre Promociones (días)</label>
              <input
                type="number"
                value={config?.restrictions?.cooldownBetweenPromotions ?? 0}
                onChange={(e) => config && setConfig({
                  ...config,
                  restrictions: { 
                    ...config.restrictions, 
                    cooldownBetweenPromotions: parseInt(e.target.value) || 0 
                  }
                })}
                className="w-full border rounded px-3 py-2"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Días de espera obligatorios entre crear promociones</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tiempo de Espera entre Banners (días)</label>
              <input
                type="number"
                value={config?.restrictions?.cooldownBetweenBanners ?? 0}
                onChange={(e) => config && setConfig({
                  ...config,
                  restrictions: { 
                    ...config.restrictions, 
                    cooldownBetweenBanners: parseInt(e.target.value) || 0 
                  }
                })}
                className="w-full border rounded px-3 py-2"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Días de espera obligatorios entre crear banners</p>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config?.restrictions?.requireApproval ?? false}
                onChange={(e) => config && setConfig({
                  ...config,
                  restrictions: { 
                    ...config.restrictions, 
                    requireApproval: e.target.checked 
                  }
                })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm font-medium">Requerir aprobación del administrador antes de activar</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">Las promociones y banners requerirán aprobación antes de publicarse</p>
          </div>
        </div>
      </div>

      {/* Promociones */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Precios de Promociones</h2>
        
        {config && (['vehicle', 'dealer', 'seller'] as const).map((scope) => (
          <div key={scope} className="mb-6 pb-6 border-b last:border-b-0">
            <h3 className="text-lg font-semibold mb-3 capitalize">
              Promociones de {scope === 'vehicle' ? 'Vehículo' : scope === 'dealer' ? 'Dealer' : 'Vendedor'}
            </h3>
            
            <div className="space-y-3">
              {(config?.promotions?.[scope]?.durations || []).map((duration) => (
                <div key={duration} className="flex items-center gap-4">
                  <div className="w-24">
                    <span className="font-medium">{duration} días</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-gray-600">$</span>
                    <input
                      type="number"
                      value={config?.promotions?.[scope]?.prices?.[duration] ?? 0}
                      onChange={(e) => updatePromotionPrice(scope, duration, parseFloat(e.target.value) || 0)}
                      className="flex-1 border rounded px-3 py-2"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {(config?.promotions?.[scope]?.durations?.length || 0) > 1 && (
                    <button
                      onClick={() => removePromotionDuration(scope, duration)}
                      className="text-red-600 hover:text-red-700 px-3 py-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              
              <div className="flex gap-2 mt-2">
                <input
                  type="number"
                  placeholder="Agregar duración (días)"
                  className="border rounded px-3 py-2"
                  min="1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const duration = parseInt((e.target as HTMLInputElement).value);
                      if (duration > 0) {
                        addPromotionDuration(scope, duration);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector(`input[placeholder="Agregar duración (días)"]`) as HTMLInputElement;
                    const duration = parseInt(input?.value || '0');
                    if (duration > 0) {
                      addPromotionDuration(scope, duration);
                      if (input) input.value = '';
                    }
                  }}
                  className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Banners */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Precios de Banners por Ubicación</h2>
        
        {config && (['hero', 'sidebar', 'between_content', 'sponsors_section'] as const).map((placement) => {
          const placementLabels: Record<typeof placement, string> = {
            hero: 'Hero Banner (Parte Superior)',
            sidebar: 'Sidebar Banner (Barra Lateral)',
            between_content: 'Between Content Banner (Entre Contenido)',
            sponsors_section: 'Sponsors Section Banner (Sección de Patrocinadores)',
          };

          return (
            <div key={placement} className="mb-6 pb-6 border-b last:border-b-0">
              <h3 className="text-lg font-semibold mb-3">{placementLabels[placement]}</h3>
              
              <div className="space-y-3">
                {(config?.banners?.[placement]?.durations || []).map((duration) => (
                  <div key={duration} className="flex items-center gap-4">
                    <div className="w-24">
                      <span className="font-medium">{duration} días</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-gray-600">$</span>
                      <input
                        type="number"
                        value={config?.banners?.[placement]?.prices?.[duration] ?? 0}
                        onChange={(e) => updateBannerPrice(placement, duration, parseFloat(e.target.value) || 0)}
                        className="flex-1 border rounded px-3 py-2"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    {(config?.banners?.[placement]?.durations?.length || 0) > 1 && (
                      <button
                        onClick={() => removeBannerDuration(placement, duration)}
                        className="text-red-600 hover:text-red-700 px-3 py-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                
                <div className="flex gap-2 mt-2">
                  <input
                    type="number"
                    placeholder={`Agregar duración (días) - ${placementLabels[placement]}`}
                    className="border rounded px-3 py-2 flex-1"
                    min="1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const duration = parseInt((e.target as HTMLInputElement).value);
                        if (duration > 0) {
                          addBannerDuration(placement, duration);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector(`input[placeholder*="${placementLabels[placement]}"]`) as HTMLInputElement;
                      const duration = parseInt(input?.value || '0');
                      if (duration > 0) {
                        addBannerDuration(placement, duration);
                        if (input) input.value = '';
                      }
                    }}
                    className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </div>
  );
}

