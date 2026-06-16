'use client';

import { useState, useEffect } from 'react';
import { verifyAuth } from '@/lib/auth';

interface MetaCredentials {
  appId: string;
  appSecret: string;
}

type PlatformIntegration = { type: string; status: string; name?: string };

type RegistrationSocialSettings = {
  platformFacebookEnabled: boolean;
  tenantFacebookEnabled: boolean;
  announceSellers: boolean;
  announceDealers: boolean;
  platformMessageTemplate: string;
  tenantMessageTemplate: string;
  hashtags: string[];
};

type PlatformSocialSettings = {
  officialFacebookPageId: string;
  officialFacebookPageName: string;
};

type PlatformPageOption = {
  id: string;
  name: string;
  blocked?: boolean;
  allowed?: boolean;
};

function formatOAuthError(code: string | null): string {
  if (!code) return 'Error desconocido al conectar.';
  if (code === 'no_facebook_page') {
    return 'Meta no devolvió ninguna página. En el popup de Facebook marca las páginas que quieres compartir, o inicia sesión con la cuenta que administra la página oficial de AutoDealers.';
  }
  if (code === 'only_seller_pages') {
    return 'Solo apareció la página de un vendedor (Auto Sales). No se puede usar para la plataforma. Conecta con la cuenta Meta que administra la página oficial de AutoDealers.';
  }
  if (code === 'no_official_platform_page') {
    return 'Tu cuenta no tiene acceso a la página oficial de AutoDealers configurada abajo. Pide acceso en Meta Business o usa otra cuenta.';
  }
  if (code.startsWith('facebook_pages:')) {
    return `Meta rechazó la lista de páginas: ${decodeURIComponent(code.slice('facebook_pages:'.length))}`;
  }
  return decodeURIComponent(code);
}

