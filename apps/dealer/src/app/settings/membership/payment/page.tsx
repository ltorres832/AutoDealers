'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Componente interno para el formulario de pago
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

      // Confirmar el SetupIntent (ya tenemos el clientSecret)
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
        body: JSON.stringify({
          membershipId,
          paymentMethodId: setupIntent.payment_method,
        }),
      });

      if (!subscribeResponse.ok) {
        const errorData = await subscribeResponse.json();
        throw new Error(errorData.error || 'Error al crear la suscripción');
      }

      // Éxito
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
  const [user, setUser] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [membership, setMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

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

  // Obtener información de la membresía y crear SetupIntent
  useEffect(() => {
    if (!membershipId) {
      router.push('/settings/membership');
      return;
    }

    async function fetchMembershipAndSetupIntent() {
      try {
        setLoading(true);
        
        // Obtener membresía
        const membershipResponse = await fetch(`/api/settings/membership/available`);
        if (!membershipResponse.ok) {
          const errorData = await membershipResponse.json().catch(() => ({}));
          console.error('Error obteniendo membresías:', errorData);
          alert('Error al obtener membresías disponibles. Por favor, intenta de nuevo.');
          router.push('/settings/membership');
          return;
        }
        
        const membershipData = await membershipResponse.json();
        const foundMembership = membershipData.memberships?.find(
          (m: any) => m.id === membershipId
        );
        
        if (!foundMembership) {
          console.error('Membresía no encontrada:', membershipId);
          alert('La membresía seleccionada no está disponible.');
          router.push('/settings/membership');
          return;
        }
        
        setMembership(foundMembership);
        
        // Crear SetupIntent para el PaymentElement
        const setupResponse = await fetch('/api/settings/membership/payment/setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!setupResponse.ok) {
          const errorData = await setupResponse.json().catch(() => ({}));
          console.error('Error creando SetupIntent:', errorData);
          alert('Error al configurar el método de pago. Por favor, intenta de nuevo.');
          setLoading(false);
          return;
        }
        
        const setupData = await setupResponse.json();
        if (!setupData.clientSecret) {
          console.error('No se recibió clientSecret');
          alert('Error al configurar el método de pago. Por favor, intenta de nuevo.');
          setLoading(false);
          return;
        }
        
        setClientSecret(setupData.clientSecret);
        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo membresía:', error);
        alert('Error al cargar la información. Por favor, intenta de nuevo.');
        router.push('/settings/membership');
      }
    }

    fetchMembershipAndSetupIntent();
  }, [membershipId, router]);

  const handleSuccess = () => {
    router.push('/settings/membership?success=true');
  };

  if (loading || !stripePromise || !clientSecret) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600">
          {loading && !stripePromise && 'Inicializando formulario de pago...'}
          {stripePromise && !clientSecret && 'Configurando método de pago...'}
          {!loading && stripePromise && clientSecret && 'Cargando...'}
        </p>
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
        <Elements stripe={stripePromise} options={{ 
          appearance: { theme: 'stripe' },
          clientSecret: clientSecret,
        }}>
          <CheckoutForm membershipId={membershipId} clientSecret={clientSecret} onSuccess={handleSuccess} />
        </Elements>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600">Cargando...</p>
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}

