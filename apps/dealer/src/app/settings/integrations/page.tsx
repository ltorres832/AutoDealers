'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  SocialIcon,
  ToastNotification,
  MetaIntegrationsCard,
  type ToastData,
  type MetaIntegrationRow,
  type MetaTokenHealthSummary,
} from '@autodealers/shared/client';

interface Integration {
  id: string;
  type: 'whatsapp' | 'facebook' | 'instagram';
  status: 'active' | 'inactive' | 'error';
  name: string;
  description: string;
  pageName?: string;
  platformManaged?: boolean;
  metaTokenHealth?: MetaTokenHealthSummary;
}

const availableIntegrations: Integration[] = [
  {
    id: 'whatsapp',
    type: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Usa el WhatsApp Business configurado por la plataforma (admin). No necesitas ingresar tokens manualmente.',
    status: 'inactive',
  },
  {
    id: 'facebook',
    type: 'facebook',
    name: 'Facebook',
    description: 'Debes ser administrador de la página para publicar y gestionar mensajes.',
    status: 'inactive',
  },
  {
    id: 'instagram',
    type: 'instagram',
    name: 'Instagram',
    description:
      'Instagram Business se autoriza con Meta (Facebook): inicia sesión, elige la página de Facebook vinculada a tu perfil profesional de Instagram y acepta los permisos.',
    status: 'inactive',
  },
];