export default function AdminIntegrationsPage() {
  const [metaCredentials, setMetaCredentials] = useState<MetaCredentials>({
    appId: '',
    appSecret: '',
  });
  const [platformIntegrations, setPlatformIntegrations] = useState<PlatformIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [registrationSocial, setRegistrationSocial] = useState<RegistrationSocialSettings>({
    platformFacebookEnabled: true,
    tenantFacebookEnabled: true,
    announceSellers: true,
    announceDealers: true,
    platformMessageTemplate:
      '¡Bienvenido/a {{name}}! Nuevo {{typeLabel}} en AutoDealers. Conoce más: {{link}}',
    tenantMessageTemplate:
      '¡Ya estamos en AutoDealers! {{name}} — visita nuestro perfil: {{link}}',
    hashtags: ['AutoDealers', 'Vehiculos'],
  });
  const [savingRegistrationSocial, setSavingRegistrationSocial] = useState(false);
  const [platformPagePickerOpen, setPlatformPagePickerOpen] = useState(false);
  const [platformPageOptions, setPlatformPageOptions] = useState<PlatformPageOption[]>([]);
  const [selectedPlatformPageId, setSelectedPlatformPageId] = useState('');
  const [savingPlatformPage, setSavingPlatformPage] = useState(false);
  const [platformSocial, setPlatformSocial] = useState<PlatformSocialSettings>({
    officialFacebookPageId: '',
    officialFacebookPageName: '',
  });
  const [savingPlatformSocial, setSavingPlatformSocial] = useState(false);
  const [platformHasAllowedPage, setPlatformHasAllowedPage] = useState(false);

  async function fetchPlatformSocialSettings() {
    try {
      const res = await fetch('/api/admin/settings/platform-social', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setPlatformSocial(data.settings);
      }
    } catch (e) {
      console.error('Error fetching platform social settings:', e);
    }
  }

  async function handleSavePlatformSocial() {
    try {
      setSavingPlatformSocial(true);
      const res = await fetch('/api/admin/settings/platform-social', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(platformSocial),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setPlatformSocial(data.settings);
      setMessage({ type: 'success', text: 'Página oficial de plataforma guardada.' });
    } catch (e: unknown) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Error al guardar página oficial',
      });
    } finally {
      setSavingPlatformSocial(false);
    }
  }

  async function handleCancelPendingOAuth() {
    try {
      await fetch('/api/admin/social/platform-page-pending', {
        method: 'DELETE',
        credentials: 'include',
      });
      setPlatformPagePickerOpen(false);
      setPlatformPageOptions([]);
      setPlatformHasAllowedPage(false);
      setMessage({ type: 'success', text: 'Conexión pendiente cancelada.' });
    } catch (e) {
      console.error('Error canceling pending oauth:', e);
    }
  }

  async function loadPlatformPagePicker() {
    try {
      const res = await fetch('/api/admin/social/platform-page-pending', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.settings) setPlatformSocial(data.settings);
      if (data.pending && Array.isArray(data.pages) && data.pages.length > 0) {
        const pages = data.pages as PlatformPageOption[];
        setPlatformPageOptions(pages);
        setPlatformHasAllowedPage(Boolean(data.hasAllowedPage));
        setPlatformPagePickerOpen(true);
        const firstAllowed = pages.find((p) => p.allowed) || pages[0];
        setSelectedPlatformPageId(firstAllowed?.id || '');
      }
    } catch (e) {
      console.error('Error loading platform page picker:', e);
    }
  }

  async function handleConfirmPlatformPage() {
    if (!selectedPlatformPageId) {
      setMessage({ type: 'error', text: 'Selecciona la página oficial de AutoDealers.' });
      return;
    }
    try {
      setSavingPlatformPage(true);
      const res = await fetch('/api/admin/social/select-platform-page', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: selectedPlatformPageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la página');
      setPlatformPagePickerOpen(false);
      setPlatformPageOptions([]);
      setMessage({
        type: 'success',
        text: `Página de plataforma conectada: ${data.pageName}`,
      });
      void fetchPlatformIntegrations();
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('select_platform_page');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    } catch (e: unknown) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Error al confirmar la página',
      });
    } finally {
      setSavingPlatformPage(false);
    }
  }

  useEffect(() => {
    fetchCredentials();
    fetchPlatformIntegrations();
    fetchRegistrationSocial();
    void fetchPlatformSocialSettings();
    void loadPlatformPagePicker();
  }, []);

  async function fetchRegistrationSocial() {
    try {
      const res = await fetch('/api/admin/settings/registration-social', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setRegistrationSocial(data.settings);
      }
    } catch (e) {
      console.error('Error fetching registration social settings:', e);
    }
  }

  async function handleSaveRegistrationSocial() {
    try {
      setSavingRegistrationSocial(true);
      const res = await fetch('/api/admin/settings/registration-social', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationSocial),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setRegistrationSocial(data.settings);
      setMessage({ type: 'success', text: 'Anuncios de registro en Facebook guardados.' });
    } catch (e: unknown) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Error al guardar anuncios de registro',
      });
    } finally {
      setSavingRegistrationSocial(false);
    }
  }

  async function fetchPlatformIntegrations() {
    try {
      const response = await fetch('/api/admin/social/integrations', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setPlatformIntegrations(data.integrations ?? []);
      }
    } catch (error) {
      console.error('Error fetching platform integrations:', error);
    }
  }

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

  async function handleConnectFacebook(reauthorize = false) {
    try {
      const response = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform: 'facebook', reauthorize }),
      });

      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setMessage({ type: 'error', text: data.message || data.error || 'Error al generar URL de autorización' });
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
        setMessage({ type: 'error', text: data.message || data.error || 'Error al generar URL de autorización' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al conectar Instagram' });
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('success') === 'connected') {
      setMessage({ type: 'success', text: 'Cuenta de soporte conectada correctamente' });
      void fetchPlatformIntegrations();
    } else if (q.get('select_platform_page') === '1') {
      void loadPlatformPagePicker();
    } else if (q.get('error')) {
      setMessage({ type: 'error', text: formatOAuthError(q.get('error')) });
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="1234567890123456"
            />
            <p className="text-xs text-gray-500 mt-1">
              Obtén tu App ID desde{' '}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Credenciales'}
          </button>
        </div>
      </div>

      {/* Cuenta de soporte para publicar desde el panel admin */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2 text-primary-900">📱 Cuenta de soporte (publicar por admin)</h2>
        <p className="text-sm text-primary-800 mb-4">
          Conecta aquí la página de Facebook e Instagram <strong>oficial de AutoDealers</strong> (no la de un
          vendedor). El equipo admin publicará inventario de cualquier concesionario{' '}
          <strong>sin usar las credenciales del cliente</strong>.
        </p>
        <div className="flex flex-wrap gap-3 mb-4 text-sm">
          {(['facebook', 'instagram'] as const).map((p) => {
            const row = platformIntegrations.find((i) => i.type === p);
            const active = row?.status === 'active';
            return (
              <span
                key={p}
                className={`px-3 py-1 rounded-full border ${
                  active
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : 'bg-white border-primary-200 text-primary-700'
                }`}
              >
                {p === 'facebook' ? 'Facebook' : 'Instagram'}: {active ? `conectado${row?.name ? ` (${row.name})` : ''}` : 'no conectado'}
              </span>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">📄 Página oficial de Facebook (AutoDealers)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Opcional pero recomendado: pega el ID de la página oficial de la plataforma (no la de vendedores). Lo
          encuentras en Meta → tu página → Información → ID de la página.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">ID de página oficial</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={platformSocial.officialFacebookPageId}
              onChange={(e) =>
                setPlatformSocial((s) => ({ ...s, officialFacebookPageId: e.target.value.trim() }))
              }
              placeholder="Ej. 123456789012345"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre (referencia)</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={platformSocial.officialFacebookPageName}
              onChange={(e) =>
                setPlatformSocial((s) => ({ ...s, officialFacebookPageName: e.target.value }))
              }
              placeholder="Ej. AutoDealers"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleSavePlatformSocial}
          disabled={savingPlatformSocial}
          className="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {savingPlatformSocial ? 'Guardando...' : 'Guardar página oficial'}
        </button>
      </div>

      {/* Sección de OAuth para obtener tokens adicionales */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🔗 Conectar cuenta de soporte (OAuth)</h2>
        <p className="text-gray-600 mb-6">
          Una vez configurado el App ID y App Secret, conecta la página de Facebook / Instagram Business que usará el
          equipo de soporte para publicar vehículos desde el panel admin.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">📘 Facebook</h3>
            <p className="text-sm text-gray-600 mb-4">
              Conecta la página oficial de AutoDealers. Inicia sesión con la cuenta Meta que administra esa página (no la
              de un vendedor).
            </p>
            <button
              onClick={() => handleConnectFacebook(false)}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 mb-2"
            >
              Conectar Facebook
            </button>
            <button
              onClick={() => handleConnectFacebook(true)}
              className="w-full border border-primary-300 text-primary-700 py-2 px-4 rounded-lg hover:bg-primary-50 text-sm"
            >
              Reconectar y pedir permisos otra vez
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">📷 Instagram</h3>
            <p className="text-sm text-gray-600 mb-4">
              Conecta tu cuenta de Instagram Business para publicar contenido.
            </p>
            <button
              onClick={handleConnectInstagram}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700"
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

      {platformPagePickerOpen && platformPageOptions.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2 text-amber-900">Elegir página de AutoDealers</h2>
          {!platformHasAllowedPage ? (
            <p className="text-sm text-red-800 mb-4">
              Solo apareció una página de vendedor o ninguna página válida para la plataforma.{' '}
              <strong>No uses Auto Sales.</strong> Cancela y reconecta con la cuenta Meta que administra la página
              oficial de AutoDealers.
            </p>
          ) : (
            <p className="text-sm text-amber-900 mb-4">
              Elige la página <strong>oficial de la plataforma</strong>, no la de un vendedor.
            </p>
          )}
          <div className="space-y-2 mb-4">
            {platformPageOptions.map((page) => (
              <label
                key={page.id}
                className={`flex items-center gap-3 p-3 bg-white border rounded-lg ${
                  page.allowed ? 'border-amber-200 cursor-pointer' : 'border-red-200 opacity-60'
                }`}
              >
                <input
                  type="radio"
                  name="platformFacebookPage"
                  value={page.id}
                  checked={selectedPlatformPageId === page.id}
                  disabled={!page.allowed}
                  onChange={() => setSelectedPlatformPageId(page.id)}
                />
                <span className="font-medium text-gray-900">{page.name}</span>
                <span className="text-xs text-gray-500">ID {page.id}</span>
                {page.blocked && (
                  <span className="text-xs text-red-700 font-medium">Página de vendedor</span>
                )}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleConfirmPlatformPage}
              disabled={
                savingPlatformPage || !selectedPlatformPageId || !platformHasAllowedPage
              }
              className="bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {savingPlatformPage ? 'Guardando...' : 'Usar esta página para AutoDealers'}
            </button>
            <button
              type="button"
              onClick={handleCancelPendingOAuth}
              className="border border-amber-400 text-amber-900 py-2 px-4 rounded-lg hover:bg-amber-100"
            >
              Cancelar conexión pendiente
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">📣 Anuncios automáticos al registrarse</h2>
        <p className="text-sm text-gray-600 mb-4">
          Al crear un vendedor o concesionario: (1) publica en la página de Facebook de AutoDealers y (2) en su
          propia página si ya conectó Meta — si aún no, se publica cuando conecte Integraciones.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={registrationSocial.platformFacebookEnabled}
              onChange={(e) =>
                setRegistrationSocial((s) => ({ ...s, platformFacebookEnabled: e.target.checked }))
              }
            />
            Anunciar en página de AutoDealers
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={registrationSocial.tenantFacebookEnabled}
              onChange={(e) =>
                setRegistrationSocial((s) => ({ ...s, tenantFacebookEnabled: e.target.checked }))
              }
            />
            Anunciar en página del vendedor/dealer (si conectó Facebook)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={registrationSocial.announceSellers}
              onChange={(e) =>
                setRegistrationSocial((s) => ({ ...s, announceSellers: e.target.checked }))
              }
            />
            Incluir vendedores
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={registrationSocial.announceDealers}
              onChange={(e) =>
                setRegistrationSocial((s) => ({ ...s, announceDealers: e.target.checked }))
              }
            />
            Incluir concesionarios
          </label>
        </div>
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensaje página AutoDealers
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={registrationSocial.platformMessageTemplate}
              onChange={(e) =>
                setRegistrationSocial((s) => ({ ...s, platformMessageTemplate: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensaje página del miembro
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={registrationSocial.tenantMessageTemplate}
              onChange={(e) =>
                setRegistrationSocial((s) => ({ ...s, tenantMessageTemplate: e.target.value }))
              }
            />
          </div>
          <p className="text-xs text-gray-500">
            Variables: {'{{name}}'}, {'{{typeLabel}}'} (vendedor/concesionario), {'{{link}}'} (perfil público)
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveRegistrationSocial}
          disabled={savingRegistrationSocial}
          className="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {savingRegistrationSocial ? 'Guardando...' : 'Guardar anuncios de registro'}
        </button>
      </div>

      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <h3 className="font-semibold text-primary-900 mb-2">ℹ️ Cómo obtener tus credenciales:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-primary-800">
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
              {typeof window !== 'undefined' ? `${window.location.origin}/api/integrations/callback` : 'https://tu-dominio.com/api/integrations/callback'}
            </code>
          </li>
        </ol>
      </div>
    </div>
  );
}

