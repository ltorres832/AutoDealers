'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PLATFORM_URLS, resolveAdminUrl } from '@autodealers/shared/platform-urls';
import { ENABLE_TIKTOK_YOUTUBE_PUBLISH } from '@autodealers/core/social-video-platforms';

const ADMIN_STRIPE_WEBHOOK_URL = `${resolveAdminUrl()}/api/webhooks/stripe`;

function isMaskedCredential(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith('••••');
}

/** Al cambiar Stripe hay que pegar sk_ y pk_ completas; si queda •••• se conserva la clave antigua. */
function validateStripeCredentialsBeforeSave(credentials: CredentialsConfig): string | null {
  const sk = credentials.stripeSecretKey?.trim() || '';
  const pk = credentials.stripePublishableKey?.trim() || '';
  const skNew = sk.length > 0 && !isMaskedCredential(sk);
  const pkNew = pk.length > 0 && !isMaskedCredential(pk);

  if (!skNew && !pkNew) return null;

  if (skNew !== pkNew) {
    return (
      'Para actualizar Stripe debes pegar las DOS claves completas desde el Dashboard (sk_live_... y pk_live_...). ' +
      'Si un campo muestra ••••, haz clic en él, bórralo y pega la clave live completa.'
    );
  }

  const skLive = sk.startsWith('sk_live_');
  const pkLive = pk.startsWith('pk_live_');
  if (skLive !== pkLive) {
    return 'Secret Key y Publishable Key deben ser del mismo modo (ambas live o ambas test).';
  }

  return null;
}

