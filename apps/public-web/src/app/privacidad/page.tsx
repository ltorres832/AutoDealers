import Link from 'next/link';
import PublicBackButton from '@/components/PublicBackButton';
import { getPublicPolicyByType } from '@/lib/public-policies';

export const dynamic = 'force-dynamic';

export default async function PrivacidadPage() {
  const policy = await getPublicPolicyByType('privacy', { language: 'es' });

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AD</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-600 bg-clip-text text-transparent">
                AutoDealersOnline
              </span>
            </Link>
            <Link
              href="/login"
              className="bg-gradient-to-r from-primary-600 to-primary-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-8 flex flex-wrap items-center gap-3 gap-y-2">
          <PublicBackButton className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
            Volver
          </PublicBackButton>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <Link href="/" className="text-sm text-gray-500 hover:text-primary-600">
            Inicio
          </Link>
        </div>

        {policy ? (
          <>
            <div className="mb-12">
              <h1 className="text-4xl font-bold mb-4">{policy.title}</h1>
              {policy.lastUpdated || policy.effectiveDate ? (
                <p className="text-gray-600">
                  Última actualización:{' '}
                  {new Date(policy.lastUpdated || policy.effectiveDate || '').toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              ) : null}
            </div>
            <article className="prose prose-lg max-w-none whitespace-pre-wrap text-gray-700">
              {policy.content}
            </article>
          </>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
            No hay política de privacidad activa publicada desde el admin.
          </div>
        )}
      </main>
    </div>
  );
}
