'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  isDefault: boolean;
}

// Componente interno para el formulario de pago con método guardado seleccionado
function CheckoutFormWithSavedMethod({ 
  membershipId, 
  paymentMethodId, 
  onSuccess 
}: { 
  membershipId: string; 
  paymentMethodId: string;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Crear suscripción directamente con el método de pago guardado
      const subscribeResponse = await fetch('/api/settings/membership/payment/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          membershipId,
          paymentMethodId,
        }),
      });

      if (!subscribeResponse.ok) {
        const errorData = await subscribeResponse.json();
        throw new Error(errorData.error || 'Error al crear la suscripción');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Procesando...' : 'Confirmar y Suscribirse'}
      </button>
    </form>
  );
}

// Componente interno para el formulario de pago con Payment Element
function CheckoutForm({ membershipId, clientSecret, onSuccess }: { membershipId: string; clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Confirmar el método de pago
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Error al procesar el método de pago');
        setLoading(false);
        return;
      }

      // Confirmar el SetupIntent
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Error al confirmar el método de pago');
        setLoading(false);
        return;
      }

      if (!setupIntent?.payment_method) {
        setError('No se pudo obtener el método de pago');
        setLoading(false);
        return;
      }

      // Crear suscripción con el método de pago
      const subscribeResponse = await fetch('/api/settings/membership/payment/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          membershipId,
          paymentMethodId: setupIntent.payment_method,
        }),
      });

      if (!subscribeResponse.ok) {
        const errorData = await subscribeResponse.json();
        throw new Error(errorData.error || 'Error al crear la suscripción');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Procesando...' : 'Confirmar y Suscribirse'}
      </button>
    </form>
  );
}

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const membershipId = searchParams.get('membershipId') || '';
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [membership, setMembership] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showNewPaymentForm, setShowNewPaymentForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMethods, setLoadingMethods] = useState(true);

  // Obtener tenantId del usuario
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setTenantId(data.user?.tenantId);
        }
      } catch (error) {
        console.error('Error obteniendo usuario:', error);
      }
    }
    fetchUser();
  }, []);

  // Inicializar Stripe
  useEffect(() => {
    async function initStripe() {
      try {
        const response = await fetch('/api/settings/membership/payment/publishable-key');
        if (response.ok) {
          const data = await response.json();
          if (data.publishableKey) {
            setStripePromise(loadStripe(data.publishableKey));
          }
        }
      } catch (error) {
        console.error('Error inicializando Stripe:', error);
      }
    }
    initStripe();
  }, []);

  // Obtener métodos de pago guardados
  useEffect(() => {
    async function fetchPaymentMethods() {
      try {
        const response = await fetch('/api/settings/membership/payment/methods', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setPaymentMethods(data.paymentMethods || []);
          // Seleccionar el método por defecto si existe
          const defaultMethod = data.paymentMethods?.find((pm: PaymentMethod) => pm.isDefault);
          if (defaultMethod) {
            setSelectedPaymentMethod(defaultMethod.id);
          } else if (data.paymentMethods?.length > 0) {
            setSelectedPaymentMethod(data.paymentMethods[0].id);
          }
        }
      } catch (error) {
        console.error('Error obteniendo métodos de pago:', error);
      } finally {
        setLoadingMethods(false);
      }
    }
    fetchPaymentMethods();
  }, []);

  // Obtener información de la membresía y crear SetupIntent
  useEffect(() => {
    if (!membershipId) {
      router.push('/settings/membership');
      return;
    }

    async function fetchMembershipAndSetupIntent() {
      try {
        // Obtener membresía
        const membershipResponse = await fetch(`/api/settings/membership/available`, {
          credentials: 'include',
        });
        if (membershipResponse.ok) {
          const membershipData = await membershipResponse.json();
          const foundMembership = membershipData.memberships?.find(
            (m: any) => m.id === membershipId
          );
          if (foundMembership) {
            setMembership(foundMembership);
            
            // Crear SetupIntent para el PaymentElement (solo si se necesita)
            const setupResponse = await fetch('/api/settings/membership/payment/setup-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });
            
            if (setupResponse.ok) {
              const setupData = await setupResponse.json();
              setClientSecret(setupData.clientSecret);
              setCustomerId(setupData.customerId || null);
            } else {
              console.error('Error creando SetupIntent');
            }
          } else {
            router.push('/settings/membership');
          }
        }
      } catch (error) {
        console.error('Error obteniendo membresía:', error);
        router.push('/settings/membership');
      } finally {
        setLoading(false);
      }
    }

    fetchMembershipAndSetupIntent();
  }, [membershipId, router]);

  const handleSuccess = () => {
    router.push('/settings/membership?success=true');
  };

  const getCardBrandIcon = (brand: string) => {
    const icons: Record<string, string> = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      jcb: '💳',
      diners: '💳',
    };
    return icons[brand.toLowerCase()] || '💳';
  };

  if (loading || !stripePromise) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!membership) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Completar Pago
        </h1>
        <p className="text-gray-600">
          Completa tu suscripción a <strong>{membership.name}</strong>
        </p>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-semibold">{membership.name}</h3>
            <p className="text-gray-600">
              {membership.billingCycle === 'monthly' ? 'Mensual' : 'Anual'}
            </p>
          </div>
          <div className="text-2xl font-bold text-primary-600">
            {membership.currency === 'USD' ? '$' : membership.currency}
            {membership.price.toLocaleString()}
            <span className="text-sm font-normal text-gray-600">
              /{membership.billingCycle === 'monthly' ? 'mes' : 'año'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Método de Pago</h2>
        
        {loadingMethods ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : paymentMethods.length > 0 && !showNewPaymentForm ? (
          <>
            {/* Mostrar métodos guardados */}
            <div className="space-y-3 mb-6">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    selectedPaymentMethod === method.id
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCardBrandIcon(method.card?.brand || '')}</span>
                      <div>
                        <div className="font-medium">
                          {method.card?.brand.toUpperCase() || 'Tarjeta'} •••• {method.card?.last4}
                        </div>
                        <div className="text-sm text-gray-600">
                          Expira {method.card?.expMonth}/{method.card?.expYear}
                        </div>
                      </div>
                      {method.isDefault && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          Por Defecto
                        </span>
                      )}
                    </div>
                    {selectedPaymentMethod === method.id && (
                      <span className="text-primary-600">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Botón para agregar nuevo método */}
            <button
              type="button"
              onClick={() => setShowNewPaymentForm(true)}
              className="w-full mb-6 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              + Agregar nuevo método de pago
            </button>

            {/* Formulario con método guardado seleccionado */}
            {selectedPaymentMethod && (
              <CheckoutFormWithSavedMethod
                membershipId={membershipId}
                paymentMethodId={selectedPaymentMethod}
                onSuccess={handleSuccess}
              />
            )}
          </>
        ) : (
          <>
            {/* Mostrar formulario para agregar nuevo método */}
            {!showNewPaymentForm && paymentMethods.length === 0 && (
              <p className="text-gray-600 mb-4">No tienes métodos de pago guardados. Agrega uno para continuar.</p>
            )}
            
            {showNewPaymentForm && (
              <button
                type="button"
                onClick={() => {
                  setShowNewPaymentForm(false);
                  if (paymentMethods.length > 0) {
                    setSelectedPaymentMethod(paymentMethods[0].id);
                  }
                }}
                className="mb-4 text-primary-600 hover:text-primary-700"
              >
                ← Volver a métodos guardados
              </button>
            )}

            {clientSecret && (
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  appearance: { theme: 'stripe' },
                  clientSecret: clientSecret,
                }}
              >
                <CheckoutForm membershipId={membershipId} clientSecret={clientSecret} onSuccess={handleSuccess} />
              </Elements>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}
