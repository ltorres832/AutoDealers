'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CreditProviderCredentials {
  experian?: {
    apiKey: string;
    apiSecret?: string;
    enabled: boolean;
  };
  equifax?: {
    apiKey: string;
    apiSecret?: string;
    enabled: boolean;
  };
  transunion?: {
    apiKey: string;
    apiSecret?: string;
    enabled: boolean;
  };
}

export default function CreditProvidersSettingsPage() {
  const [credentials, setCredentials] = useState<CreditProviderCredentials>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  async function fetchCredentials() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/credit-providers', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.credentials) {
          setCredentials(data.credentials);
        }
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/admin/settings/credit-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ type: 'success', text: result.message || 'Credenciales guardadas exitosamente' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || error.error || 'Error al guardar credenciales' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar credenciales' });
    } finally {
      setSaving(false);
    }
  }

  function updateProvider(provider: 'experian' | 'equifax' | 'transunion', field: string, value: any) {
    setCredentials(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }));
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/admin/settings" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Volver a Configuración
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Proveedores de Reportes de Crédito</h1>
        <p className="text-gray-600">
          Configura las credenciales API para obtener reportes de crédito reales de Experian, Equifax y TransUnion.
        </p>
      </div>

      {/* Experian */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">🏦 Experian</h2>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={credentials.experian?.enabled || false}
              onChange={(e) => updateProvider('experian', 'enabled', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Habilitado</span>
          </label>
        </div>
        <p className="text-gray-600 mb-4 text-sm">
          Configura tus credenciales de Experian para obtener reportes de crédito reales.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={credentials.experian?.apiKey || ''}
              onChange={(e) => updateProvider('experian', 'apiKey', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu API Key de Experian"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              API Secret (Opcional)
            </label>
            <input
              type="password"
              value={credentials.experian?.apiSecret || ''}
              onChange={(e) => updateProvider('experian', 'apiSecret', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu API Secret de Experian"
            />
          </div>
        </div>
      </div>

      {/* Equifax */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">🏦 Equifax</h2>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={credentials.equifax?.enabled || false}
              onChange={(e) => updateProvider('equifax', 'enabled', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Habilitado</span>
          </label>
        </div>
        <p className="text-gray-600 mb-4 text-sm">
          Configura tus credenciales de Equifax para obtener reportes de crédito reales.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={credentials.equifax?.apiKey || ''}
              onChange={(e) => updateProvider('equifax', 'apiKey', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu API Key de Equifax"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              API Secret (Opcional)
            </label>
            <input
              type="password"
              value={credentials.equifax?.apiSecret || ''}
              onChange={(e) => updateProvider('equifax', 'apiSecret', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu API Secret de Equifax"
            />
          </div>
        </div>
      </div>

      {/* TransUnion */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">🏦 TransUnion</h2>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={credentials.transunion?.enabled || false}
              onChange={(e) => updateProvider('transunion', 'enabled', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Habilitado</span>
          </label>
        </div>
        <p className="text-gray-600 mb-4 text-sm">
          Configura tus credenciales de TransUnion para obtener reportes de crédito reales.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={credentials.transunion?.apiKey || ''}
              onChange={(e) => updateProvider('transunion', 'apiKey', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu API Key de TransUnion"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              API Secret (Opcional)
            </label>
            <input
              type="password"
              value={credentials.transunion?.apiSecret || ''}
              onChange={(e) => updateProvider('transunion', 'apiSecret', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu API Secret de TransUnion"
            />
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : 'Guardar Credenciales'}
        </button>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Información:</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-blue-800">
          <li>Las credenciales se guardan de forma segura en Firestore</li>
          <li>Si no configuras credenciales, el sistema usará datos mock (simulados) para desarrollo</li>
          <li>Para obtener credenciales reales, contacta con los proveedores directamente:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li><strong>Experian:</strong> <a href="https://www.experian.com/business/solutions/credit-api" target="_blank" rel="noopener noreferrer" className="underline">experian.com/business</a></li>
              <li><strong>Equifax:</strong> <a href="https://www.equifax.com/business/credit-risk" target="_blank" rel="noopener noreferrer" className="underline">equifax.com/business</a></li>
              <li><strong>TransUnion:</strong> <a href="https://www.transunion.com/business" target="_blank" rel="noopener noreferrer" className="underline">transunion.com/business</a></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
}


