'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ZohoMailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  domain: string;
  organizationId: string;
  smtpUser: string;
  smtpPassword: string;
}

export default function ZohoMailSettingsPage() {
  const [config, setConfig] = useState<ZohoMailConfig>({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    domain: '',
    organizationId: '',
    smtpUser: '',
    smtpPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/zoho-mail');
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (error) {
      console.error('Error fetching Zoho Mail config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    try {
      setSaving(true);
      setTestResult(null);
      const response = await fetch('/api/admin/settings/zoho-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        alert('✅ Configuración de Zoho Mail guardada exitosamente');
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error || 'Error al guardar'}`);
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message || 'Error al guardar'}`);
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    try {
      setTesting(true);
      setTestResult(null);
      const response = await fetch('/api/admin/settings/zoho-mail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      const data = await response.json();
      setTestResult({
        success: data.success || false,
        message: data.message || 'Error desconocido',
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Error al probar conexión',
      });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/admin/settings" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Volver a Configuración
      </Link>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración de Zoho Mail</h1>
        <p className="text-gray-600 mb-6">
          Configura las credenciales de Zoho Mail para gestionar emails corporativos y aliases
        </p>

        {/* Información de ayuda */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📚 Cómo obtener las credenciales:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>Ve a <a href="https://api-console.zoho.com" target="_blank" rel="noopener noreferrer" className="underline">Zoho API Console</a></li>
            <li>Crea una nueva aplicación OAuth 2.0</li>
            <li>Configura los scopes: <code className="bg-blue-100 px-1 rounded">ZohoMail.accounts.READ, ZohoMail.accounts.WRITE</code></li>
            <li>Genera un Refresh Token usando el Authorization Code</li>
            <li>Obtén el Organization ID desde tu cuenta de Zoho Mail</li>
          </ol>
        </div>

        {/* Configuración API */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Credenciales API de Zoho Mail</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="1000.XXXXXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={config.clientSecret}
                onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="XXXXXXXXXXXXXXXXXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Token</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={config.refreshToken}
                onChange={(e) => setConfig({ ...config, refreshToken: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dominio Base</label>
              <input
                type="text"
                value={config.domain}
                onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="autoplataforma.com"
              />
              <p className="text-xs text-gray-500 mt-1">Dominio base para emails corporativos (ej: autoplataforma.com)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization ID</label>
              <input
                type="text"
                value={config.organizationId}
                onChange={(e) => setConfig({ ...config, organizationId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="123456789"
              />
              <p className="text-xs text-gray-500 mt-1">ID de tu organización en Zoho Mail</p>
            </div>
          </div>
        </div>

        {/* Configuración SMTP */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Configuración SMTP (Opcional)</h2>
          <p className="text-sm text-gray-600 mb-4">
            Para envíos transaccionales de email (notificaciones, confirmaciones, etc.)
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP User</label>
              <input
                type="text"
                value={config.smtpUser}
                onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="sistema@autodealers.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={config.smtpPassword}
                onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Password o App Password de Zoho"
              />
            </div>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {testResult.success ? '✅' : '❌'} {testResult.message}
          </div>
        )}

        {/* Botones */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showSecrets"
              checked={showSecrets}
              onChange={(e) => setShowSecrets(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="showSecrets" className="text-sm text-gray-700">
              Mostrar credenciales
            </label>
          </div>
          <div className="flex gap-4">
            <button
              onClick={testConnection}
              disabled={testing || saving}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {testing ? 'Probando...' : 'Probar Conexión'}
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



