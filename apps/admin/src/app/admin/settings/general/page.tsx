'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SystemSettings {
  // Información de la Plataforma
  platformName: string;
  platformDescription: string;
  platformEmail: string;
  platformPhone: string;
  platformWebsite: string;
  platformAddress: string;
  // Configuración del Sistema
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  defaultMembershipId: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  aiEnabled: boolean;
  maxVehiclesPerTenant: number;
  maxUsersPerTenant: number;
}

interface CredentialsConfig {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePublishableKey: string;
  openaiApiKey: string;
  metaAppId: string;
  metaAppSecret: string;
  metaVerifyToken: string;
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappWebhookVerifyToken: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  emailApiKey: string;
  emailFromAddress: string;
}

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    platformName: 'AutoDealers',
    platformDescription: 'Plataforma SaaS para dealers de autos y vendedores individuales',
    platformEmail: 'info@autodealers.com',
    platformPhone: '',
    platformWebsite: 'https://autodealers.com',
    platformAddress: '',
    maintenanceMode: false,
    allowNewRegistrations: true,
    defaultMembershipId: '',
    emailNotifications: true,
    smsNotifications: true,
    aiEnabled: true,
    maxVehiclesPerTenant: 1000,
    maxUsersPerTenant: 50,
  });

  const [credentials, setCredentials] = useState<CredentialsConfig>({
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripePublishableKey: '',
    openaiApiKey: '',
    metaAppId: '',
    metaAppSecret: '',
    metaVerifyToken: '',
    whatsappAccessToken: '',
    whatsappPhoneNumberId: '',
    whatsappWebhookVerifyToken: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    emailApiKey: '',
    emailFromAddress: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingStripe, setTestingStripe] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSettings();
    fetchCredentials();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCredentials() {
    try {
      const response = await fetch('/api/admin/settings/credentials', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.credentials) {
        // Guardar las credenciales originales (enmascaradas) para referencia
        // El backend ya las envía enmascaradas, así que las usamos directamente
        setCredentials((prev) => {
          // Solo actualizar campos que existen en la respuesta, mantener los demás
          const updated = { ...prev };
          Object.keys(data.credentials).forEach((key) => {
            // Si el valor viene enmascarado del backend, mantenerlo
            // Si viene vacío pero ya teníamos un valor enmascarado, mantener el anterior
            if (data.credentials[key]) {
              updated[key as keyof CredentialsConfig] = data.credentials[key];
            } else if (!prev[key as keyof CredentialsConfig] || !prev[key as keyof CredentialsConfig].toString().startsWith('••••')) {
              // Si no hay valor previo o el previo no está enmascarado, usar el nuevo (vacío)
              updated[key as keyof CredentialsConfig] = data.credentials[key] || '';
            }
            // Si el previo está enmascarado y el nuevo está vacío, mantener el previo
          });
          return updated;
        });
      }
    } catch (error: any) {
      console.error('Error fetching credentials:', error);
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error('⚠️ No se pudo conectar con el servidor. Verifica que esté corriendo en el puerto 3001.');
      }
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Configuración guardada exitosamente');
      } else {
        alert('Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  }

  async function saveCredentials() {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/credentials', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      let data: any;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Error al parsear respuesta JSON:', jsonError);
        throw new Error(`Error del servidor (${response.status}): ${response.statusText}`);
      }

      if (response.ok) {
        alert('Credenciales guardadas y sincronizadas exitosamente');
        // Recargar credenciales para mostrar valores enmascarados
        fetchCredentials();
      } else {
        const errorMessage = data.message || data.error || `Error ${response.status}: ${response.statusText}`;
        const errorCode = data.code || '';
        const errorDetails = data.details || '';
        
        console.error('❌ Error guardando credenciales:', {
          status: response.status,
          error: errorMessage,
          code: errorCode,
          details: errorDetails,
          fullData: data
        });
        
        let alertMessage = `Error al guardar credenciales: ${errorMessage}`;
        if (errorCode) {
          alertMessage += `\nCódigo: ${errorCode}`;
        }
        if (errorDetails && process.env.NODE_ENV === 'development') {
          console.error('Detalles del error:', errorDetails);
        }
        
        alert(alertMessage);
      }
    } catch (error: any) {
      console.error('Error completo:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      let errorMessage = 'Error de conexión';
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        errorMessage = 'No se pudo conectar con el servidor. Verifica que el servidor esté corriendo en el puerto 3001.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Error al guardar credenciales: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  }

  async function testStripeConnection() {
    setTestingStripe(true);
    try {
      const response = await fetch('/api/admin/settings/test/stripe', {
        method: 'POST',
      });

      const data = await response.json();
      setTestResults({ ...testResults, stripe: data.success });
      
      if (data.success) {
        alert('Conexión con Stripe exitosa');
      } else {
        alert('Error al conectar con Stripe: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error:', error);
      setTestResults({ ...testResults, stripe: false });
      alert('Error al probar conexión con Stripe');
    } finally {
      setTestingStripe(false);
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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/settings" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Volver a Configuración
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración General</h1>
        <p className="text-gray-600">
          Control total sobre la configuración global de la plataforma y credenciales
        </p>
      </div>

      {/* Información de la Plataforma */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-6">Información de la Plataforma</h2>
        <p className="text-sm text-gray-600 mb-6">
          Esta información se mostrará en emails, notificaciones y documentos del sistema
        </p>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre de la Plataforma *
              </label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) =>
                  setSettings({ ...settings, platformName: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="AutoDealers"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Este nombre aparecerá en emails y notificaciones
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Sitio Web
              </label>
              <input
                type="url"
                value={settings.platformWebsite}
                onChange={(e) =>
                  setSettings({ ...settings, platformWebsite: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="https://autodealers.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Descripción de la Plataforma
            </label>
            <textarea
              value={settings.platformDescription}
              onChange={(e) =>
                setSettings({ ...settings, platformDescription: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              rows={3}
              placeholder="Descripción breve de la plataforma..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Email de Contacto
              </label>
              <input
                type="email"
                value={settings.platformEmail}
                onChange={(e) =>
                  setSettings({ ...settings, platformEmail: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="info@autodealers.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                value={settings.platformPhone}
                onChange={(e) =>
                  setSettings({ ...settings, platformPhone: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Dirección
            </label>
            <input
              type="text"
              value={settings.platformAddress}
              onChange={(e) =>
                setSettings({ ...settings, platformAddress: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              placeholder="Dirección completa de la empresa"
            />
          </div>

          <div className="pt-4 border-t">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Información de la Plataforma'}
            </button>
          </div>
        </div>
      </div>

      {/* Configuración del Sistema */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-6">Configuración del Sistema</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Configuración General</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenanceMode: e.target.checked })
                  }
                  className="w-5 h-5"
                />
                <div>
                  <span className="font-medium">Modo Mantenimiento</span>
                  <p className="text-sm text-gray-600">
                    Bloquea el acceso de todos los usuarios excepto admins
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={settings.allowNewRegistrations}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allowNewRegistrations: e.target.checked,
                    })
                  }
                  className="w-5 h-5"
                />
                <div>
                  <span className="font-medium">Permitir Nuevos Registros</span>
                  <p className="text-sm text-gray-600">
                    Permite que nuevos dealers/sellers se registren
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emailNotifications: e.target.checked,
                    })
                  }
                  className="w-5 h-5"
                />
                <span className="font-medium">Notificaciones por Email</span>
              </label>

              <label className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      smsNotifications: e.target.checked,
                    })
                  }
                  className="w-5 h-5"
                />
                <span className="font-medium">Notificaciones por SMS</span>
              </label>

              <label className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={settings.aiEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, aiEnabled: e.target.checked })
                  }
                  className="w-5 h-5"
                />
                <div>
                  <span className="font-medium">IA Habilitada Globalmente</span>
                  <p className="text-sm text-gray-600">
                    Activa o desactiva la IA para toda la plataforma
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Límites del Sistema</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Máximo de Vehículos por Tenant
                </label>
                <input
                  type="number"
                  value={settings.maxVehiclesPerTenant}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxVehiclesPerTenant: parseInt(e.target.value),
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Máximo de Usuarios por Tenant
                </label>
                <input
                  type="number"
                  value={settings.maxUsersPerTenant}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxUsersPerTenant: parseInt(e.target.value),
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </div>
      </div>

      {/* Credenciales e Integraciones */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-6">Credenciales e Integraciones</h2>
        <p className="text-sm text-gray-600 mb-6">
          Las credenciales se sincronizan automáticamente en toda la plataforma en tiempo real
        </p>

        <div className="space-y-6">
          {/* Stripe */}
          <div className="border-b pb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Stripe</h3>
                <p className="text-sm text-gray-600">Configuración de pagos y suscripciones</p>
              </div>
              <button
                onClick={testStripeConnection}
                disabled={testingStripe}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
              >
                {testingStripe ? 'Probando...' : 'Probar Conexión'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Secret Key (Server-side)
                </label>
                <input
                  type="password"
                  value={credentials.stripeSecretKey}
                  onChange={(e) =>
                    setCredentials({ ...credentials, stripeSecretKey: e.target.value })
                  }
                  placeholder="sk_live_... o sk_test_..."
                  className="w-full border rounded px-3 py-2 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usada en el servidor para procesar pagos
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Publishable Key (Client-side)
                </label>
                <input
                  type="text"
                  value={credentials.stripePublishableKey}
                  onChange={(e) =>
                    setCredentials({ ...credentials, stripePublishableKey: e.target.value })
                  }
                  placeholder="pk_live_... o pk_test_..."
                  className="w-full border rounded px-3 py-2 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usada en el frontend para formularios de pago
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Webhook Secret
                </label>
                <input
                  type="password"
                  value={credentials.stripeWebhookSecret}
                  onChange={(e) =>
                    setCredentials({ ...credentials, stripeWebhookSecret: e.target.value })
                  }
                  placeholder="whsec_..."
                  className="w-full border rounded px-3 py-2 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Para verificar eventos de Stripe
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ✅ <strong>Las credenciales se sincronizan automáticamente</strong> con toda la plataforma (admin, dealer, seller, advertiser, public-web) y se usan en tiempo real desde Firestore.
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Si no se configuran aquí, el sistema usará las variables de entorno como respaldo.
              </p>
            </div>
          </div>

          {/* OpenAI */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-2">OpenAI (Inteligencia Artificial)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Configura la API Key de OpenAI para habilitar las funcionalidades de IA:
              clasificación automática de leads, respuestas automáticas, generación de contenido y más.
              Obtén tu API Key en{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                platform.openai.com/api-keys
              </a>
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">
                API Key
              </label>
              <input
                type="password"
                value={credentials.openaiApiKey}
                onChange={(e) =>
                  setCredentials({ ...credentials, openaiApiKey: e.target.value })
                }
                placeholder="sk-..."
                className="w-full border rounded px-3 py-2 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Las credenciales se sincronizan automáticamente en toda la plataforma
              </p>
            </div>
          </div>

          {/* Meta (Facebook/Instagram/WhatsApp) */}
          <div className="border-b pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Meta (Facebook/Instagram)</h3>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/settings/credentials/verify', {
                        credentials: 'include',
                      });
                      const data = await response.json();
                      if (data.exists) {
                        const meta = data.credentials.meta;
                        let message = '✅ Credenciales de Meta guardadas:\n\n';
                        message += `App ID: ${meta.appId ? '✅ (' + meta.appIdLength + ' caracteres)' : '❌ No guardado'}\n`;
                        message += `App Secret: ${meta.appSecret ? '✅ (' + meta.appSecretLength + ' caracteres)' : '❌ No guardado'}\n`;
                        message += `Verify Token: ${meta.verifyToken ? '✅ (' + meta.verifyTokenLength + ' caracteres)' : '❌ No guardado'}\n`;
                        if (meta.appIdPreview) {
                          message += `\nApp ID preview: ${meta.appIdPreview}`;
                        }
                        if (meta.appSecretPreview) {
                          message += `\nApp Secret preview: ${meta.appSecretPreview}`;
                        }
                        alert(message);
                      } else {
                        alert('❌ No hay credenciales guardadas');
                      }
                    } catch (error: any) {
                      alert('Error al verificar: ' + error.message);
                    }
                  }}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  🔍 Verificar
                </button>
                <button
                  onClick={async (e) => {
                    const button = e.currentTarget;
                    const originalText = button.textContent;
                    try {
                      button.disabled = true;
                      button.textContent = 'Probando...';
                      
                      const response = await fetch('/api/admin/settings/credentials/test-meta', {
                        method: 'POST',
                        credentials: 'include',
                      });
                      
                      const data = await response.json();
                      
                      if (data.success) {
                        let message = '✅ CREDENCIALES VÁLIDAS\n\n';
                        message += `App ID: ✅ Válido\n`;
                        message += `App Secret: ✅ Válido\n`;
                        message += `\nFacebook: ✅ Accesible\n`;
                        message += `Instagram: ✅ Accesible\n`;
                        if (data.appName) {
                          message += `\nNombre de la App: ${data.appName}`;
                        }
                        message += `\n\n${data.message || ''}`;
                        if (data.note) {
                          message += `\n\nℹ️ Nota: ${data.note}`;
                        }
                        alert(message);
                      } else {
                        let message = '❌ ERROR EN CREDENCIALES\n\n';
                        message += `Error: ${data.error || 'Desconocido'}\n`;
                        if (data.details) {
                          message += `\nDetalles: ${data.details}`;
                        }
                        alert(message);
                      }
                    } catch (error: any) {
                      alert('Error al probar: ' + error.message);
                    } finally {
                      button.disabled = false;
                      button.textContent = originalText || '🧪 Probar Conexión';
                    }
                  }}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  🧪 Probar Conexión
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  App ID
                </label>
                <input
                  type="text"
                  value={credentials.metaAppId}
                  onChange={(e) =>
                    setCredentials({ ...credentials, metaAppId: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="1234567890123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  App Secret
                </label>
                <input
                  type="password"
                  value={credentials.metaAppSecret}
                  onChange={(e) =>
                    setCredentials({ ...credentials, metaAppSecret: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="••••••••••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Verify Token
                </label>
                <input
                  type="text"
                  value={credentials.metaVerifyToken}
                  onChange={(e) =>
                    setCredentials({ ...credentials, metaVerifyToken: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="tu-verify-token"
                />
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">WhatsApp Business API</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Access Token
                </label>
                <input
                  type="password"
                  value={credentials.whatsappAccessToken}
                  onChange={(e) =>
                    setCredentials({ ...credentials, whatsappAccessToken: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={credentials.whatsappPhoneNumberId}
                  onChange={(e) =>
                    setCredentials({ ...credentials, whatsappPhoneNumberId: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Webhook Verify Token
                </label>
                <input
                  type="text"
                  value={credentials.whatsappWebhookVerifyToken}
                  onChange={(e) =>
                    setCredentials({ ...credentials, whatsappWebhookVerifyToken: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Twilio (SMS) */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">Twilio (SMS)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Account SID
                </label>
                <input
                  type="text"
                  value={credentials.twilioAccountSid}
                  onChange={(e) =>
                    setCredentials({ ...credentials, twilioAccountSid: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Auth Token
                </label>
                <input
                  type="password"
                  value={credentials.twilioAuthToken}
                  onChange={(e) =>
                    setCredentials({ ...credentials, twilioAuthToken: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={credentials.twilioPhoneNumber}
                  onChange={(e) =>
                    setCredentials({ ...credentials, twilioPhoneNumber: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Email (SendGrid/Resend)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={credentials.emailApiKey}
                  onChange={(e) =>
                    setCredentials({ ...credentials, emailApiKey: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  From Address
                </label>
                <input
                  type="email"
                  value={credentials.emailFromAddress}
                  onChange={(e) =>
                    setCredentials({ ...credentials, emailFromAddress: e.target.value })
                  }
                  placeholder="noreply@autodealers.com"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <button
              onClick={saveCredentials}
              disabled={saving}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando y Sincronizando...' : 'Guardar y Sincronizar Credenciales'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



