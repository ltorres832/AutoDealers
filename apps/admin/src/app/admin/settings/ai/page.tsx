'use client';

import { useState, useEffect } from 'react';

interface AIConfig {
  provider: 'openai' | 'anthropic' | 'none';
  openaiApiKey: string;
  anthropicApiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export default function AISettingsPage() {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'none',
    openaiApiKey: '',
    anthropicApiKey: '',
    model: 'gpt-4',
    maxTokens: 1000,
    temperature: 0.7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/ai', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig({
            provider: data.config.provider || 'none',
            openaiApiKey: data.config.openaiApiKey ? '••••••••••••••••' : '',
            anthropicApiKey: data.config.anthropicApiKey ? '••••••••••••••••' : '',
            model: data.config.model || 'gpt-4',
            maxTokens: data.config.maxTokens || 1000,
            temperature: data.config.temperature || 0.7,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage(null);

      if (config.provider === 'none') {
        setMessage({ type: 'error', text: 'Por favor selecciona un proveedor de IA' });
        return;
      }

      if (config.provider === 'openai' && !config.openaiApiKey) {
        setMessage({ type: 'error', text: 'Por favor ingresa tu API Key de OpenAI' });
        return;
      }

      if (config.provider === 'anthropic' && !config.anthropicApiKey) {
        setMessage({ type: 'error', text: 'Por favor ingresa tu API Key de Anthropic' });
        return;
      }

      // Si las keys están enmascaradas, no enviarlas
      const openaiApiKey = config.openaiApiKey.includes('•') ? undefined : config.openaiApiKey;
      const anthropicApiKey = config.anthropicApiKey.includes('•') ? undefined : config.anthropicApiKey;

      const response = await fetch('/api/admin/settings/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          provider: config.provider,
          openaiApiKey: openaiApiKey,
          anthropicApiKey: anthropicApiKey,
          model: config.model,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ type: 'success', text: result.message || 'Configuración de IA guardada exitosamente' });
        // Enmascarar las keys después de guardar
        if (openaiApiKey) {
          setConfig(prev => ({ ...prev, openaiApiKey: '••••••••••••••••' }));
        }
        if (anthropicApiKey) {
          setConfig(prev => ({ ...prev, anthropicApiKey: '••••••••••••••••' }));
        }
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || error.error || 'Error al guardar configuración' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar configuración' });
    } finally {
      setSaving(false);
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
      <h1 className="text-2xl font-bold mb-6">Configuración de IA</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🤖 Proveedor de IA</h2>
        <p className="text-gray-600 mb-6">
          Configura las credenciales de IA para que el sistema pueda generar contenido automáticamente para redes sociales, clasificar leads, y más.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Proveedor de IA <span className="text-red-500">*</span>
            </label>
            <select
              value={config.provider}
              onChange={(e) => setConfig(prev => ({ ...prev, provider: e.target.value as 'openai' | 'anthropic' | 'none' }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="none">Sin IA (desactivado)</option>
              <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>

          {config.provider === 'openai' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                OpenAI API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={config.openaiApiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={config.openaiApiKey.includes('•') ? '••••••••••••••••' : 'sk-...'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtén tu API Key desde{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  platform.openai.com/api-keys
                </a>
              </p>
            </div>
          )}

          {config.provider === 'anthropic' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Anthropic API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={config.anthropicApiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, anthropicApiKey: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={config.anthropicApiKey.includes('•') ? '••••••••••••••••' : 'sk-ant-...'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtén tu API Key desde{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  console.anthropic.com/settings/keys
                </a>
              </p>
            </div>
          )}

          {config.provider !== 'none' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Modelo</label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {config.provider === 'openai' ? (
                    <>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </>
                  ) : (
                    <>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                      <option value="claude-3-haiku">Claude 3 Haiku</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Tokens</label>
                  <input
                    type="number"
                    value={config.maxTokens}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 1000 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="100"
                    max="4000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Temperature</label>
                  <input
                    type="number"
                    value={config.temperature}
                    onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="2"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = Determinista, 2 = Muy creativo</p>
                </div>
              </div>
            </>
          )}

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
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ ¿Para qué se usa la IA?</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-blue-800">
          <li><strong>Generación de contenido:</strong> Crea automáticamente textos, hashtags y CTAs para posts en redes sociales</li>
          <li><strong>Clasificación de leads:</strong> Analiza y clasifica automáticamente los leads según su probabilidad de compra</li>
          <li><strong>Respuestas automáticas:</strong> Genera respuestas sugeridas para mensajes de clientes</li>
          <li><strong>Optimización de anuncios:</strong> Mejora el contenido de anuncios para mayor engagement</li>
        </ul>
      </div>
    </div>
  );
}

