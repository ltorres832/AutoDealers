'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RewardConfig {
  seller: {
    basic: {
      discountPercent: number;
      freeMonths: number;
      promotions: number;
      banners: number;
      contentDays: number; // Días válidos para todos los tipos de contenido después de usar
    };
    professional: {
      discountPercent: number;
      freeMonths: number;
      promotions: number;
      banners: number;
      contentDays: number;
    };
    premium: {
      discountPercent: number;
      freeMonths: number;
      promotions: number;
      banners: number;
      contentDays: number;
    };
  };
  dealer: {
    basic: {
      discountPercent: number;
      freeMonths: number;
      promotions: number;
      banners: number;
      contentDays: number;
    };
    professional: {
      discountPercent: number;
      freeMonths: number;
      promotions: number;
      banners: number;
      contentDays: number;
    };
    premium: {
      discountPercent: number;
      freeMonths: number;
      promotions: number;
      banners: number;
      contentDays: number;
    };
  };
}

export default function ReferralConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<RewardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      setLoading(true);
      setMessage('');
      
      // Obtener token de localStorage o cookies
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('authToken') || 
          document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1]
        : null;
      
      console.log('🔐 Fetching config - Token:', token ? `${token.substring(0, 20)}...` : 'No token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/admin/referrals/config', {
        credentials: 'include',
        headers,
      });
      
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        if (response.ok) {
          const data = await response.json();
          if (data.config) {
            setConfig(data.config);
            setMessage(''); // Limpiar cualquier error previo
          } else {
            setMessage('Error: La configuración recibida está vacía');
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
          const errorMsg = errorData.error || errorData.details || `Error ${response.status}: ${response.statusText}`;
          setMessage(`Error: ${errorMsg}`);
          console.error('Error response:', { status: response.status, errorData });
        }
      } else {
        const text = await response.text().catch(() => '');
        setMessage(`Error: El servidor devolvió una respuesta inválida (${response.status}). ${text.substring(0, 200)}`);
        console.error('Invalid response:', { status: response.status, contentType, text: text.substring(0, 200) });
      }
    } catch (error: any) {
      console.error('Error fetching config:', error);
      setMessage(`Error: ${error.message || 'Error al cargar configuración. Verifica tu conexión y que estés autenticado.'}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    if (!config) return;

    try {
      setSaving(true);
      setMessage('');
      
      // Obtener token de localStorage o cookies
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('authToken') || 
          document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1]
        : null;
      
      const response = await fetch('/api/admin/referrals/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        setMessage('Configuración guardada correctamente');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`Error: ${error.error}`);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  function updateConfig(
    userType: 'seller' | 'dealer',
    membershipType: 'basic' | 'professional' | 'premium',
    field: string,
    value: number
  ) {
    if (!config) return;
    setConfig({
      ...config,
      [userType]: {
        ...config[userType],
        [membershipType]: {
          ...config[userType][membershipType],
          [field]: value,
        },
      },
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <h2 className="font-semibold mb-2">Error cargando configuración</h2>
          <p className="text-sm">
            {message || 'No se pudo cargar la configuración de recompensas. Por favor, intenta recargar la página.'}
          </p>
          <button
            onClick={fetchConfig}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Configuración de Recompensas</h1>
        <button
          onClick={() => router.push('/admin/referrals')}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          ← Volver
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Configuración para Vendedores */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Vendedores</h2>
        
        {(['basic', 'professional', 'premium'] as const).map((membershipType) => (
          <div key={membershipType} className="mb-6 border-b border-gray-200 pb-6 last:border-0">
            <h3 className="text-xl font-medium text-gray-800 mb-4 capitalize">{membershipType}</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descuento (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.seller[membershipType].discountPercent}
                  onChange={(e) => updateConfig('seller', membershipType, 'discountPercent', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meses Gratis
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.seller[membershipType].freeMonths}
                  onChange={(e) => updateConfig('seller', membershipType, 'freeMonths', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promociones
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.seller[membershipType].promotions}
                  onChange={(e) => updateConfig('seller', membershipType, 'promotions', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banners
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.seller[membershipType].banners}
                  onChange={(e) => updateConfig('seller', membershipType, 'banners', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Días Válidos Contenido (después de usar)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={config.seller[membershipType].contentDays}
                  onChange={(e) => updateConfig('seller', membershipType, 'contentDays', parseInt(e.target.value) || 7)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Días que el contenido (promociones, banners, anuncios, etc.) será válido después de ser usado/activado, sin importar la ubicación (mínimo 1 día)
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuración para Dealers */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Dealers</h2>
        
        {(['basic', 'professional', 'premium'] as const).map((membershipType) => (
          <div key={membershipType} className="mb-6 border-b border-gray-200 pb-6 last:border-0">
            <h3 className="text-xl font-medium text-gray-800 mb-4 capitalize">{membershipType}</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descuento (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.dealer[membershipType].discountPercent}
                  onChange={(e) => updateConfig('dealer', membershipType, 'discountPercent', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meses Gratis
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.dealer[membershipType].freeMonths}
                  onChange={(e) => updateConfig('dealer', membershipType, 'freeMonths', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promociones
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.dealer[membershipType].promotions}
                  onChange={(e) => updateConfig('dealer', membershipType, 'promotions', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banners
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.dealer[membershipType].banners}
                  onChange={(e) => updateConfig('dealer', membershipType, 'banners', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Días Válidos Contenido (después de usar)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={config.dealer[membershipType].contentDays}
                  onChange={(e) => updateConfig('dealer', membershipType, 'contentDays', parseInt(e.target.value) || 7)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Días que el contenido (promociones, banners, anuncios, etc.) será válido después de ser usado/activado, sin importar la ubicación (mínimo 1 día)
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </div>
  );
}

