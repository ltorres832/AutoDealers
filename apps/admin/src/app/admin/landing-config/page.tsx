'use client';

import { useState, useEffect } from 'react';

interface LandingConfig {
  hero: {
    title: string;
    subtitle: string;
    primaryButtonText: string;
    secondaryButtonText: string;
  };
  login: {
    registerDealerText: string;
    registerSellerText: string;
  };
  banners: {
    title: string;
    rotationTimes?: {
      hero?: number; // en segundos
      sidebar?: number; // en segundos
      betweenContent?: number; // en segundos
    };
  };
  promotions: {
    title: string;
    subtitle: string;
  };
  vehicles: {
    title: string;
    subtitle: string;
  };
  contact: {
    title: string;
    subtitle: string;
  };
  legal: {
    showPromotionDisclaimer: boolean;
    promotionDisclaimer: string;
  };
}

export default function LandingConfigPage() {
  const [config, setConfig] = useState<LandingConfig>({
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const response = await fetch('/api/admin/landing-config');
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig({ ...config, ...data.config });
        }
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/landing-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        alert('✅ Configuración guardada exitosamente');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al guardar'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Landing Page</h1>
          <p className="text-gray-600 mt-2">
            Edita el contenido de la landing page pública
          </p>
        </div>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Hero Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Sección Hero (Principal)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Título Principal *</label>
              <input
                type="text"
                value={config.hero.title}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, title: e.target.value } })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Simplifica la compra y venta de autos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subtítulo *</label>
              <textarea
                value={config.hero.subtitle}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, subtitle: e.target.value } })}
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="Descripción del hero"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Texto Botón Principal</label>
                <input
                  type="text"
                  value={config.hero.primaryButtonText}
                  onChange={(e) => setConfig({ ...config, hero: { ...config.hero, primaryButtonText: e.target.value } })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ej: Buscar Vehículos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Texto Botón Secundario</label>
                <input
                  type="text"
                  value={config.hero.secondaryButtonText}
                  onChange={(e) => setConfig({ ...config, hero: { ...config.hero, secondaryButtonText: e.target.value } })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ej: Ver Ofertas Especiales"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Login Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Página de Login</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Texto Registro Dealer</label>
              <input
                type="text"
                value={config.login.registerDealerText}
                onChange={(e) => setConfig({ ...config, login: { ...config.login, registerDealerText: e.target.value } })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Regístrate como Dealer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Texto Registro Vendedor</label>
              <input
                type="text"
                value={config.login.registerSellerText}
                onChange={(e) => setConfig({ ...config, login: { ...config.login, registerSellerText: e.target.value } })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Regístrate como Vendedor"
              />
            </div>
          </div>
        </div>

        {/* Banners Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Sección de Banners Premium</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Título</label>
              <input
                type="text"
                value={config.banners?.title || 'Banners Premium'}
                onChange={(e) => setConfig({ ...config, banners: { ...config.banners, title: e.target.value } })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Banners Premium"
              />
            </div>
            
            {/* Tiempos de Rotación */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-4">⏱️ Tiempos de Rotación de Sliders (en segundos)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Hero Banner (Parte Superior)
                    <span className="text-xs text-gray-500 block mt-1">Tiempo entre cambios automáticos</span>
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="30"
                    value={config.banners?.rotationTimes?.hero || 5}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      banners: { 
                        ...config.banners, 
                        rotationTimes: {
                          ...config.banners?.rotationTimes,
                          hero: parseInt(e.target.value) || 5
                        }
                      } 
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recomendado: 5-10 segundos</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sidebar Banner (Barra Lateral)
                    <span className="text-xs text-gray-500 block mt-1">Tiempo entre cambios automáticos</span>
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="30"
                    value={config.banners?.rotationTimes?.sidebar || 7}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      banners: { 
                        ...config.banners, 
                        rotationTimes: {
                          ...config.banners?.rotationTimes,
                          sidebar: parseInt(e.target.value) || 7
                        }
                      } 
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="7"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recomendado: 6-10 segundos</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Between Content Banner (Entre Contenido)
                    <span className="text-xs text-gray-500 block mt-1">Tiempo entre cambios automáticos</span>
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="30"
                    value={config.banners?.rotationTimes?.betweenContent || 7}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      banners: { 
                        ...config.banners, 
                        rotationTimes: {
                          ...config.banners?.rotationTimes,
                          betweenContent: parseInt(e.target.value) || 7
                        }
                      } 
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="7"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recomendado: 7-12 segundos</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Nota:</strong> Los cambios se aplicarán inmediatamente en la página pública. 
                  Los tiempos se miden en segundos. Mínimo: 3 segundos, Máximo: 30 segundos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Promotions Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Sección de Promociones</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Título</label>
              <input
                type="text"
                value={config.promotions.title}
                onChange={(e) => setConfig({ ...config, promotions: { ...config.promotions, title: e.target.value } })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: 🔥 Ofertas Especiales"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subtítulo</label>
              <input
                type="text"
                value={config.promotions.subtitle}
                onChange={(e) => setConfig({ ...config, promotions: { ...config.promotions, subtitle: e.target.value } })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Promociones destacadas..."
              />
            </div>
          </div>
        </div>

        {/* Vehicles Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Sección de Vehículos</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Título</label>
              <input
                type="text"
                value={config.vehicles.title}
                onChange={(e) => setConfig({ ...config, vehicles: { ...config.vehicles, title: e.target.value } })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Catálogo de Vehículos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subtítulo</label>
              <input
                type="text"
                value={config.vehicles.subtitle}
                onChange={(e) => setConfig({ ...config, vehicles: { ...config.vehicles, subtitle: e.target.value } })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Encuentra el vehículo perfecto..."
              />
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Sección de Contacto</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Título</label>
              <input
                type="text"
                value={config.contact.title}
                onChange={(e) => setConfig({ ...config, contact: { ...config.contact, title: e.target.value } })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: ¿Necesitas Ayuda?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subtítulo</label>
              <input
                type="text"
                value={config.contact.subtitle}
                onChange={(e) => setConfig({ ...config, contact: { ...config.contact, subtitle: e.target.value } })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Contáctanos y te ayudaremos..."
              />
            </div>
          </div>
        </div>

        {/* Legal Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Avisos Legales</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.legal.showPromotionDisclaimer}
                  onChange={(e) => setConfig({ ...config, legal: { ...config.legal, showPromotionDisclaimer: e.target.checked } })}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium">Mostrar aviso legal sobre promociones</span>
              </label>
            </div>
            {config.legal.showPromotionDisclaimer && (
              <div>
                <label className="block text-sm font-medium mb-2">Texto del Aviso Legal</label>
                <textarea
                  value={config.legal.promotionDisclaimer}
                  onChange={(e) => setConfig({ ...config, legal: { ...config.legal, promotionDisclaimer: e.target.value } })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Ej: Las promociones aumentan la visibilidad de los anuncios. No garantizan contactos ni ventas."
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
        </button>
      </div>
    </div>
  );
}