function toMetaRow(
  integration: Integration | undefined,
  fallbackType: 'facebook' | 'instagram'
): MetaIntegrationRow {
  const base =
    integration ??
    ({
      id: fallbackType,
      type: fallbackType,
      status: 'inactive' as const,
      name: '',
      description: '',
    } satisfies Integration);
  return {
    id: base.id,
    type: base.type === 'instagram' ? 'instagram' : 'facebook',
    status: base.status,
    pageName: base.pageName,
    metaTokenHealth: base.metaTokenHealth,
  };
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(availableIntegrations);
  const [loading, setLoading] = useState(true);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [errorModal, setErrorModal] = useState<{ show: boolean; title: string; message: string; details?: string }>({
    show: false,
    title: '',
    message: '',
  });
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [connectingType, setConnectingType] = useState<string | null>(null);
  const [verifyingMeta, setVerifyingMeta] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback(
    (type: ToastData['type'], title: string, message?: string) => {
      setToast({ id: String(Date.now()), type, title, message });
    },
    []
  );

  useEffect(() => {
    fetchIntegrations();
    
    // Verificar si hay mensajes de éxito/error en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success === 'connected' || success === 'meta') {
      const ig = urlParams.get('instagram');
      const notice = urlParams.get('notice');
      const metaWarn = urlParams.get('meta_warn');
      let message =
        success === 'meta'
          ? ig === '1'
            ? 'Facebook e Instagram quedaron conectados.'
            : 'Facebook conectado correctamente. Instagram no es obligatorio; puedes conectarlo después si lo necesitas.'
          : 'Integración conectada exitosamente';
      if (notice === 'no_instagram_business') {
        message =
          'No encontramos Instagram Business vinculado a tu página. Facebook sigue disponible; Instagram es opcional. Si tienes IG profesional, vincúlalo en Meta Business Suite e intenta «Conectar Instagram (opcional)».';
      }
      if (metaWarn === 'missing_scopes') {
        message +=
          ' Algunos permisos no se concedieron. Usa «Actualizar permisos de Facebook» y acepta todos (publicar, mensajes y anuncios).';
      } else if (metaWarn === 'ads_not_ready') {
        message +=
          ' La cuenta publicitaria no está lista. Verifica Business Manager, método de pago y permisos de anuncios.';
      } else if (metaWarn === 'organic_not_ready') {
        message +=
          ' Faltan permisos para publicar en la página. Actualiza permisos en Integraciones.';
      }
      setErrorModal({
        show: true,
        title:
          metaWarn && metaWarn !== 'missing_scopes'
            ? '⚠️ Conectado con avisos'
            : notice === 'no_instagram_business'
              ? 'ℹ️ Instagram no detectado'
              : metaWarn === 'missing_scopes'
                ? '⚠️ Permisos incompletos'
                : '✅ Éxito',
        message,
      });
      window.history.replaceState({}, '', '/settings/integrations');
      fetchIntegrations();
    } else if (error) {
      let errorMessage = 'Error al conectar';
      switch (error) {
        case 'meta_app_not_configured':
          errorMessage = 'La aplicación de Meta no está configurada. Por favor contacta al administrador del sistema.';
          break;
        case 'missing_parameters':
          errorMessage = 'Faltan parámetros en la autorización. Por favor intenta nuevamente.';
          break;
        case 'invalid_state':
          errorMessage = 'Estado de autorización inválido. Por favor intenta nuevamente.';
          break;
        case 'no_facebook_page':
          errorMessage =
            'No hay ninguna página de Facebook de negocio vinculada a tu cuenta. Crea una Fan Page en Facebook y asegúrate de ser su administrador; un perfil personal no sirve para esta integración.';
          break;
        case 'no_facebook_page_token':
          errorMessage =
            'Meta no devolvió el permiso de página. Vuelve a intentar y acepta los permisos de páginas de Facebook, o revisa la configuración de la app en Meta.';
          break;
        case 'no_instagram_business':
          errorMessage =
            'No encontramos una cuenta de Instagram Business vinculada a ninguna página de Facebook. Convierte tu Instagram a cuenta profesional y vincúlala a una Fan Page en Meta Business Suite, luego vuelve a conectar.';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Error al obtener el token de acceso. Por favor intenta nuevamente.';
          break;
        default:
          errorMessage = decodeURIComponent(error);
      }
      setErrorModal({
        show: true,
        title: '❌ Error',
        message: errorMessage,
      });
      window.history.replaceState({}, '', '/settings/integrations');
    }
  }, []);

  function addDebugLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  }

  async function fetchIntegrations() {
    try {
      addDebugLog('🔍 Iniciando fetchIntegrations...');
      
      // Renovar token antes de hacer la llamada
      addDebugLog('🔍 Renovando token de autenticación...');
      const { ensureFreshToken } = await import('@/lib/token-refresh');
      const freshToken = await ensureFreshToken();
      
      if (freshToken) {
        addDebugLog('✅ Token renovado exitosamente');
      } else {
        addDebugLog('⚠️ No se pudo renovar el token, continuando con el token existente');
      }
      
      addDebugLog('🔍 Haciendo fetch a /api/settings/integrations...');
      let response = await fetch('/api/settings/integrations', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      addDebugLog(`🔍 Response status: ${response.status} ${response.statusText}`);
      
      // Si el token expiró, intentar renovarlo y volver a intentar
      if (response.status === 401) {
        addDebugLog('⚠️ Token expirado, intentando renovar...');
        const { refreshAuthToken } = await import('@/lib/token-refresh');
        const newToken = await refreshAuthToken();
        
        if (newToken) {
          addDebugLog('✅ Token renovado, reintentando petición...');
          // Reintentar la petición con el nuevo token
          response = await fetch('/api/settings/integrations', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          addDebugLog(`🔍 Response status después de renovar: ${response.status} ${response.statusText}`);
        }
      }
      
      if (response.ok) {
        addDebugLog('✅ Respuesta OK, procesando datos...');
        const data = await response.json();
        const updated = availableIntegrations.map((integration) => {
          const existing = data.integrations?.find((i: any) => i.type === integration.type);
          if (!existing) return integration;
          const creds = existing.credentials as { pageName?: string } | undefined;
          const pageName =
            typeof creds?.pageName === 'string' ? creds.pageName : undefined;
          return {
            ...integration,
            status: existing.status || 'active',
            id: existing.id,
            platformManaged: existing.platformManaged === true,
            ...(pageName ? { pageName } : {}),
            ...(existing.metaTokenHealth ? { metaTokenHealth: existing.metaTokenHealth } : {}),
          };
        });
        setIntegrations(updated);
        addDebugLog('✅ Integraciones cargadas exitosamente');
      } else if (response.status === 401) {
        addDebugLog('❌ Error 401 - No autorizado después de renovar token');
        const errorData = await response.json().catch(() => ({}));
        const errorDetails = `El servidor no pudo verificar tu sesión incluso después de renovar el token.\n\nStatus: ${response.status}\nError: ${errorData.error || 'Unauthorized'}\n\nEsto puede ocurrir si:\n- Tu sesión expiró por completo\n- Necesitas iniciar sesión nuevamente\n\nSOLUCIÓN: Por favor inicia sesión nuevamente.`;
        setErrorModal({
          show: true,
          title: '❌ Error de autenticación',
          message: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
          details: errorDetails,
        });
      } else {
        addDebugLog(`❌ Error ${response.status}`);
        const errorData = await response.json().catch(() => ({}));
        setErrorModal({
          show: true,
          title: '❌ Error al cargar integraciones',
          message: errorData.error || `Error ${response.status}`,
          details: `Status: ${response.status}\nMensaje: ${errorData.message || 'Error desconocido'}`,
        });
      }
    } catch (error) {
      addDebugLog(`❌ Error en fetchIntegrations: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setErrorModal({
        show: true,
        title: '❌ Error al cargar integraciones',
        message: error instanceof Error ? error.message : 'Error desconocido',
        details: `Error completo: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
      });
    } finally {
      setLoading(false);
    }
  }

  async function connectWhatsApp() {
    setConnectingType('whatsapp');
    try {
      const response = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'whatsapp', action: 'connect' }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        showToast('success', 'WhatsApp conectado', data.message || 'Listo para enviar y recibir mensajes.');
        await fetchIntegrations();
        return;
      }
      if (data.error === 'manual_credentials_required') {
        setShowWhatsAppModal(true);
        return;
      }
      showToast('error', 'Error al conectar WhatsApp', data.message || data.error || 'Error desconocido');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      showToast('error', 'Error al conectar WhatsApp', message);
    } finally {
      setConnectingType(null);
    }
  }

  async function verifyMetaPermissions() {
    setVerifyingMeta(true);
    try {
      const response = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'verify_meta' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast('error', 'Verificación fallida', data.error || 'No se pudo verificar');
        return;
      }
      const h = data.metaTokenHealth as MetaTokenHealthSummary | undefined;
      if (h?.readyForOrganic && h?.readyForPaidAds) {
        showToast('success', 'Permisos correctos', 'Listo para publicar orgánico y anuncios de pago.');
      } else {
        showToast(
          'warning',
          'Permisos incompletos',
          h?.missingScopes?.length
            ? `Faltan: ${h.missingScopes.join(', ')}. Actualiza permisos en Meta.`
            : 'Usa «Actualizar permisos de Facebook».'
        );
      }
      await fetchIntegrations();
    } finally {
      setVerifyingMeta(false);
    }
  }

  async function handleConnect(type: string, opts?: { reauthorize?: boolean }) {
    try {
      if (type === 'whatsapp') {
        await connectWhatsApp();
        return;
      }

      if (type === 'facebook' || type === 'meta') {
        setConnectingType('meta');
        addDebugLog('🔵 Iniciando conexión con Meta (Facebook)...');
        await initiateOAuth('meta', opts?.reauthorize);
        return;
      }

      if (type === 'instagram') {
        setConnectingType('instagram');
        addDebugLog('🔵 Conexión opcional de Instagram...');
        await initiateOAuth('instagram');
        return;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addDebugLog(`❌ Error en handleConnect: ${message}`);
      setErrorModal({ show: true, title: 'Error al conectar', message });
    } finally {
      setConnectingType(null);
    }
  }

  async function initiateOAuth(type: string, reauthorize?: boolean) {
    setConnectingType(type);
    try {
      const response = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, action: 'connect', reauthorize: reauthorize === true }),
      });

      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Respuesta no es JSON:', text.substring(0, 200));
        throw new Error(`Error del servidor: La respuesta no es JSON (Status: ${response.status}). Esto puede indicar que la ruta de la API no existe o hay un error en el servidor.`);
      }

      if (response.ok) {
        if (data.authUrl) {
          console.log('Redirigiendo a OAuth:', data.authUrl);
          window.location.href = data.authUrl;
        } else if (data.error) {
          setErrorModal({
            show: true,
            title: '❌ Error',
            message: data.error,
            details: data.message || '',
          });
        } else {
          setErrorModal({
            show: true,
            title: 'ℹ️ Información',
            message: data.message || 'Redirigiendo para autenticación...',
          });
        }
      } else {
        const errorMsg = data.error || data.message || 'Error al conectar';
        setErrorModal({
          show: true,
          title: '❌ Error al conectar',
          message: errorMsg,
          details: `${data.details || ''}\n\nPor favor verifica:\n1. Que hayas ingresado tus credenciales correctamente\n2. Que tu aplicación de Meta esté configurada correctamente\n3. Revisa la consola para más detalles.`,
        });
        console.error('Integration connection error:', data);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en initiateOAuth:', error);
      setErrorModal({
        show: true,
        title: 'Error al iniciar OAuth',
        message,
        details: 'Revisa la consola del navegador (F12) para más detalles.',
      });
    } finally {
      setConnectingType(null);
    }
  }

  async function handleWhatsAppConnect(credentials: { phoneNumberId: string; accessToken: string }) {
    try {
      const response = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          type: 'whatsapp', 
          action: 'connect',
          credentials
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showToast('success', 'WhatsApp conectado', 'Tu cuenta quedó vinculada correctamente.');
          setShowWhatsAppModal(false);
          await fetchIntegrations();
        } else {
          showToast('error', 'Error al conectar WhatsApp', data.error || 'Error desconocido');
        }
      } else {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        showToast('error', 'Error al conectar WhatsApp', error.error || 'Error desconocido');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error:', error);
      showToast('error', 'Error al conectar WhatsApp', message);
    }
  }

  async function handleDisconnect(integrationId: string) {
    if (!confirm('¿Estás seguro de que quieres desconectar esta integración?')) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/integrations/${integrationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        showToast('success', 'Integración desconectada');
        await fetchIntegrations();
      } else {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        showToast('error', 'Error al desconectar', error.error || 'Error desconocido');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error:', error);
      showToast('error', 'Error al desconectar', message);
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración</h1>
        <p className="text-gray-600">
          Conecta tus redes sociales para gestionar tus comunicaciones
        </p>

        {/* Settings Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <Link
              href="/settings/branding"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Branding
            </Link>
            <Link
              href="/settings/profile"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Perfil
            </Link>
            <Link
              href="/settings/integrations"
              className="border-b-2 border-primary-500 py-4 px-1 text-sm font-medium text-primary-600"
            >
              Integraciones
            </Link>
            <Link
              href="/settings/membership"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Membresía
            </Link>
          </nav>
        </div>
      </div>

      <div className="space-y-4">
        {integrations.filter((i) => i.type === 'whatsapp').map((integration) => (
          <div
            key={integration.id}
            className="bg-white rounded-lg shadow border border-gray-200 p-6"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
                  <SocialIcon platform={integration.type} size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{integration.name}</h3>
                  <p className="text-gray-600 mb-3">{integration.description}</p>
                  {integration.status === 'active' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      ✓ Conectado{integration.platformManaged ? ' (plataforma)' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {integration.status === 'active' ? (
                  integration.platformManaged && integration.id === 'platform-whatsapp' ? null : (
                  <button
                    onClick={() => handleDisconnect(integration.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium"
                  >
                    Desconectar
                  </button>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={connectingType === integration.type}
                    onClick={() => handleConnect(integration.type)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {connectingType === integration.type ? 'Conectando...' : 'Conectar'}
                  </button>
                )}
              </div>
            </div>

          </div>
        ))}

        <MetaIntegrationsCard
          facebook={toMetaRow(integrations.find((i) => i.type === 'facebook'), 'facebook')}
          instagram={toMetaRow(integrations.find((i) => i.type === 'instagram'), 'instagram')}
          connecting={connectingType === 'meta' || connectingType === 'instagram'}
          onConnect={(opts) => void handleConnect('meta', opts)}
          onConnectInstagram={() => void handleConnect('instagram')}
          onDisconnect={handleDisconnect}
          onVerifyPermissions={() => void verifyMetaPermissions()}
          verifyingPermissions={verifyingMeta}
        />
      </div>

      <div className="mt-8 bg-primary-50 border border-primary-200 rounded-lg p-4">
        <h4 className="font-semibold text-primary-900 mb-2">💡 Información</h4>
        <p className="text-sm text-primary-800">
          Usa «Conectar Facebook (Meta)» para la página de tu negocio. Instagram es opcional y se configura aparte si lo
          necesitas. WhatsApp se configura en su propia tarjeta.
        </p>
      </div>

      {showWhatsAppModal && (
        <WhatsAppConnectionModal
          onClose={() => setShowWhatsAppModal(false)}
          onConnect={handleWhatsAppConnect}
          onValidationError={(msg) => showToast('warning', 'Campos requeridos', msg)}
        />
      )}

      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* Modal de Error */}
      {errorModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">{errorModal.title}</h2>
              <button
                onClick={() => setErrorModal({ show: false, title: '', message: '' })}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-800 mb-2 font-medium">Mensaje:</p>
                <div className="bg-gray-50 border rounded p-3 mb-4">
                  <p className="text-sm whitespace-pre-wrap">{errorModal.message}</p>
                </div>
              </div>
              {errorModal.details && (
                <div className="mb-4">
                  <p className="text-gray-800 mb-2 font-medium">Detalles:</p>
                  <div className="bg-gray-50 border rounded p-3 mb-4">
                    <pre className="text-xs whitespace-pre-wrap overflow-x-auto">{errorModal.details}</pre>
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    const fullError = `${errorModal.title}\n\nMensaje:\n${errorModal.message}${errorModal.details ? `\n\nDetalles:\n${errorModal.details}` : ''}`;
                    navigator.clipboard.writeText(fullError).then(() => {
                      alert('✅ Error copiado al portapapeles');
                    }).catch(() => {
                      alert('❌ No se pudo copiar. Por favor selecciona y copia manualmente.');
                    });
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  📋 Copiar Error
                </button>
                <button
                  onClick={() => setErrorModal({ show: false, title: '', message: '' })}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsAppConnectionModal({
  onClose,
  onConnect,
  onValidationError,
}: {
  onClose: () => void;
  onConnect: (credentials: { phoneNumberId: string; accessToken: string }) => void;
  onValidationError?: (message: string) => void;
}) {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneNumberId || !accessToken) {
      onValidationError?.('Por favor completa todos los campos');
      return;
    }
    setLoading(true);
    onConnect({ phoneNumberId, accessToken });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Conectar WhatsApp Business</h2>
          <p className="text-sm text-gray-600 mt-1">
            Ingresa tus credenciales de WhatsApp Business API
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number ID</label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Ej: 123456789012345"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Access Token</label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Ingresa tu access token"
              required
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              {loading ? 'Conectando...' : 'Conectar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
