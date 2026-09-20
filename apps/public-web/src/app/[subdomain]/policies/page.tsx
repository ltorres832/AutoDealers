import Link from 'next/link';
import PublicBackButton from '@/components/PublicBackButton';
import {
  getPublicPoliciesForSubdomain,
} from '@/lib/public-policies';

export const dynamic = 'force-dynamic';

type PolicyType =
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'returns'
  | 'warranty'
  | 'shipping'
  | 'data_protection'
  | 'disclaimer'
  | 'custom';

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
  shipping: {
    label: 'Política de Envíos',
    description: 'Información sobre entregas, coordinación y documentación',
    icon: '🚚',
  },
  data_protection: {
    label: 'Protección de Datos',
    description: 'Cómo protegemos y procesamos la información personal',
    icon: '🔐',
  },
  disclaimer: {
    label: 'Disclosures',
    description: 'Divulgaciones, advertencias y aclaraciones legales',
    icon: '⚠️',
  },
  custom: {
    label: 'Política Personalizada',
    description: 'Política adicional publicada por la plataforma',
    icon: '📄',
  },
};

type PageProps = {
  params: Promise<{ subdomain: string }>;
};

export default async function PoliciesPage({ params }: PageProps) {
  const { subdomain } = await params;
  const { tenant, allPolicies } = await getPublicPoliciesForSubdomain(subdomain, 'es');
  const enabledPolicies = allPolicies.filter((policy) => policy.enabled);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <Link href={`/${subdomain}`}>
                <h1 className="text-3xl font-bold text-gray-900">{tenant?.name || 'Concesionario'}</h1>
              </Link>
              <p className="text-gray-600 mt-1">Tu catálogo de confianza</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <PublicBackButton
                className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                Volver
              </PublicBackButton>
              <Link
                href={`/${subdomain}`}
                className="text-sm text-primary-600 hover:text-primary-700 underline underline-offset-2 hidden sm:inline"
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
              {enabledPolicies.map((policy) => {
                const type = policy.type as PolicyType;
                const info = POLICY_INFO[type] || POLICY_INFO.custom;
                return (
                  <Link
                    key={policy.id || policy.slug || `${policy.type}-${policy.title}`}
                    href={`/${subdomain}/policies/${encodeURIComponent(policy.slug || policy.id || policy.type)}`}
                    className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-lg transition hover:border-primary-500"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-4xl">{info.icon}</span>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                          {policy.title || info.label}
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
                {enabledPolicies.map((policy) => {
                  const info = POLICY_INFO[policy.type as PolicyType] || POLICY_INFO.custom;
                  return (
                    <Link
                      key={policy.id || policy.slug || `${policy.type}-${policy.title}`}
                      href={`/${subdomain}/policies/${encodeURIComponent(policy.slug || policy.id || policy.type)}`}
                      className="text-gray-400 hover:text-white block"
                    >
                      {policy.title || info.label}
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


