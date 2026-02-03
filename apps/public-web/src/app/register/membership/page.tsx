'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Membership {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: {
    customSubdomain: boolean;
    aiEnabled: boolean;
    socialMediaEnabled: boolean;
    marketplaceEnabled: boolean;
    advancedReports: boolean;
    maxInventory?: number;
    multiDealerEnabled?: boolean;
    maxDealers?: number | null;
    requiresAdminApproval?: boolean;
    corporateEmailEnabled?: boolean;
    maxCorporateEmails?: number | null;
  };
}

function MembershipSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountType = searchParams.get('type') as 'dealer' | 'seller' | null;
  const userId = searchParams.get('userId') || '';
  const registered = searchParams.get('registered') === 'true';
  
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedMembership, setSelectedMembership] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (accountType) {
      fetchMemberships(accountType);
    }
  }, [accountType]);

  async function fetchMemberships(type: 'dealer' | 'seller') {
    try {
      const response = await fetch(`/api/public/memberships?type=${type}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }
      
      const data = await response.json();
      setMemberships(data.memberships || []);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      setError('Error al cargar las membresías. Por favor, intenta de nuevo.');
      setMemberships([]);
    }
  }

  async function handleSelectMembership() {
    if (!selectedMembership) {
      setError('Debes seleccionar una membresía');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Obtener información del usuario para el checkout
      // Usar el userId del URL params directamente si está disponible
      let userEmail = '';
      let userName = '';

      // Intentar obtener del localStorage o de la sesión si está disponible
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('registration_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            userEmail = parsed.email || '';
            userName = parsed.name || '';
          } catch (e) {
            console.warn('Error parsing stored user:', e);
          }
        }
      }

      // Si no hay datos almacenados, intentar obtener de la API
      if (!userEmail || !userName) {
        try {
          const userResponse = await fetch(`/api/public/user/${userId}`);
          if (userResponse.ok) {
            const contentType = userResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const userData = await userResponse.json();
              userEmail = userData.user?.email || '';
              userName = userData.user?.name || '';
            }
          }
        } catch (apiError) {
          console.warn('Error fetching user from API, using fallback:', apiError);
        }
      }

      // Si aún no tenemos email/name, usar valores por defecto o error
      if (!userEmail || !userName) {
        throw new Error('No se pudo obtener la información del usuario. Por favor, recarga la página.');
      }

      // Crear sesión de checkout de Stripe
      const response = await fetch('/api/public/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          membershipId: selectedMembership,
          accountType,
          userEmail,
          userName,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Error al crear sesión de pago');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      const data = await response.json();

      if (!data.checkoutUrl) {
        throw new Error('No se recibió la URL de checkout');
      }

      // Redirigir a Stripe Checkout para el pago
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al procesar el pago');
      setLoading(false);
    }
  }

  if (!accountType) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tipo de cuenta no especificado</h2>
          <Link href="/register" className="text-primary-600 hover:text-primary-700">
            Volver al registro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          {registered && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              ✅ Cuenta creada exitosamente. Ahora selecciona tu plan de membresía.
            </div>
          )}
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Selecciona tu Plan
          </h1>
          <p className="text-gray-600">
            Elige el plan que mejor se adapte a tus necesidades
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {memberships.map((membership) => (
            <div
              key={membership.id}
              onClick={() => setSelectedMembership(membership.id)}
              className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer border-2 transition-all ${
                selectedMembership === membership.id
                  ? 'border-primary-600 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-primary-300'
              }`}
            >
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {membership.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-extrabold text-primary-600">
                    ${membership.price}
                  </span>
                  <span className="text-gray-600">
                    /{membership.billingCycle === 'monthly' ? 'mes' : 'año'}
                  </span>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {membership.features.customSubdomain && (
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>
                    Subdominio personalizado
                  </li>
                )}
                {membership.features.aiEnabled && (
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>
                    IA habilitada
                  </li>
                )}
                {membership.features.socialMediaEnabled && (
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>
                    Redes sociales
                  </li>
                )}
                {membership.features.advancedReports && (
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>
                    Reportes avanzados
                  </li>
                )}
                {membership.features.maxInventory !== undefined && (
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-blue-500">📊</span>
                    Máx. {membership.features.maxInventory === 0
                      ? 'Ilimitado'
                      : membership.features.maxInventory}{' '}
                    vehículos
                  </li>
                )}
                {membership.features.multiDealerEnabled && (
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-purple-500">🏢</span>
                    Dealers:{' '}
                    {membership.features.maxDealers === null || membership.features.maxDealers === undefined
                      ? 'Ilimitados'
                      : membership.features.maxDealers}
                  </li>
                )}
                {membership.features.corporateEmailEnabled && (
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-blue-500">📧</span>
                    Emails:{' '}
                    {membership.features.maxCorporateEmails === null || membership.features.maxCorporateEmails === undefined
                      ? 'Ilimitados'
                      : membership.features.maxCorporateEmails}
                  </li>
                )}
              </ul>

              {selectedMembership === membership.id && (
                <div className="text-center">
                  <div className="bg-primary-100 text-primary-700 px-4 py-2 rounded font-medium">
                    Seleccionado
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {memberships.length === 0 && (
          <div className="text-center text-gray-600 py-8">
            No hay membresías disponibles en este momento
          </div>
        )}

        <div className="text-center">
          <button
            onClick={handleSelectMembership}
            disabled={!selectedMembership || memberships.length === 0 || loading}
            className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : 'Continuar'}
          </button>
          <p className="text-sm text-gray-600 mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary-600 hover:text-primary-700">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MembershipSelectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    }>
      <MembershipSelectionContent />
    </Suspense>
  );
}

