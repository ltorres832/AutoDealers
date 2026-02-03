'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type PolicyType = 'privacy' | 'terms' | 'cookies' | 'returns' | 'warranty';

interface Policy {
  type: PolicyType;
  title: string;
  content: string;
  enabled: boolean;
  lastUpdated?: string;
}

interface PoliciesSettings {
  privacy: Policy;
  terms: Policy;
  cookies: Policy;
  returns: Policy;
  warranty: Policy;
}

const POLICY_INFO: Record<PolicyType, { label: string; description: string; icon: string }> = {
  privacy: {
    label: 'Política de Privacidad',
    description: 'Informa a los usuarios sobre cómo se recopila, usa y protege su información personal',
    icon: '🔒',
  },
  terms: {
    label: 'Términos y Condiciones',
    description: 'Establece las reglas y condiciones para el uso de tus servicios',
    icon: '📋',
  },
  cookies: {
    label: 'Política de Cookies',
    description: 'Explica el uso de cookies y tecnologías de seguimiento en tu sitio web',
    icon: '🍪',
  },
  returns: {
    label: 'Política de Devoluciones',
    description: 'Define los términos para devoluciones y reembolsos de vehículos',
    icon: '↩️',
  },
  warranty: {
    label: 'Política de Garantías',
    description: 'Detalla las garantías y coberturas ofrecidas en las ventas',
    icon: '🛡️',
  },
};

export default function PoliciesSettingsPage() {
  const [policies, setPolicies] = useState<PoliciesSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<PolicyType>('privacy');
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/policies');
      
      // Verificar content-type antes de parsear JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Respuesta no es JSON:', text.substring(0, 200));
        throw new Error(`Error del servidor: La respuesta no es JSON (Status: ${response.status})`);
      }
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.policies) {
          setPolicies(data.policies);
        } else {
          console.error('Respuesta sin políticas:', data);
          // Intentar usar políticas por defecto
          setPolicies(null);
        }
      } else {
        console.error('Error en respuesta:', data);
        // El API debería devolver políticas por defecto incluso en caso de error
        // pero si no lo hace, no mostramos error, solo usamos valores por defecto
        setPolicies(null);
      }
    } catch (error: any) {
      console.error('Error fetching policies:', error);
      // No mostrar alert, solo usar valores por defecto
      setPolicies(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!policies) return;

    setSaving(true);
    try {
      const response = await fetch('/api/settings/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policies }),
      });

      if (response.ok) {
        alert('Políticas guardadas exitosamente');
        await fetchPolicies(); // Recargar para obtener timestamps actualizados
      } else {
        alert('Error al guardar las políticas');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar las políticas');
    } finally {
      setSaving(false);
    }
  }

  function updatePolicy(type: PolicyType, updates: Partial<Policy>) {
    if (!policies) return;
    setPolicies({
      ...policies,
      [type]: {
        ...policies[type],
        ...updates,
      },
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!policies) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error al cargar las políticas. Por favor, recarga la página.</p>
        </div>
      </div>
    );
  }

  const activePolicy = policies[activeTab];
  const policyInfo = POLICY_INFO[activeTab];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Políticas Legales</h1>
            <p className="text-gray-600">
              Gestiona y edita las políticas legales que se mostrarán en tu página web pública
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium border border-gray-300"
            >
              {previewMode ? '✏️ Editar' : '👁️ Vista Previa'}
            </button>
          </div>
        </div>

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
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Integraciones
            </Link>
            <Link
              href="/settings/templates"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Templates
            </Link>
            <Link
              href="/settings/website"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Página Web
            </Link>
            <Link
              href="/settings/policies"
              className="border-b-2 border-primary-500 py-4 px-1 text-sm font-medium text-primary-600"
            >
              Políticas
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Lista de políticas */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <h2 className="text-lg font-bold mb-4">Políticas</h2>
            <div className="space-y-2">
              {(Object.keys(POLICY_INFO) as PolicyType[]).map((type) => {
                const info = POLICY_INFO[type];
                const policy = policies[type];
                return (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      activeTab === type
                        ? 'bg-primary-50 border-2 border-primary-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{info.icon}</span>
                        <span className="font-medium text-sm">{info.label}</span>
                      </div>
                      {policy.enabled ? (
                        <span className="text-green-500 text-xs">✓</span>
                      ) : (
                        <span className="text-gray-400 text-xs">○</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content - Editor/Preview */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span>{policyInfo.icon}</span>
                  {policyInfo.label}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{policyInfo.description}</p>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePolicy.enabled}
                  onChange={(e) => updatePolicy(activeTab, { enabled: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium">
                  {activePolicy.enabled ? 'Habilitada' : 'Deshabilitada'}
                </span>
              </label>
            </div>

            {previewMode ? (
              <div className="prose max-w-none">
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h1 className="text-3xl font-bold mb-4">{activePolicy.title}</h1>
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: formatMarkdown(activePolicy.content) 
                    }}
                  />
                  {activePolicy.lastUpdated && (
                    <p className="text-sm text-gray-500 mt-6 italic">
                      Última actualización: {new Date(activePolicy.lastUpdated).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Título *</label>
                  <input
                    type="text"
                    value={activePolicy.title}
                    onChange={(e) => updatePolicy(activeTab, { title: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                    placeholder="Ej: Política de Privacidad"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Contenido *</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Puedes usar Markdown para formatear el contenido (títulos, listas, negritas, etc.)
                  </p>
                  <textarea
                    value={activePolicy.content}
                    onChange={(e) => updatePolicy(activeTab, { content: e.target.value })}
                    className="w-full border rounded px-3 py-2 font-mono text-sm"
                    rows={20}
                    required
                    placeholder="Escribe el contenido de la política aquí..."
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    <p><strong>Tipos de Markdown soportados:</strong></p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li><code># Título</code> - Título principal</li>
                      <li><code>## Subtítulo</code> - Subtítulo</li>
                      <li><code>**negrita**</code> - Texto en negrita</li>
                      <li><code>- Lista</code> - Lista con viñetas</li>
                      <li><code>1. Lista</code> - Lista numerada</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Consejo:</strong> Usa la vista previa para ver cómo se verá el contenido formateado.
                    El contenido se mostrará en tu página web pública en la ruta <code className="bg-blue-100 px-1 rounded">/policies/[tipo]</code>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Función simple para convertir Markdown básico a HTML
function formatMarkdown(text: string): string {
  let html = text;
  
  // Títulos
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>');
  
  // Negrita
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Listas con viñetas
  html = html.replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>');
  html = html.replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4">$2</li>');
  
  // Agrupar listas
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside my-4 space-y-2">$&</ul>');
  
  // Párrafos
  html = html.split('\n\n').map(p => {
    if (!p.trim() || p.trim().startsWith('<')) return p;
    return `<p class="mb-4">${p.trim()}</p>`;
  }).join('\n');
  
  // Código inline
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded">$1</code>');
  
  // Tablas básicas
  html = html.replace(/\|(.+)\|/g, (match, content) => {
    const cells = content.split('|').map((cell: string) => cell.trim());
    return `<tr>${cells.map((cell: string) => `<td class="border px-4 py-2">${cell}</td>`).join('')}</tr>`;
  });
  
  return html;
}

