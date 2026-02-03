'use client';

import { useState, useEffect } from 'react';
import { verifyAuth } from '@/lib/auth';

interface MetaCredentials {
  appId: string;
  appSecret: string;
}

export default function AdminIntegrationsPage() {
  const [metaCredentials, setMetaCredentials] = useState<MetaCredentials>({
    appId: '',
    appSecret: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  async function fetchCredentials() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/integrations', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.credentials) {
          setMetaCredentials({
            appId: data.credentials.appId || '',
            appSecret: data.credentials.appSecret ? '••••••••••••••••' : '',
          });
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

      if (!metaCredentials.appId) {
        setMessage({ type: 'error', text: 'Por favor ingresa el App ID' });
        return;
      }

      // Si el App Secret está enmascarado o vacío, verificar si ya existe uno guardado
      let appSecret = metaCredentials.appSecret.includes('•') 
        ? undefined 
        : metaCredentials.appSecret;

      // Si el App Secret está vacío y no está enmascarado, requerirlo
      if (!appSecret && !metaCredentials.appSecret.includes('•')) {
        setMessage({ type: 'error', text: 'Por favor ingresa el App Secret' });
        return;
      }

      const response = await fetch('/api/admin/settings/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          appId: metaCredentials.appId,
          appSecret: appSecret,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ type: 'success', text: result.message || 'Credenciales guardadas exitosamente' });
        // Si se guardó exitosamente, enmascarar el secret
        setMetaCredentials(prev => ({ ...prev, appSecret: '••••••••••••••••' }));
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

  async function handleConnectFacebook() {
    try {
      const response = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform: 'facebook' }),
      });

      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setMessage({ type: 'error', text: 'Error al generar URL de autorización' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al conectar Facebook' });
    }
  }

  async function handleConnectInstagram() {
    try {
      const response = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform: 'instagram' }),
      });

      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setMessage({ type: 'error', text: 'Error al generar URL de autorización' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al conectar Instagram' });
    }
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
      <h1 className="text-2xl font-bold mb-6">Configuración de Integraciones</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📘 Credenciales de Meta (Facebook/Instagram)</h2>
        <p className="text-gray-600 mb-6">
          Configura las credenciales de Meta una vez aquí. Todos los sellers y dealers podrán conectar sus cuentas personales de Facebook e Instagram sin necesidad de configurar estas credenciales.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              App ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={metaCredentials.appId}
              onChange={(e) => setMetaCredentials(prev => ({ ...prev, appId: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1234567890123456"
            />
            <p className="text-xs text-gray-500 mt-1">
              Obtén tu App ID desde{' '}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                developers.facebook.com
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              App Secret <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={metaCredentials.appSecret}
              onChange={(e) => setMetaCredentials(prev => ({ ...prev, appSecret: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={metaCredentials.appSecret.includes('•') ? '••••••••••••••••' : 'Ingresa tu App Secret'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Obtén tu App Secret desde la configuración de tu aplicación en Facebook Developers
            </p>
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Credenciales'}
          </button>
        </div>
      </div>

      {/* Sección de OAuth para obtener tokens adicionales */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🔗 Conectar Cuentas (OAuth)</h2>
        <p className="text-gray-600 mb-6">
          Una vez que tengas el App ID y App Secret configurados, puedes obtener tokens de acceso adicionales para Facebook Pages e Instagram Business mediante OAuth.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">📘 Facebook</h3>
            <p className="text-sm text-gray-600 mb-4">
              Conecta tu página de Facebook para publicar posts y gestionar mensajes.
            </p>
            <button
              onClick={handleConnectFacebook}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Conectar Facebook
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">📷 Instagram</h3>
            <p className="text-sm text-gray-600 mb-4">
              Conecta tu cuenta de Instagram Business para publicar contenido.
            </p>
            <button
              onClick={handleConnectInstagram}
              className="w-full bg-pink-600 text-white py-2 px-4 rounded-lg hover:bg-pink-700"
            >
              Conectar Instagram
            </button>
          </div>
        </div>

        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">ℹ️ Nota Importante:</h4>
          <p className="text-sm text-yellow-800">
            Para usar Instagram, primero debes conectar tu cuenta de Instagram Business a tu página de Facebook desde la configuración de Facebook.
            Luego, usa el botón "Conectar Instagram" para autorizar el acceso.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Cómo obtener tus credenciales:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Ve a{' '}
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              developers.facebook.com/apps
            </a>
          </li>
          <li>Crea una nueva aplicación o selecciona una existente</li>
          <li>Ve a "Configuración" → "Básico"</li>
          <li>Copia tu <strong>App ID</strong> y <strong>App Secret</strong></li>
          <li>Agrega el producto "Facebook Login" si no lo tienes</li>
          <li>En "Configuración" → "Básico" → "Dominios de la aplicación", agrega tu dominio</li>
          <li>En "Productos" → "Facebook Login" → "Configuración", agrega la URL de redirección:
            <code className="block bg-white p-2 rounded mt-1 text-xs">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/settings/integrations/callback` : 'https://tu-dominio.com/api/settings/integrations/callback'}
            </code>
          </li>
        </ol>
      </div>
    </div>
  );
}

