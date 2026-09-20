// generateStaticParams está en layout.tsx
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

const POLICY_INFO: Record<PolicyType, { label: string; icon: string }> = {
  privacy: { label: 'Política de Privacidad', icon: '🔒' },
  terms: { label: 'Términos y Condiciones', icon: '📋' },
  cookies: { label: 'Política de Cookies', icon: '🍪' },
  returns: { label: 'Política de Devoluciones', icon: '↩️' },
  warranty: { label: 'Política de Garantías', icon: '🛡️' },
  shipping: { label: 'Política de Envíos', icon: '🚚' },
  data_protection: { label: 'Protección de Datos', icon: '🔐' },
  disclaimer: { label: 'Disclosures', icon: '⚠️' },
  custom: { label: 'Política Personalizada', icon: '📄' },
};

type PageProps = {
  params: Promise<{ subdomain: string; type: string }>;
};

export default async function PolicyPage({ params }: PageProps) {
  const { subdomain, type: rawType } = await params;
  const decodedKey = decodeURIComponent(rawType);
  const { tenant, policies, allPolicies } = await getPublicPoliciesForSubdomain(subdomain, 'es');
  const policy =
    allPolicies.find((p) => p.id === decodedKey || p.slug === decodedKey) ||
    policies[decodedKey] ||
    null;
  const enabledPolicies = allPolicies.filter((p) => p.enabled);

  if (!policy || !policy.enabled) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Política no encontrada</h1>
          <p className="text-gray-600 mb-4">Esta política no está disponible o ha sido deshabilitada.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <PublicBackButton
              className="text-primary-600 hover:underline font-medium"
            >
              Volver
            </PublicBackButton>
            <span className="text-gray-300">|</span>
            <Link href={`/${subdomain}`} className="text-sm text-gray-500 hover:text-primary-600">
              Inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const type = policy.type as PolicyType;
  const policyInfo = POLICY_INFO[type] || { label: policy.title, icon: '📄' };

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

            <div className="prose prose-lg max-w-none whitespace-pre-wrap text-gray-700">
              {policy.content}
            </div>

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
              {enabledPolicies.map((otherPolicy) => {
                if ((otherPolicy.id || otherPolicy.slug) === (policy.id || policy.slug)) return null;
                const info = POLICY_INFO[otherPolicy.type as PolicyType] || POLICY_INFO.custom;
                return (
                  <Link
                    key={otherPolicy.id || otherPolicy.slug || `${otherPolicy.type}-${otherPolicy.title}`}
                    href={`/${subdomain}/policies/${encodeURIComponent(otherPolicy.slug || otherPolicy.id || otherPolicy.type)}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition"
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <span className="font-medium">{otherPolicy.title || info.label}</span>
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
                {enabledPolicies.map((otherPolicy) => {
                  const info = POLICY_INFO[otherPolicy.type as PolicyType] || POLICY_INFO.custom;
                  return (
                    <Link
                      key={otherPolicy.id || otherPolicy.slug || `${otherPolicy.type}-${otherPolicy.title}`}
                      href={`/${subdomain}/policies/${encodeURIComponent(otherPolicy.slug || otherPolicy.id || otherPolicy.type)}`}
                      className="text-gray-400 hover:text-white block"
                    >
                      {otherPolicy.title || info.label}
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


