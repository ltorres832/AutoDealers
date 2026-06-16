'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PublicBackButton from '@/components/PublicBackButton';

type PolicyType = 'privacy' | 'terms' | 'cookies' | 'returns' | 'warranty';

interface Policy {
  type: PolicyType;
  title: string;
  enabled: boolean;
}

const POLICY_INFO: Record<PolicyType, { label: string; description: string; icon: string }> = {
  privacy: {
    label: 'Política de Privacidad',
    description: 'Información sobre cómo recopilamos, usamos y protegemos tus datos personales',
    icon: '🔒',
  },
  terms: {
    label: 'Términos y Condiciones',
    description: 'Reglas y condiciones para el uso de nuestros servicios',
    icon: '📋',
  },
  cookies: {
    label: 'Política de Cookies',
    description: 'Explicación sobre el uso de cookies y tecnologías de seguimiento',
    icon: '🍪',
  },
  returns: {
    label: 'Política de Devoluciones',
    description: 'Términos y condiciones para devoluciones y reembolsos',
    icon: '↩️',
  },
  warranty: {
    label: 'Política de Garantías',
    description: 'Información sobre garantías y coberturas ofrecidas',
    icon: '🛡️',
  },
};

export default function PoliciesPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const [policies, setPolicies] = useState<Record<PolicyType, Policy>>({} as any);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [subdomain]);

  async function fetchData() {
    setLoading(true);
    try {
      const [tenantRes, policiesRes] = await Promise.all([
        fetch(`/api/tenant/${subdomain}`),
        fetch(`/api/tenant/${subdomain}`),
      ]);

      if (tenantRes.ok) {
        const tenantData = await tenantRes.json();
        setTenant(tenantData.tenant);
        
        // Extraer políticas del tenant
        const tenantPolicies = tenantData.tenant?.policies || {};
        setPolicies(tenantPolicies);
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

  const primaryColor = tenant?.branding?.primaryColor || '#E10600';
  const enabledPolicies = (Object.keys(POLICY_INFO) as PolicyType[]).filter(
    (type) => policies[type]?.enabled
  );

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
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <PublicBackButton
                className="bg-white/20 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/30"
              >
                Volver
              </PublicBackButton>
              <Link
                href={`/${subdomain}`}
                className="text-sm text-white/90 hover:text-white underline underline-offset-2 hidden sm:inline"
              >
                Inicio
              </Link>
            </div>
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
              <li className="text-gray-900">Políticas</li>
            </ol>
          </nav>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Políticas Legales</h1>
            <p className="text-lg text-gray-600">
              Aquí puedes encontrar todas nuestras políticas legales y términos de servicio.
            </p>
          </div>

          {/* Policies List */}
          {enabledPolicies.length === 0 ? (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
              <p className="text-gray-600">No hay políticas disponibles en este momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {enabledPolicies.map((type) => {
                const info = POLICY_INFO[type];
                const policy = policies[type];
                return (
                  <Link
                    key={type}
                    href={`/${subdomain}/policies/${type}`}
                    className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-lg transition hover:border-primary-500"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-4xl">{info.icon}</span>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                          {policy?.title || info.label}
                        </h2>
                        <p className="text-gray-600 text-sm">{info.description}</p>
                        <span className="inline-block mt-4 text-primary-600 font-medium text-sm">
                          Leer más →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
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
                {enabledPolicies.map((type) => {
                  const info = POLICY_INFO[type];
                  return (
                    <Link
                      key={type}
                      href={`/${subdomain}/policies/${type}`}
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


