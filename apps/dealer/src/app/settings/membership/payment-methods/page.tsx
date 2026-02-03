'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useRealtimePaymentMethods } from '@/hooks/useRealtimePaymentMethods';

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

// Componente para agregar nuevo método de pago
function AddPaymentMethodForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
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
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Error al procesar el método de pago');
        setLoading(false);
        return;
      }

      // Confirmar el SetupIntent (ya tenemos el clientSecret)
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        clientSecret,
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Error al confirmar el método de pago');
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al agregar método de pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Guardando...' : 'Agregar Método de Pago'}
      </button>
    </form>
  );
}

export default function PaymentMethodsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Hooks de tiempo real
  const { paymentMethods: realtimePaymentMethods, loading: methodsLoading } = useRealtimePaymentMethods(tenantId);

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

  // Inicializar Stripe y crear SetupIntent cuando se muestra el formulario
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

  // Sincronizar métodos de pago
  useEffect(() => {
    setPaymentMethods(realtimePaymentMethods);
    setLoading(methodsLoading);
  }, [realtimePaymentMethods, methodsLoading]);

  // Obtener clientSecret cuando se muestra el formulario de añadir
  useEffect(() => {
    async function fetchSetupIntentClientSecret() {
      if (showAddForm && tenantId && !clientSecret) {
        try {
          const response = await fetch('/api/settings/membership/payment/setup-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (response.ok) {
            const data = await response.json();
            setClientSecret(data.clientSecret);
          } else {
            const errorData = await response.json();
            console.error('Error fetching setup intent client secret:', errorData.error);
            alert(`Error: ${errorData.error || 'No se pudo inicializar el formulario de pago'}`);
            setShowAddForm(false);
          }
        } catch (error) {
          console.error('Error fetching setup intent client secret:', error);
          alert('Error al inicializar el formulario de pago');
          setShowAddForm(false);
        }
      } else if (!showAddForm && clientSecret) {
        // Resetear clientSecret cuando se oculta el formulario
        setClientSecret(null);
      }
    }
    fetchSetupIntentClientSecret();
  }, [showAddForm, tenantId]); // Removido clientSecret de las dependencias para evitar loops

  const handleDelete = async (paymentMethodId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este método de pago?')) {
      return;
    }

    setDeletingId(paymentMethodId);
    try {
      const response = await fetch(
        `/api/settings/membership/payment/methods?id=${paymentMethodId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        // Los hooks de tiempo real actualizarán automáticamente
        alert('Método de pago eliminado exitosamente');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar método de pago');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error al eliminar método de pago');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    setClientSecret(null); // Resetear para crear uno nuevo la próxima vez
    // Los hooks de tiempo real actualizarán automáticamente
    alert('Método de pago agregado exitosamente');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-primary-600 hover:text-primary-700 mb-4"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Métodos de Pago
        </h1>
        <p className="text-gray-600">
          Gestiona tus métodos de pago para tus suscripciones
        </p>
      </div>

      {/* Métodos de pago existentes */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Métodos de Pago Guardados</h2>
        
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No tienes métodos de pago guardados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-4">
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
                <button
                  onClick={() => handleDelete(method.id)}
                  disabled={deletingId === method.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === method.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agregar nuevo método de pago */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Agregar Método de Pago</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            {showAddForm ? 'Cancelar' : '+ Agregar Nuevo'}
          </button>
        </div>

        {showAddForm && (
          <div>
            {!clientSecret ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <span className="ml-3 text-gray-600">Inicializando formulario de pago...</span>
              </div>
            ) : stripePromise ? (
              <Elements stripe={stripePromise} options={{ 
                appearance: { theme: 'stripe' },
                clientSecret: clientSecret,
              }}>
                <AddPaymentMethodForm clientSecret={clientSecret} onSuccess={handleAddSuccess} />
              </Elements>
            ) : (
              <div className="text-center py-4 text-gray-600">
                Cargando Stripe...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

