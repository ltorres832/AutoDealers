'use client';

import { useState, useEffect } from 'react';

interface WhatsAppConfig {
  enabled: boolean;
  phoneNumberId: string;
  accessToken: string;
  verifyToken?: string;
  webhookUrl?: string;
  autoRespond: boolean;
  businessName?: string;
  businessDescription?: string;
  awayMessage?: string;
}

export default function WhatsAppSettingsPage() {
  const [config, setConfig] = useState<WhatsAppConfig>({
    enabled: false,
    phoneNumberId: '',
    accessToken: '',
    verifyToken: '',
    webhookUrl: '',
    autoRespond: false,
    businessName: '',
    businessDescription: '',
    awayMessage: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const response = await fetch('/api/settings/whatsapp');
      const data = await response.json();
      if (data.config) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        alert('✅ Configuración de WhatsApp guardada exitosamente');
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'No se pudo guardar la configuración'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar configuración');
    } finally {
      setSaving(false);
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Configuración de WhatsApp Business</h1>
      <p className="text-gray-600 mb-8">
        Configura tu integración de WhatsApp Business API. Cada tenant debe configurar sus propias credenciales.
      </p>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Estado */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="enabled"
              checked={config.enabled}
              onChange={(e) =>
                setConfig({ ...config, enabled: e.target.checked })
              }
              className="w-5 h-5"
            />
            <div className="flex-1">
              <label htmlFor="enabled" className="font-medium text-lg cursor-pointer">
                Habilitar WhatsApp Business
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Activa la integración de WhatsApp para recibir y enviar mensajes.
              </p>
            </div>
          </div>
        </div>

        {/* Credenciales */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-bold mb-4">Credenciales de WhatsApp Business API</h2>
          <p className="text-sm text-gray-600 mb-4">
            Obtén estas credenciales desde tu Meta Business Account.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number ID *
              </label>
              <input
                type="text"
                value={config.phoneNumberId}
                onChange={(e) =>
                  setConfig({ ...config, phoneNumberId: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: 123456789012345"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                ID del número de teléfono de WhatsApp Business
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Access Token *
              </label>
              <div className="flex gap-2">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={config.accessToken}
                  onChange={(e) =>
                    setConfig({ ...config, accessToken: e.target.value })
                  }
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="EAAxxxxxxxxxxxxx"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  {showToken ? '👁️ Ocultar' : '👁️‍🗨️ Mostrar'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Token de acceso permanente de WhatsApp Business API
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Verify Token (Opcional)
              </label>
              <input
                type="text"
                value={config.verifyToken || ''}
                onChange={(e) =>
                  setConfig({ ...config, verifyToken: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="Token para verificar webhook"
              />
              <p className="text-xs text-gray-500 mt-1">
                Token personalizado para verificar el webhook (opcional)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Webhook URL
              </label>
              <input
                type="text"
                value={config.webhookUrl || ''}
                onChange={(e) =>
                  setConfig({ ...config, webhookUrl: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="https://tudominio.com/api/webhooks/whatsapp"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                URL del webhook (configurar en Meta Business Account)
              </p>
            </div>
          </div>
        </div>

        {/* Información del Negocio */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-bold mb-4">Información del Negocio</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre del Negocio
              </label>
              <input
                type="text"
                value={config.businessName || ''}
                onChange={(e) =>
                  setConfig({ ...config, businessName: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: AutoDealers Premium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Descripción del Negocio
              </label>
              <textarea
                value={config.businessDescription || ''}
                onChange={(e) =>
                  setConfig({ ...config, businessDescription: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="Breve descripción de tu negocio..."
              />
            </div>
          </div>
        </div>

        {/* Respuestas Automáticas */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-bold mb-4">Respuestas Automáticas</h2>
          
          <div className="flex items-start gap-4">
            <input
              type="checkbox"
              id="autoRespond"
              checked={config.autoRespond}
              onChange={(e) =>
                setConfig({ ...config, autoRespond: e.target.checked })
              }
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="autoRespond" className="font-medium cursor-pointer">
                Habilitar respuestas automáticas
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Si está habilitado, se usarán las respuestas automáticas de IA (si están configuradas).
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">
              Mensaje Fuera de Horario
            </label>
            <textarea
              value={config.awayMessage || ''}
              onChange={(e) =>
                setConfig({ ...config, awayMessage: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              rows={3}
              placeholder="Mensaje que se enviará cuando estés fuera de horario..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Este mensaje se enviará automáticamente fuera del horario de trabajo
            </p>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2">📋 Cómo obtener tus credenciales:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Ve a Meta Business Suite</li>
            <li>Selecciona tu cuenta de WhatsApp Business</li>
            <li>Ve a Configuración → API Setup</li>
            <li>Copia el Phone Number ID y Access Token</li>
            <li>Configura el Webhook URL en Meta Business Account</li>
            <li>Usa el Verify Token que configuraste (o déjalo vacío para usar el predeterminado)</li>
          </ol>
        </div>

        {/* Botón Guardar */}
        <div className="pt-6">
          <button
            onClick={saveConfig}
            disabled={saving || !config.phoneNumberId || !config.accessToken}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}


