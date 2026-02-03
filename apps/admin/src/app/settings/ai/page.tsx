'use client';

import { useState, useEffect } from 'react';

interface AIConfig {
  autoRespondMessages: boolean;
  autoRespondEmails: boolean;
  autoRespondComments: boolean;
  autoClassifyLeads: boolean;
  autoGenerateContent: boolean;
  requireApproval: boolean;
  confidenceThreshold: number;
  customInstructions?: string;
  responseTone: 'professional' | 'friendly' | 'casual';
}

export default function AISettingsPage() {
  const [config, setConfig] = useState<AIConfig>({
    autoRespondMessages: false,
    autoRespondEmails: false,
    autoRespondComments: false,
    autoClassifyLeads: true,
    autoGenerateContent: true,
    requireApproval: true,
    confidenceThreshold: 0.8,
    responseTone: 'professional',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const response = await fetch('/api/settings/ai');
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
      const response = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        alert('✅ Configuración guardada exitosamente');
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
      <h1 className="text-3xl font-bold mb-6">Configuración de IA</h1>
      <p className="text-gray-600 mb-8">
        Configura cómo la IA trabajará automáticamente en tu plataforma. Puedes autorizar
        a la IA para responder mensajes automáticamente o requerir aprobación antes de enviar.
      </p>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Respuestas Automáticas */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-bold mb-4">Respuestas Automáticas</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="autoRespondMessages"
                checked={config.autoRespondMessages}
                onChange={(e) =>
                  setConfig({ ...config, autoRespondMessages: e.target.checked })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="autoRespondMessages" className="font-medium cursor-pointer">
                  Autorizar IA para responder mensajes automáticamente
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  La IA responderá automáticamente a todos los mensajes entrantes de WhatsApp,
                  Facebook Messenger e Instagram. Si no marcas esta opción, deberás responder
                  manualmente o configurar respuestas automáticas personalizadas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="autoRespondEmails"
                checked={config.autoRespondEmails}
                onChange={(e) =>
                  setConfig({ ...config, autoRespondEmails: e.target.checked })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="autoRespondEmails" className="font-medium cursor-pointer">
                  Autorizar IA para responder emails automáticamente
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  La IA responderá automáticamente a emails entrantes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="autoRespondComments"
                checked={config.autoRespondComments}
                onChange={(e) =>
                  setConfig({ ...config, autoRespondComments: e.target.checked })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="autoRespondComments" className="font-medium cursor-pointer">
                  Autorizar IA para responder comentarios automáticamente
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  La IA responderá automáticamente a comentarios en Facebook e Instagram.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Requerir Aprobación */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-bold mb-4">Aprobación de Respuestas</h2>
          
          <div className="flex items-start gap-4">
            <input
              type="checkbox"
              id="requireApproval"
              checked={config.requireApproval}
              onChange={(e) =>
                setConfig({ ...config, requireApproval: e.target.checked })
              }
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="requireApproval" className="font-medium cursor-pointer">
                Requerir aprobación antes de enviar respuestas de IA
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Si está marcado, todas las respuestas generadas por IA requerirán tu aprobación
                antes de ser enviadas. Si no está marcado, las respuestas se enviarán automáticamente
                si la confianza es mayor al umbral configurado.
              </p>
            </div>
          </div>

          {!config.requireApproval && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Umbral de Confianza ({Math.round(config.confidenceThreshold * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.confidenceThreshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    confidenceThreshold: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Solo se enviarán respuestas automáticamente si la confianza es mayor a este valor.
                Respuestas con menor confianza requerirán aprobación.
              </p>
            </div>
          )}
        </div>

        {/* Otras Automatizaciones */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-bold mb-4">Otras Automatizaciones</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="autoClassifyLeads"
                checked={config.autoClassifyLeads}
                onChange={(e) =>
                  setConfig({ ...config, autoClassifyLeads: e.target.checked })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="autoClassifyLeads" className="font-medium cursor-pointer">
                  Clasificar leads automáticamente con IA
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Los nuevos leads serán clasificados automáticamente por prioridad, sentimiento e intención.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="autoGenerateContent"
                checked={config.autoGenerateContent}
                onChange={(e) =>
                  setConfig({ ...config, autoGenerateContent: e.target.checked })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="autoGenerateContent" className="font-medium cursor-pointer">
                  Generar contenido automáticamente
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  La IA ayudará a generar contenido para posts, campañas y mensajes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tono de Respuesta */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-bold mb-4">Tono de Respuesta</h2>
          
          <select
            value={config.responseTone}
            onChange={(e) =>
              setConfig({ ...config, responseTone: e.target.value as any })
            }
            className="w-full border rounded px-3 py-2"
          >
            <option value="professional">Profesional</option>
            <option value="friendly">Amigable</option>
            <option value="casual">Casual</option>
          </select>
          <p className="text-sm text-gray-600 mt-2">
            Define el tono que la IA usará en sus respuestas automáticas.
          </p>
        </div>

        {/* Instrucciones Personalizadas */}
        <div>
          <h2 className="text-xl font-bold mb-4">Instrucciones Personalizadas</h2>
          
          <textarea
            value={config.customInstructions || ''}
            onChange={(e) =>
              setConfig({ ...config, customInstructions: e.target.value })
            }
            className="w-full border rounded px-3 py-2"
            rows={4}
            placeholder="Ej: Siempre menciona que ofrecemos financiamiento. Nunca hagas promesas sobre precios sin consultar primero..."
          />
          <p className="text-sm text-gray-600 mt-2">
            Agrega instrucciones específicas para que la IA las siga en todas sus respuestas.
          </p>
        </div>

        {/* Botón Guardar */}
        <div className="pt-6">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}




