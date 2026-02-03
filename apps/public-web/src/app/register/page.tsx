'use client';
export const dynamic = 'force-dynamic';

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
    // Multi Dealer
    multiDealerEnabled?: boolean;
    maxDealers?: number | null;
    requiresAdminApproval?: boolean;
    // Email corporativo
    corporateEmailEnabled?: boolean;
    maxCorporateEmails?: number | null;
  };
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlType = searchParams.get('type');
  const referralCodeFromUrl = searchParams.get('ref'); // Código de referido desde URL
  const [step, setStep] = useState<1 | 2>(urlType ? 2 : 1);
  const [accountType, setAccountType] = useState<'dealer' | 'seller' | null>(
    urlType === 'dealer' || urlType === 'seller' ? urlType : null
  );
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    subdomain: '',
    phone: '',
    companyName: '', // Nombre de la compañía (solo para dealers)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Nota: La selección de membresía se hará después de crear la cuenta

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Validar nombre de compañía para dealers
    if (accountType === 'dealer' && !formData.companyName) {
      setError('Debes ingresar el nombre de la compañía');
      return;
    }

    setLoading(true);

    try {
      // Crear cuenta sin membresía (se seleccionará después)
      const response = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          accountType: accountType, // dealer o seller
          referralCode: referralCodeFromUrl || undefined, // Incluir código de referido si existe
          // No incluir membershipId - se seleccionará después de crear la cuenta
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Error al registrar');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      const data = await response.json();

      // Guardar información del usuario en localStorage para usar en checkout
      if (typeof window !== 'undefined' && data.userId) {
        localStorage.setItem('registration_user', JSON.stringify({
          id: data.userId,
          email: data.userEmail || formData.email,
          name: data.userName || formData.name,
        }));
      }

      // Redirigir a selección de membresía después de crear la cuenta
      router.push(`/register/membership?type=${accountType}&userId=${data.userId || ''}&registered=true`);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Crear Cuenta
            </h1>
            <p className="text-gray-600">
              Selecciona el tipo de cuenta que deseas crear
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div
              onClick={() => {
                setAccountType('dealer');
                setStep(2);
              }}
              className="bg-white rounded-lg shadow-lg p-8 cursor-pointer border-2 border-gray-200 hover:border-primary-300 transition-all"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">🏢</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Dealer
                </h3>
                <p className="text-gray-600 mb-4">
                  Para empresas o individuos con inventario propio
                </p>
                <ul className="text-left text-sm text-gray-700 space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Puedes crear y gestionar vendedores
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Dashboard completo con CRM
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Página web pública con subdominio
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Integración con redes sociales
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t">
                  <Link
                    href="/register/multi-dealer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium inline-flex items-center gap-1"
                  >
                    ¿Necesitas gestionar múltiples dealers?{' '}
                    <span className="text-xs bg-primary-100 px-2 py-1 rounded">Multi Dealer</span>
                  </Link>
                </div>
              </div>
            </div>

            <div
              onClick={() => {
                setAccountType('seller');
                setStep(2);
              }}
              className="bg-white rounded-lg shadow-lg p-8 cursor-pointer border-2 border-gray-200 hover:border-primary-300 transition-all"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">👤</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Vendedor
                </h3>
                <p className="text-gray-600 mb-4">
                  Para vendedores individuales
                </p>
                <ul className="text-left text-sm text-gray-700 space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Dashboard y CRM propios
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Gestión de leads y citas
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Puedes pertenecer a un dealer o ser independiente
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Subdominio propio (según plan)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Paso 2: Formulario de registro (sin selección de membresía)
  return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <button
              onClick={() => setStep(1)}
              className="text-primary-600 hover:text-primary-700 flex items-center gap-2 mb-4"
            >
              ← Volver a selección de tipo
            </button>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Completa tu registro
          </h2>
          <p className="text-sm text-gray-600">
            Después de crear tu cuenta, podrás seleccionar tu plan de membresía
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {accountType === 'dealer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Compañía *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ej: Grupo Automotriz ABC"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Este nombre ayuda al administrador a identificar dealers de la misma compañía
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {accountType === 'dealer' ? 'Nombre del Dealer' : 'Nombre completo'} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={accountType === 'dealer' ? 'Ej: Dealer Centro' : 'Ej: Juan Pérez'}
              required
            />
            {accountType === 'dealer' && (
              <p className="text-xs text-gray-500 mt-1">
                Nombre específico de este dealer (puede haber varios dealers bajo la misma compañía)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subdominio (opcional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.subdomain}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  })
                }
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="mi-tienda"
                pattern="[a-z0-9-]+"
              />
              <span className="text-gray-600">.autodealers.com</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              El subdominio estará disponible según tu plan de membresía
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>

          <p className="text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary-600 hover:text-primary-700">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
