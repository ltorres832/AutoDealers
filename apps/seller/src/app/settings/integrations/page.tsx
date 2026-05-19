'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  SocialIcon,
  ToastNotification,
  MetaIntegrationsCard,
  type ToastData,
  type MetaIntegrationRow,
} from '@autodealers/shared/client';

interface Integration {
  id: string;
  type: 'whatsapp' | 'facebook' | 'instagram';
  status: 'active' | 'inactive' | 'error';
  name: string;
  description: string;
  pageName?: string;
}

const availableIntegrations: Integration[] = [
  {
    id: 'whatsapp',
    type: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Conecta tu cuenta de WhatsApp Business para enviar y recibir mensajes',
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
      const message =
        success === 'meta'
          ? ig === '1'
            ? 'Facebook e Instagram quedaron conectados con un solo inicio de sesión en Meta.'
            : 'Facebook conectado. Si tienes Instagram Business, vincúlalo a tu página en Meta Business Suite y pulsa «Actualizar permisos».'
          : 'Integración conectada exitosamente';
      setErrorModal({
        show: true,
        title: '✅ Éxito',
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
          const existing = data.integrations?.find((i: { type: string }) => i.type === integration.type);
          if (!existing) return integration;
          const creds = existing.credentials as { pageName?: string } | undefined;
          const pageName =
            typeof creds?.pageName === 'string' ? creds.pageName : undefined;
          return {
            ...integration,
            status: existing.status || 'active',
            id: existing.id,
            ...(pageName ? { pageName } : {}),
          };
        });
        setIntegrations(updated);
        addDebugLog('✅ Integraciones cargadas exitosamente');
      } else if (response.status === 401) {
        addDebugLog('❌ Error 401 - No autorizado después de renovar token');
        const errorData = await response.json().catch(() => ({}));
        const errorDetails = `El servidor no pudo verificar tu sesión incluso después de renovar el token.\n\nStatus: ${response.status}\nError: ${errorData.error || 'Unauthorized'}\n\nEsto puede ocurrir si:\n- Tu sesión de Firebase Auth expiró completamente\n- Necesitas iniciar sesión nuevamente\n\nSOLUCIÓN: Por favor inicia sesión nuevamente.`;
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

  async function handleConnect(type: string) {
    try {
      if (type === 'whatsapp') {
        setShowWhatsAppModal(true);
        return;
      }

      if (type === 'facebook' || type === 'instagram' || type === 'meta') {
        setConnectingType('meta');
        addDebugLog('🔵 Iniciando conexión unificada con Meta (Facebook + Instagram)...');
        await initiateOAuth('meta');
        return;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addDebugLog(`❌ Error en handleConnect: ${message}`);
      setErrorModal({
        show: true,
        title: 'Error al conectar',
        message,
      });
    } finally {
      setConnectingType(null);
    }
  }

  async function initiateOAuth(type: string) {
    setConnectingType(type);
    try {
      const response = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, action: 'connect' }),
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
        
        // Si el error es de credenciales no configuradas, mostrar mensaje más claro
        if (data.error === 'Credenciales no configuradas' || errorMsg.includes('credenciales de Meta no están configuradas')) {
          setErrorModal({
            show: true,
            title: '⚠️ Credenciales no configuradas',
            message: 'El administrador del sistema aún no ha configurado las credenciales de Meta.',
            details: `Para poder conectar tu cuenta de ${type === 'facebook' ? 'Facebook' : 'Instagram'}, el administrador debe:\n\n1. Ir al panel de administración\n2. Navegar a Configuración > Integraciones Meta\n3. Ingresar el App ID y App Secret de Meta\n4. Guardar las credenciales\n\nUna vez configuradas, podrás conectar tu cuenta haciendo clic en "Conectar".\n\nSi eres el administrador, ve a: /admin/settings/integrations`,
          });
        } else {
          setErrorModal({
            show: true,
            title: '❌ Error al conectar',
            message: errorMsg,
            details: `${data.details || ''}\n\nPor favor verifica:\n1. Que el administrador haya configurado las credenciales de Meta\n2. Que tu aplicación de Meta esté configurada correctamente\n3. Revisa la consola para más detalles.`,
          });
        }
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
                      ✓ Conectado
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {integration.status === 'active' ? (
                  <button
                    onClick={() => handleDisconnect(integration.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium"
                  >
                    Desconectar
                  </button>
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
          connecting={connectingType === 'meta'}
          onConnect={() => void handleConnect('meta')}
          onDisconnect={handleDisconnect}
        />
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Información</h4>
        <p className="text-sm text-blue-800">
          Usa un solo botón «Conectar con Meta» para Facebook e Instagram. WhatsApp se configura aparte. Cada
          integración queda asociada solo a tu cuenta.
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
