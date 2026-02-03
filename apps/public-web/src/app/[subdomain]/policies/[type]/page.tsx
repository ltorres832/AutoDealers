// generateStaticParams está en layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type PolicyType = 'privacy' | 'terms' | 'cookies' | 'returns' | 'warranty';

interface Policy {
  type: PolicyType;
  title: string;
  content: string;
  enabled: boolean;
  lastUpdated?: string;
  tenantName?: string;
  tenantSubdomain?: string;
}

const POLICY_INFO: Record<PolicyType, { label: string; icon: string }> = {
  privacy: { label: 'Política de Privacidad', icon: '🔒' },
  terms: { label: 'Términos y Condiciones', icon: '📋' },
  cookies: { label: 'Política de Cookies', icon: '🍪' },
  returns: { label: 'Política de Devoluciones', icon: '↩️' },
  warranty: { label: 'Política de Garantías', icon: '🛡️' },
};

export default function PolicyPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const type = params.type as PolicyType;
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    fetchPolicy();
    fetchTenant();
  }, [subdomain, type]);

  async function fetchTenant() {
    try {
      const response = await fetch(`/api/tenant/${subdomain}`);
      const data = await response.json();
      setTenant(data.tenant);
    } catch (error) {
      console.error('Error fetching tenant:', error);
    }
  }

  async function fetchPolicy() {
    setLoading(true);
    try {
      const response = await fetch(`/api/policies/${subdomain}/${type}`);
      if (response.ok) {
        const data = await response.json();
        setPolicy(data.policy);
      } else {
        console.error('Error fetching policy');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!policy || !policy.enabled) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Política no encontrada</h1>
          <p className="text-gray-600 mb-4">Esta política no está disponible o ha sido deshabilitada.</p>
          <Link
            href={`/${subdomain}`}
            className="text-primary-600 hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = tenant?.branding?.primaryColor || '#2563EB';
  const policyInfo = POLICY_INFO[type];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="bg-white shadow"
        style={{
          backgroundColor: primaryColor,
        }}
      >
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <Link href={`/${subdomain}`}>
                <h1 className="text-3xl font-bold text-white">{tenant?.name || 'Concesionario'}</h1>
              </Link>
              <p className="text-white/80 mt-1">Tu concesionario de confianza</p>
            </div>
            <Link
              href={`/${subdomain}`}
              className="bg-white/20 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/30"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <ol className="flex items-center space-x-2 text-sm text-gray-600">
              <li>
                <Link href={`/${subdomain}`} className="hover:text-primary-600">
                  Inicio
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href={`/${subdomain}/policies`} className="hover:text-primary-600">
                  Políticas
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-900">{policyInfo.label}</li>
            </ol>
          </nav>

          {/* Policy Content */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">{policyInfo.icon}</span>
              <h1 className="text-4xl font-bold text-gray-900">{policy.title}</h1>
            </div>

            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(policy.content) }}
            />

            {policy.lastUpdated && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 italic">
                  Última actualización: {new Date(policy.lastUpdated).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Navigation to other policies */}
          <div className="mt-8 bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Otras Políticas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(POLICY_INFO) as PolicyType[]).map((policyType) => {
                if (policyType === type) return null;
                const info = POLICY_INFO[policyType];
                return (
                  <Link
                    key={policyType}
                    href={`/${subdomain}/policies/${policyType}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition"
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <span className="font-medium">{info.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">{tenant?.name || 'Concesionario'}</h3>
              <p className="text-gray-400 text-sm">
                {tenant?.description?.substring(0, 150) || 'Descripción del negocio...'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Enlaces</h4>
              <div className="space-y-2 text-sm">
                <Link href={`/${subdomain}`} className="text-gray-400 hover:text-white block">
                  Inicio
                </Link>
                <Link href={`/${subdomain}/policies`} className="text-gray-400 hover:text-white block">
                  Políticas
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Políticas</h4>
              <div className="space-y-2 text-sm">
                {(Object.keys(POLICY_INFO) as PolicyType[]).map((policyType) => {
                  const info = POLICY_INFO[policyType];
                  return (
                    <Link
                      key={policyType}
                      href={`/${subdomain}/policies/${policyType}`}
                      className="text-gray-400 hover:text-white block"
                    >
                      {info.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-400">
            <p>© {new Date().getFullYear()} {tenant?.name || 'Concesionario'}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
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
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
  
  // Listas con viñetas
  html = html.replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>');
  html = html.replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4">$2</li>');
  
  // Agrupar listas
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside my-4 space-y-2">$&</ul>');
  
  // Párrafos
  html = html.split('\n\n').map(p => {
    if (!p.trim() || p.trim().startsWith('<')) return p;
    return `<p class="mb-4 text-gray-700 leading-relaxed">${p.trim()}</p>`;
  }).join('\n');
  
  // Código inline
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded text-sm">$1</code>');
  
  // Tablas básicas
  html = html.replace(/\|(.+)\|/g, (match, content) => {
    const cells = content.split('|').map((cell: string) => cell.trim());
    return `<tr>${cells.map((cell: string) => `<td class="border px-4 py-2">${cell}</td>`).join('')}</tr>`;
  });
  
  // Enlaces
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
  
  return html;
}


