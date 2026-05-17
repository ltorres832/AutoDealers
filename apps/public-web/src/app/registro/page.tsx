'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import PublicBackButton from '@/components/PublicBackButton';
import { useRouter, useSearchParams } from 'next/navigation';
import { StripePaymentForm } from '@autodealers/shared/client';
import { buildMembershipDisplayLines } from '@/lib/membership-display';
import { isMultiDealerPlan } from '@/lib/membership-flags';

interface Membership {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: any;
  stripePriceId?: string | null;
}

function RegistroPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/login';
  const referralCodeFromUrl = searchParams.get('ref'); // Código de referido desde URL
  const multiDealerRegisterHref = referralCodeFromUrl
    ? `/register/multi-dealer?ref=${encodeURIComponent(referralCodeFromUrl)}`
    : '/register/multi-dealer';
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Paso 1: Tipo de cuenta
    accountType: 'dealer' as 'dealer' | 'seller',
    
    // Paso 2: Información personal
    name: '',
    email: '',
    password: '',
    phone: '',
    
    // Paso 3: Información del negocio
    businessName: '',
    subdomain: '',
    address: '',
    
    // Paso 4: Plan
    membershipId: '',
  });

  const [loading, setLoading] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loadingMemberships, setLoadingMemberships] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsError, setTermsError] = useState('');

  // Cargar membresías cuando cambie el tipo de cuenta o al montar
  useEffect(() => {
    fetchMemberships();
  }, [formData.accountType]);

  async function fetchMemberships() {
    setLoadingMemberships(true);
    try {
      const showMulti =
        formData.accountType === 'dealer' ? '&showMultiDealer=true' : '';
      const response = await fetch(
        `/api/public/memberships?type=${formData.accountType}${showMulti}`
      );
      const data = await response.json();
      setMemberships(data.memberships || []);
    } catch (error) {
      console.error('Error cargando membresías:', error);
      // En caso de error, usar planes por defecto
      setMemberships([]);
    } finally {
      setLoadingMemberships(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTermsError('');

    if (step < 4) {
      setStep(step + 1);
      return;
    }

    if (!acceptTerms) {
      setTermsError('Debes aceptar los términos y condiciones de la plataforma.');
      return;
    }

    // En el paso 4, mostrar el formulario de pago en lugar de crear la cuenta directamente
    const membership = memberships.find(m => m.id === formData.membershipId);
    if (membership) {
      setSelectedMembership(membership);
      setRegistrationData({
        ...formData,
        referralCode: referralCodeFromUrl || undefined,
      });
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    if (!registrationData || !selectedMembership) return;

    setLoading(true);
    try {
      // Crear la cuenta después del pago exitoso
      const response = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registrationData,
          // Si hay stripePriceId, es una suscripción, sino es un pago único
          subscriptionId: selectedMembership.stripePriceId ? paymentId : undefined,
          paymentIntentId: selectedMembership.stripePriceId ? undefined : paymentId,
          acceptPlatformTerms: true,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('¡Cuenta creada exitosamente! Redirigiendo...');
        // Si hay un redirect, ir allí después de login, sino ir a login normal
        if (redirectTo && redirectTo !== '/login') {
          router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`);
        } else {
          router.push('/login');
        }
      } else {
        alert(`Error: ${data.error || 'No se pudo crear la cuenta'}`);
        setShowPayment(false);
      }
    } catch (error) {
      alert('Error al conectar con el servidor');
      setShowPayment(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentError = (error: string) => {
    alert(`Error en el pago: ${error}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3 gap-y-2">
            <PublicBackButton className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </PublicBackButton>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <Link href="/" className="text-sm text-gray-500 hover:text-purple-600">
              Inicio
            </Link>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            Crea tu cuenta en{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AutoDealers
            </span>
          </h1>
          <p className="text-gray-600">En solo 4 pasos tendrás tu plataforma lista</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    s <= step
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      s < step ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tipo de cuenta</span>
            <span>Información</span>
            <span>Negocio</span>
            <span>Plan</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Tipo de cuenta */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">¿Qué tipo de cuenta necesitas?</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, accountType: 'dealer' })}
                      className={`p-8 rounded-xl border-2 transition-all text-left ${
                        formData.accountType === 'dealer'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-4xl mb-4">🏢</div>
                      <h3 className="text-xl font-bold mb-2">Concesionario</h3>
                      <p className="text-gray-600 text-sm">
                        Para concesionarios que gestionan múltiples vendedores e inventario completo
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <span className="text-green-500">✓</span> Múltiples usuarios
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-500">✓</span> Inventario ilimitado
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-500">✓</span> Reportes avanzados
                        </li>
                      </ul>
                    </button>
                    <Link
                      href={multiDealerRegisterHref}
                      className="text-center text-sm text-gray-500 hover:text-blue-600 px-2 py-2 rounded-lg border border-transparent hover:border-blue-100 hover:bg-blue-50/50 transition-colors"
                    >
                      ¿Gestionas varios concesionarios?{' '}
                      <span className="font-semibold text-blue-600 underline-offset-2 hover:underline">
                        Solicitud Multi Dealer
                      </span>
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accountType: 'seller' })}
                    className={`p-8 rounded-xl border-2 transition-all text-left ${
                      formData.accountType === 'seller'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-4xl mb-4">👤</div>
                    <h3 className="text-xl font-bold mb-2">Vendedor Individual</h3>
                    <p className="text-gray-600 text-sm">
                      Para vendedores independientes que gestionan sus propias ventas
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✓</span> Un usuario
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✓</span> CRM personal
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✓</span> Más económico
                      </li>
                    </ul>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Información personal */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Información Personal</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      minLength={8}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Información del negocio */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Información del Negocio</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Negocio *
                    </label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subdominio *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.subdomain}
                        onChange={(e) =>
                          setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
                        }
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="mi-negocio"
                        required
                      />
                      <span className="text-gray-600">.autodealers.com</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Tu sitio web será: {formData.subdomain || 'subdominio'}.autodealers.com</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Selección de plan */}
            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Elige tu plan</h2>
                {termsError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {termsError}
                  </div>
                )}
                {formData.accountType === 'dealer' && (
                  <p className="text-sm text-gray-600 mb-6 max-w-2xl mx-auto text-center leading-relaxed">
                    Los planes <strong>multi concesionario</strong> gestionan varios concesionarios bajo una cuenta; la
                    alta puede requerir una{' '}
                    <Link href={multiDealerRegisterHref} className="font-semibold text-blue-600 hover:underline">
                      solicitud dedicada
                    </Link>
                    .
                  </p>
                )}
                {loadingMemberships ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : memberships.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No hay planes disponibles en este momento.</p>
                    <p className="text-sm mt-2">Por favor, contacta al administrador.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-6">
                    {memberships.map((membership, index) => {
                      const isPopular = index === Math.floor(memberships.length / 2);
                      const { limits, features } = buildMembershipDisplayLines(
                        membership.features as Record<string, unknown>,
                        { planKind: formData.accountType }
                      );

                      return (
                        <button
                          key={membership.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, membershipId: membership.id })}
                          className={`p-6 rounded-xl border-2 transition-all text-left ${
                            formData.membershipId === membership.id
                              ? 'border-blue-600 bg-blue-50 shadow-lg'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${isPopular ? 'scale-105 ring-2 ring-blue-300' : ''}`}
                        >
                          {isPopular && (
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold inline-block mb-3">
                              ⭐ MÁS POPULAR
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold">{membership.name}</h3>
                            {isMultiDealerPlan(membership.features) && (
                              <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                                Multi dealer
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-4 capitalize">{membership.type === 'dealer' ? 'Para Concesionarios' : 'Para Vendedores'}</p>
                          
                          <div className="text-3xl font-bold mb-4">
                            ${membership.price}
                            <span className="text-sm text-gray-600 font-normal">
                              /{membership.billingCycle === 'monthly' ? 'mes' : 'año'}
                            </span>
                          </div>

                          {/* Límites */}
                          {limits.length > 0 && (
                            <div className="mb-4 pb-4 border-b border-gray-200">
                              <p className="text-xs font-semibold text-gray-700 mb-2">📊 Límites:</p>
                              <ul className="space-y-1">
                                {limits.map((limit, i) => (
                                  <li key={i} className="text-xs text-gray-600">{limit}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Features básicas */}
                          {features.length > 0 && (
                            <div className="mb-4 pb-4 border-b border-gray-200">
                              <p className="text-xs font-semibold text-gray-700 mb-2">✅ Incluye:</p>
                              <ul className="space-y-1">
                                {features.map((feature, i) => (
                                  <li key={i} className="text-xs text-gray-600 flex items-center gap-1">
                                    <span className="text-green-500">✓</span> {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Mensaje sobre límites ilimitados */}
                          {limits.some(l => l.includes('Ilimitado') || l.includes('Ilimitada')) && (
                            <div className="mt-3 p-2 bg-gradient-to-r from-green-50 to-blue-50 rounded border border-green-200">
                              <p className="text-xs font-semibold text-green-700 text-center">
                                🎉 Límites Ilimitados
                              </p>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {step === 4 && memberships.length > 0 && (
                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <input
                      id="registro-terms"
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <label htmlFor="registro-terms" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
                      Acepto los{' '}
                      <Link href="/terminos" className="font-semibold text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                        Términos y Condiciones
                      </Link>{' '}
                      y la{' '}
                      <Link href="/privacidad" className="font-semibold text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                        Política de Privacidad
                      </Link>{' '}
                      de la plataforma AutoDealers.
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium"
                >
                  ← Atrás
                </button>
              )}
              <div className="flex-1"></div>
              <button
                type="submit"
                disabled={loading || (step === 4 && !formData.membershipId)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
              >
                {loading ? 'Procesando...' : step < 4 ? 'Siguiente →' : 'Continuar al Pago 💳'}
              </button>
            </div>
          </form>

          {/* Formulario de Pago Integrado */}
          {showPayment && selectedMembership && (
            <div className="mt-8 bg-white rounded-xl shadow-xl p-8 border-2 border-blue-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Completa tu Pago</h2>
                  <p className="text-gray-600 mt-1">
                    Plan seleccionado: <span className="font-semibold">{selectedMembership.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowPayment(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <StripePaymentForm
                amount={selectedMembership.price}
                currency={selectedMembership.currency || 'usd'}
                description={`Suscripción ${selectedMembership.name} - ${selectedMembership.billingCycle === 'monthly' ? 'Mensual' : 'Anual'}`}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                metadata={{
                  membershipId: selectedMembership.id,
                  accountType: formData.accountType,
                  email: formData.email,
                }}
                subscriptionPriceId={selectedMembership.stripePriceId || undefined}
              />
            </div>
          )}

          {/* Login Link */}
          {!showPayment && (
            <div className="mt-6 text-center text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Inicia sesión aquí
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <RegistroPageContent />
    </Suspense>
  );
}