function clearMaskedStripeField(
  field: 'stripeSecretKey' | 'stripePublishableKey',
  credentials: CredentialsConfig,
  setCredentials: (value: CredentialsConfig | ((prev: CredentialsConfig) => CredentialsConfig)) => void
) {
  if (isMaskedCredential(credentials[field])) {
    setCredentials({ ...credentials, [field]: '' });
  }
}

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
  stripeAdvertiserWebhookSecret: string;
  stripePublishableKey: string;
  openaiApiKey: string;
  metaAppId: string;
  metaAppSecret: string;
  metaVerifyToken: string;
  tiktokClientKey: string;
  tiktokClientSecret: string;
  youtubeClientId: string;
  youtubeClientSecret: string;
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
    platformName: 'AutoDealersOnline',
    platformDescription: 'Plataforma SaaS para dealers de autos y vendedores individuales',
    platformEmail: 'info@autodealers-online.com',
    platformPhone: '',
    platformWebsite: PLATFORM_URLS.public,
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
    stripeAdvertiserWebhookSecret: '',
    stripePublishableKey: '',
    openaiApiKey: '',
    metaAppId: '',
    metaAppSecret: '',
    metaVerifyToken: '',
    tiktokClientKey: '',
    tiktokClientSecret: '',
    youtubeClientId: '',
    youtubeClientSecret: '',
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
  const [syncingStripeWebhook, setSyncingStripeWebhook] = useState(false);
  const [stripeWebhookMessage, setStripeWebhookMessage] = useState('');
  const [stripeSetupStatus, setStripeSetupStatus] = useState<{
    mode?: string;
    accountName?: string | null;
    webhookReady?: boolean;
    connectTransfersEnabled?: boolean;
  } | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingPasswordReset, setTestingPasswordReset] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testPasswordResetAddress, setTestPasswordResetAddress] = useState('');
  const [emailTestMessage, setEmailTestMessage] = useState<string | null>(null);
  const [passwordResetTestMessage, setPasswordResetTestMessage] = useState<string | null>(null);
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
          const updated = { ...prev };
          const stripeFields = ['stripeSecretKey', 'stripePublishableKey'] as const;
          Object.keys(data.credentials).forEach((key) => {
            const k = key as keyof CredentialsConfig;
            const prevVal = prev[k];
            if (
              stripeFields.includes(key as (typeof stripeFields)[number]) &&
              typeof prevVal === 'string' &&
              prevVal.length > 0 &&
              !prevVal.startsWith('••••')
            ) {
              return;
            }
            if (data.credentials[key]) {
              updated[k] = data.credentials[key];
            } else if (!prev[k] || !String(prev[k]).startsWith('••••')) {
              updated[k] = data.credentials[key] || '';
            }
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

  async function saveStripeCredentials() {
    const sk = credentials.stripeSecretKey?.trim() || '';
    const pk = credentials.stripePublishableKey?.trim() || '';

    if (isMaskedCredential(sk) || isMaskedCredential(pk) || !sk || !pk) {
      alert(
        'Haz clic en Secret Key y Publishable Key, bórra los •••• y pega sk_live_ y pk_live_ completas desde Stripe (modo Live).'
      );
      return;
    }

    if (!sk.startsWith('sk_live_') || !pk.startsWith('pk_live_')) {
      alert('Ambas claves deben ser LIVE (sk_live_... y pk_live_...).');
      return;
    }

    setSaving(true);
    setStripeWebhookMessage('');
    try {
      const response = await fetch('/api/admin/settings/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stripeSecretKey: sk, stripePublishableKey: pk }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok && response.status !== 207) {
        alert(data.error || data.message || `Error ${response.status}`);
        return;
      }

      if (data.noChanges || data.message?.includes('No hay cambios')) {
        alert(
          'No se guardaron las claves. Asegúrate de pegar sk_live_ y pk_live_ completas (sin ••••).'
        );
        return;
      }

      if (data.stripeSetup?.status) {
        setStripeSetupStatus({
          mode: data.stripeSetup.status.mode,
          accountName: data.stripeSetup.validation?.accountName,
          webhookReady: data.stripeSetup.status.webhookReady,
          connectTransfersEnabled: data.stripeSetup.status.connectTransfersEnabled,
        });
      }
      setStripeWebhookMessage(data.stripeSetup?.message || data.message || 'Claves Stripe guardadas');
      await fetchCredentials();
    } catch (error) {
      console.error(error);
      alert('Error al guardar claves Stripe');
    } finally {
      setSaving(false);
    }
  }

  async function saveCredentials() {
    const stripeValidationError = validateStripeCredentialsBeforeSave(credentials);
    if (stripeValidationError) {
      alert(stripeValidationError);
      return;
    }

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

      if (response.ok || response.status === 207) {
        if (
          data.noChanges ||
          (typeof data.message === 'string' && data.message.includes('No hay cambios para guardar'))
        ) {
          setStripeWebhookMessage(data.message);
          alert(
            'No se guardaron cambios en Stripe (campos con ••••). Usa el botón «Guardar claves Stripe» después de pegar sk_live_ y pk_live_ completas.'
          );
          return;
        }

        if (data.stripeSetup?.status) {
          setStripeSetupStatus({
            mode: data.stripeSetup.status.mode,
            accountName: data.stripeSetup.validation?.accountName,
            webhookReady: data.stripeSetup.status.webhookReady,
            connectTransfersEnabled: data.stripeSetup.status.connectTransfersEnabled,
          });
          setStripeWebhookMessage(data.stripeSetup.message || data.message);
        } else if (data.stripeSetupError) {
          setStripeWebhookMessage(
            `Credenciales guardadas, pero la activación automática falló: ${data.stripeSetupError}`
          );
        } else if (data.message) {
          setStripeWebhookMessage(data.message);
        } else {
          setStripeWebhookMessage('Credenciales guardadas y sincronizadas');
        }
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

  async function syncStripeWebhook() {
    setSyncingStripeWebhook(true);
    setStripeWebhookMessage('');
    try {
      const response = await fetch('/api/admin/stripe/ensure-webhook', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo sincronizar el webhook');
      }
      const note = data.appHostingWebhookNote ? ` ${data.appHostingWebhookNote}` : '';
      setStripeWebhookMessage(`${data.message || 'Webhook sincronizado'}${note}`);
      if (data.result?.webhookSecret) {
        setCredentials((prev) => ({
          ...prev,
          stripeWebhookSecret: data.result.webhookSecret,
        }));
      }
      if (data.status) {
        setStripeSetupStatus({
          mode: data.status.mode,
          accountName: data.status.accountName,
          webhookReady: data.status.webhookReady,
          connectTransfersEnabled: data.status.connectTransfersEnabled,
        });
      }
    } catch (error) {
      setStripeWebhookMessage(
        error instanceof Error ? error.message : 'Error al sincronizar webhook'
      );
    } finally {
      setSyncingStripeWebhook(false);
    }
  }

  async function testStripeConnection() {
    setTestingStripe(true);
    setStripeWebhookMessage('');
    try {
      const payload: Record<string, string> = {};
      if (credentials.stripeSecretKey && !credentials.stripeSecretKey.startsWith('••••')) {
        payload.stripeSecretKey = credentials.stripeSecretKey;
      }
      if (credentials.stripePublishableKey && !credentials.stripePublishableKey.startsWith('••••')) {
        payload.stripePublishableKey = credentials.stripePublishableKey;
      }

      const response = await fetch('/api/admin/settings/test/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setTestResults({ ...testResults, stripe: data.success });

      if (data.success) {
        setStripeSetupStatus({
          mode: data.mode,
          accountName: data.accountName,
          webhookReady: data.webhookSecretConfigured,
          connectTransfersEnabled: data.connectTransfersEnabled,
        });
        setStripeWebhookMessage(
          `${data.message}${data.accountName ? ` · ${data.accountName}` : ''}${
            data.connectTransfersEnabled === false
              ? ' · Connect transfers pendientes en Stripe'
              : ''
          } · Pulsa «Guardar y Sincronizar Credenciales» abajo para aplicar en producción.`
        );
      } else {
        setStripeWebhookMessage(
          [data.error, data.hint].filter(Boolean).join(' — ') || 'Error al conectar con Stripe'
        );
      }
    } catch (error) {
      console.error('Error:', error);
      setTestResults({ ...testResults, stripe: false });
      setStripeWebhookMessage('Error al probar conexión con Stripe');
    } finally {
      setTestingStripe(false);
    }
  }

  async function testEmailConnection() {
    const email = testEmailAddress.trim();
    if (!email) return;

    setTestingEmail(true);
    setEmailTestMessage(null);
    try {
      const response = await fetch('/api/admin/settings/test/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      setTestResults({ ...testResults, email: Boolean(data.success) });

      if (data.success) {
        setEmailTestMessage(`OK: enviado por ${data.provider}. From: ${data.from}`);
        alert(`Email enviado correctamente.\nProveedor: ${data.provider}\nFrom: ${data.from}`);
      } else {
        setEmailTestMessage(`Error: ${data.error || 'Unknown error'}${data.from ? ` | From: ${data.from}` : ''}`);
        alert(`Error enviando email: ${data.error || 'Unknown error'}${data.from ? `\nFrom: ${data.from}` : ''}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setTestResults({ ...testResults, email: false });
      setEmailTestMessage('Error al probar email');
      alert('Error al probar email');
    } finally {
      setTestingEmail(false);
    }
  }

  async function testPasswordResetEmail() {
    const email = testPasswordResetAddress.trim();
    if (!email) return;

    setTestingPasswordReset(true);
    setPasswordResetTestMessage(null);
    try {
      const response = await fetch('/api/admin/settings/test/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      setTestResults({ ...testResults, passwordReset: Boolean(data.success) });

      if (data.success) {
        setPasswordResetTestMessage('OK: reset enviado. Revisa inbox/spam.');
        alert('Reset enviado correctamente. Revisa inbox/spam.');
      } else {
        setPasswordResetTestMessage(`Error: ${data.error || 'Unknown error'}`);
        alert(`Reset no enviado: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setTestResults({ ...testResults, passwordReset: false });
      setPasswordResetTestMessage('Error al probar reset');
      alert('Error al probar reset');
    } finally {
      setTestingPasswordReset(false);
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
                placeholder="AutoDealersOnline"
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
                placeholder={PLATFORM_URLS.public}
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
                <p className="text-sm text-gray-600">
                  Pega las claves, guarda credenciales y el sistema valida, crea el webhook y activa
                  Connect — sin ir a Stripe ni Firebase.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveStripeCredentials}
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar claves Stripe'}
                </button>
                <button
                  onClick={testStripeConnection}
                  disabled={testingStripe}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
                >
                  {testingStripe ? 'Validando…' : 'Validar claves'}
                </button>
                <button
                  type="button"
                  onClick={syncStripeWebhook}
                  disabled={syncingStripeWebhook}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {syncingStripeWebhook ? 'Sincronizando…' : 'Re-sincronizar webhook'}
                </button>
              </div>
            </div>
            {stripeWebhookMessage && (
              <div
                className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                  stripeSetupStatus?.webhookReady
                    ? 'border-green-200 bg-green-50 text-green-900'
                    : 'border-primary-200 bg-primary-50 text-primary-900'
                }`}
              >
                {stripeWebhookMessage}
              </div>
            )}
            {stripeSetupStatus && (
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border px-3 py-2">
                  <div className="text-gray-500">Modo</div>
                  <div className="font-semibold uppercase">{stripeSetupStatus.mode || '—'}</div>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <div className="text-gray-500">Webhook</div>
                  <div
                    className={`font-semibold ${stripeSetupStatus.webhookReady ? 'text-green-700' : 'text-amber-700'}`}
                  >
                    {stripeSetupStatus.webhookReady ? 'Listo' : 'Pendiente'}
                  </div>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <div className="text-gray-500">Connect</div>
                  <div
                    className={`font-semibold ${stripeSetupStatus.connectTransfersEnabled ? 'text-green-700' : 'text-amber-700'}`}
                  >
                    {stripeSetupStatus.connectTransfersEnabled ? 'Activo' : 'Pendiente'}
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Secret Key (Server-side)
                </label>
                <input
                  type="password"
                  value={credentials.stripeSecretKey}
                  onFocus={() =>
                    clearMaskedStripeField('stripeSecretKey', credentials, setCredentials)
                  }
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
                  onFocus={() =>
                    clearMaskedStripeField('stripePublishableKey', credentials, setCredentials)
                  }
                  onChange={(e) =>
                    setCredentials({ ...credentials, stripePublishableKey: e.target.value })
                  }
                  placeholder="pk_live_... o pk_test_..."
                  className="w-full border rounded px-3 py-2 font-mono text-sm"
                />
                {isMaskedCredential(credentials.stripePublishableKey) && (
                  <p className="text-xs text-amber-700 mt-1">
                    Este valor enmascarado es la clave antigua. Haz clic y pega la pk_live_... completa.
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Usada en el frontend para formularios de pago
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  URL del webhook en Stripe (Admin)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/api/webhooks/stripe`
                        : '/api/webhooks/stripe'
                    }
                    className="flex-1 border rounded px-3 py-2 font-mono text-sm bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url =
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/api/webhooks/stripe`
                          : '';
                      if (url) void navigator.clipboard.writeText(url);
                    }}
                    className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Stripe → Developers → Webhooks. Producción:{' '}
                  <code className="text-xs break-all">{ADMIN_STRIPE_WEBHOOK_URL}</code>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Webhook (automático)
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    credentials.stripeWebhookSecret?.startsWith('••••')
                      ? 'Configurado automáticamente (whsec_••••)'
                      : credentials.stripeWebhookSecret
                        ? 'Configurado automáticamente'
                        : 'Se generará al guardar las claves Stripe'
                  }
                  className="w-full border rounded px-3 py-2 font-mono text-sm bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  No hace falta copiarlo de Stripe. Al guardar <code className="text-xs">sk_...</code> y{' '}
                  <code className="text-xs">pk_...</code>, el admin crea el endpoint y guarda el secreto.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Webhook Secret (Advertiser)
                </label>
                <input
                  type="password"
                  value={credentials.stripeAdvertiserWebhookSecret}
                  onChange={(e) =>
                    setCredentials({ ...credentials, stripeAdvertiserWebhookSecret: e.target.value })
                  }
                  placeholder="whsec_... (opcional si usas otra URL en Stripe)"
                  className="w-full border rounded px-3 py-2 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Solo si en Stripe tienes un endpoint distinto apuntando a la app Advertiser
                  (<code className="text-xs">/api/webhooks/stripe</code>). Si lo dejas vacío, se usa el
                  mismo secreto que &quot;Webhook Secret&quot; de arriba.
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg space-y-2">
              <p className="text-sm text-primary-800">
                <strong>Flujo automático:</strong> pega <code className="text-xs">sk_live_...</code> y{' '}
                <code className="text-xs">pk_live_...</code>, pulsa <strong>Guardar Credenciales</strong>{' '}
                abajo. El sistema valida la cuenta, crea/actualiza el webhook con Connect y guarda el{' '}
                <code className="text-xs">whsec_...</code> en Firestore.
              </p>
              <p className="text-xs text-primary-700">
                Revisa el estado completo en{' '}
                <Link href="/admin/stripe" className="underline">
                  Admin → Stripe
                </Link>{' '}
                (balance, comisiones afiliados, transferencias).
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
                  className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
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

          {/* TikTok — oculto hasta ENABLE_TIKTOK_YOUTUBE_PUBLISH */}
          {ENABLE_TIKTOK_YOUTUBE_PUBLISH && (
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">TikTok (Login Kit / Content Posting)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Redirect URI del dealer: <code className="text-xs bg-gray-100 px-1 rounded">/api/settings/integrations/callback</code>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Client Key</label>
                <input
                  type="text"
                  value={credentials.tiktokClientKey}
                  onChange={(e) =>
                    setCredentials({ ...credentials, tiktokClientKey: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="aw…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Client Secret</label>
                <input
                  type="password"
                  value={credentials.tiktokClientSecret}
                  onChange={(e) =>
                    setCredentials({ ...credentials, tiktokClientSecret: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>
          )}

          {/* YouTube — oculto hasta ENABLE_TIKTOK_YOUTUBE_PUBLISH */}
          {ENABLE_TIKTOK_YOUTUBE_PUBLISH && (
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">YouTube (Google OAuth)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Habilita YouTube Data API v3 y usa el mismo redirect URI de integraciones del dealer.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Client ID</label>
                <input
                  type="text"
                  value={credentials.youtubeClientId}
                  onChange={(e) =>
                    setCredentials({ ...credentials, youtubeClientId: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="….apps.googleusercontent.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Client Secret</label>
                <input
                  type="password"
                  value={credentials.youtubeClientSecret}
                  onChange={(e) =>
                    setCredentials({ ...credentials, youtubeClientSecret: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>
          )}

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
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Email (SendGrid/Resend)</h3>
            </div>
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
                  type="text"
                  value={credentials.emailFromAddress}
                  onChange={(e) =>
                    setCredentials({ ...credentials, emailFromAddress: e.target.value })
                  }
                  placeholder="AutoDealersOnline <noreply@autodealers-online.com>"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email para prueba directa</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full border rounded px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={testEmailConnection}
                    disabled={testingEmail || !testEmailAddress.trim()}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 text-sm whitespace-nowrap"
                  >
                    {testingEmail ? 'Probando...' : 'Probar email'}
                  </button>
                </div>
                {emailTestMessage && (
                  <p className={`text-xs mt-1 ${testResults.email ? 'text-green-700' : 'text-red-600'}`}>
                    {emailTestMessage}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email de usuario para reset</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testPasswordResetAddress}
                    onChange={(e) => setTestPasswordResetAddress(e.target.value)}
                    placeholder="usuario@dominio.com"
                    className="w-full border rounded px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={testPasswordResetEmail}
                    disabled={testingPasswordReset || !testPasswordResetAddress.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm whitespace-nowrap"
                  >
                    {testingPasswordReset ? 'Probando...' : 'Probar reset'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Debe existir en Firebase Auth; si solo existe en Firestore, Firebase no genera reset.
                </p>
                {passwordResetTestMessage && (
                  <p className={`text-xs mt-1 ${testResults.passwordReset ? 'text-green-700' : 'text-red-600'}`}>
                    {passwordResetTestMessage}
                  </p>
                )}
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



