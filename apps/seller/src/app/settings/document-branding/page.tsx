'use client';

import { useState, useEffect } from 'react';

interface DocumentBrandingConfig {
  showPlatformLogo: boolean;
  showDealerLogo: boolean;
  showSellerLogo: boolean;
  showPlatformName: boolean;
  showDealerName: boolean;
  showSellerName: boolean;
  logoOrder: {
    platform: number;
    dealer: number;
    seller: number;
  };
  nameOrder: {
    platform: number;
    dealer: number;
    seller: number;
  };
  platformLogoUrl?: string;
  dealerLogoUrl?: string;
  sellerLogoUrl?: string;
  platformName?: string;
  dealerName?: string;
  sellerName?: string;
  documentTypes: {
    certificate?: DocumentTypeConfig;
    contract?: DocumentTypeConfig;
    invoice?: DocumentTypeConfig;
    receipt?: DocumentTypeConfig;
  };
}

interface DocumentTypeConfig {
  showPlatformLogo: boolean;
  showDealerLogo: boolean;
  showSellerLogo: boolean;
  showPlatformName: boolean;
  showDealerName: boolean;
  showSellerName: boolean;
}

export default function DocumentBrandingPage() {
  const [config, setConfig] = useState<DocumentBrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'certificate' | 'contract' | 'invoice' | 'receipt'>('general');

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/document-branding', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config || getDefaultConfig());
      } else {
        setConfig(getDefaultConfig());
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      setConfig(getDefaultConfig());
    } finally {
      setLoading(false);
    }
  }

  function getDefaultConfig(): DocumentBrandingConfig {
    return {
      showPlatformLogo: true,
      showDealerLogo: true,
      showSellerLogo: false,
      showPlatformName: true,
      showDealerName: true,
      showSellerName: false,
      logoOrder: {
        platform: 1,
        dealer: 2,
        seller: 3,
      },
      nameOrder: {
        platform: 1,
        dealer: 2,
        seller: 3,
      },
      documentTypes: {},
    };
  }

  async function handleSave() {
    if (!config) return;

    try {
      setSaving(true);
      const response = await fetch('/api/settings/document-branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (response.ok) {
        alert('Configuración guardada correctamente');
        await fetchConfig();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al guardar configuración');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  }

  function updateConfig(updates: Partial<DocumentBrandingConfig>) {
    if (!config) return;
    setConfig({ ...config, ...updates });
  }

  function updateDocumentType(type: string, updates: Partial<DocumentTypeConfig>) {
    if (!config) return;
    setConfig({
      ...config,
      documentTypes: {
        ...config.documentTypes,
        [type]: {
          ...config.documentTypes[type as keyof typeof config.documentTypes],
          ...updates,
        },
      },
    });
  }

  function getCurrentConfig(): DocumentBrandingConfig | DocumentTypeConfig {
    if (!config) return getDefaultConfig();
    
    if (activeTab === 'general') {
      return config;
    }
    
    const typeConfig = config.documentTypes[activeTab as keyof typeof config.documentTypes];
    if (typeConfig) {
      return typeConfig;
    }
    
    return {
      showPlatformLogo: config.showPlatformLogo,
      showDealerLogo: config.showDealerLogo,
      showSellerLogo: config.showSellerLogo,
      showPlatformName: config.showPlatformName,
      showDealerName: config.showDealerName,
      showSellerName: config.showSellerName,
    };
  }

  function updateCurrentConfig(updates: Partial<DocumentBrandingConfig | DocumentTypeConfig>) {
    if (!config) return;
    
    if (activeTab === 'general') {
      updateConfig(updates as Partial<DocumentBrandingConfig>);
    } else {
      updateDocumentType(activeTab, updates as Partial<DocumentTypeConfig>);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentConfig = getCurrentConfig();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Branding en Documentos</h1>
        <p className="mt-2 text-gray-600">
          Configura qué logos y nombres aparecen en tus documentos
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'general', label: 'Configuración General' },
            { id: 'certificate', label: 'Certificados' },
            { id: 'contract', label: 'Contratos' },
            { id: 'invoice', label: 'Facturas' },
            { id: 'receipt', label: 'Recibos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Logos Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Logos</h2>
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={(currentConfig as any).showPlatformLogo !== false}
                onChange={(e) => updateCurrentConfig({ showPlatformLogo: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Mostrar Logo de la Plataforma</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={(currentConfig as any).showDealerLogo !== false}
                onChange={(e) => updateCurrentConfig({ showDealerLogo: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Mostrar Logo del Dealer</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={(currentConfig as any).showSellerLogo === true}
                onChange={(e) => updateCurrentConfig({ showSellerLogo: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Mostrar Logo del Vendedor</span>
            </label>
          </div>
        </div>

        {/* Names Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nombres</h2>
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={(currentConfig as any).showPlatformName !== false}
                onChange={(e) => updateCurrentConfig({ showPlatformName: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Mostrar Nombre de la Plataforma</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={(currentConfig as any).showDealerName !== false}
                onChange={(e) => updateCurrentConfig({ showDealerName: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Mostrar Nombre del Dealer</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={(currentConfig as any).showSellerName === true}
                onChange={(e) => updateCurrentConfig({ showSellerName: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Mostrar Nombre del Vendedor</span>
            </label>
          </div>
        </div>

        {/* Preview Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
            <DocumentPreview config={currentConfig as any} />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentPreview({ config }: { config: DocumentTypeConfig }) {
  const logos: Array<{ type: string; label: string }> = [];
  const names: Array<{ type: string; label: string }> = [];

  if (config.showPlatformLogo) {
    logos.push({ type: 'platform', label: 'Logo Plataforma' });
  }
  if (config.showDealerLogo) {
    logos.push({ type: 'dealer', label: 'Logo Dealer' });
  }
  if (config.showSellerLogo) {
    logos.push({ type: 'seller', label: 'Logo Vendedor' });
  }

  if (config.showPlatformName) {
    names.push({ type: 'platform', label: 'AutoDealers' });
  }
  if (config.showDealerName) {
    names.push({ type: 'dealer', label: 'Mi Concesionario' });
  }
  if (config.showSellerName) {
    names.push({ type: 'seller', label: 'Juan Pérez' });
  }

  return (
    <div className="space-y-6">
      {logos.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Logos:</h3>
          <div className="flex items-center space-x-4">
            {logos.map((logo) => (
              <div
                key={logo.type}
                className="w-24 h-24 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-white"
              >
                <span className="text-xs text-gray-500">{logo.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {names.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Nombres:</h3>
          <div className="flex items-center space-x-4">
            {names.map((name, index) => (
              <span
                key={name.type}
                className="text-lg font-semibold text-gray-900"
              >
                {name.label}
                {index < names.length - 1 && <span className="mx-2 text-gray-400">|</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {logos.length === 0 && names.length === 0 && (
        <p className="text-sm text-gray-500 text-center">
          No hay elementos configurados para mostrar
        </p>
      )}
    </div>
  );
}


