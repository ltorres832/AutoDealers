'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { loadStripe, StripeElementsOptions, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

interface StripePaymentFormProps {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  metadata?: Record<string, string>;
  customerId?: string;
  subscriptionPriceId?: string; // Para suscripciones
  clientSecret?: string; // Si ya tienes un Payment Intent creado
  /** Si no hay NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, se obtiene desde esta API (ej. Firestore). */
  publishableKeyUrl?: string;
  publishableKey?: string;
}

function PaymentForm({
  amount,
  currency = 'usd',
  description,
  onSuccess,
  onError,
  metadata,
  customerId,
  subscriptionPriceId,
  clientSecret: providedClientSecret,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let clientSecret: string;
      let paymentIntentId: string | undefined;
      let subscriptionId: string | undefined;

      // Si ya se proporcionó un clientSecret, usarlo directamente
      if (providedClientSecret) {
        clientSecret = providedClientSecret;
      } else {
        // Crear Payment Intent o Setup Intent desde el backend
        const endpoint = subscriptionPriceId
          ? '/api/payments/create-subscription'
          : '/api/payments/create-intent';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(amount * 100), // Convertir a centavos
            currency,
            description,
            metadata,
            customerId,
            priceId: subscriptionPriceId,
          }),
        });

        const data = await response.json() as {
          error?: string;
          clientSecret?: string;
          paymentIntentId?: string;
          subscriptionId?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || 'Error al crear el intent de pago');
        }

        if (!data.clientSecret) {
          throw new Error('No se recibió clientSecret del servidor');
        }

        clientSecret = data.clientSecret;
        paymentIntentId = data.paymentIntentId;
        subscriptionId = data.subscriptionId;
      }

      // Confirmar el pago con Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Elemento de tarjeta no encontrado');
      }

      if (subscriptionPriceId && subscriptionId) {
        // Para suscripciones, confirmar el Payment Intent del invoice
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                // Puedes agregar detalles de facturación aquí si los tienes
              },
            },
          }
        );

        if (confirmError) {
          throw new Error(confirmError.message || 'Error al confirmar el pago');
        }

        if (paymentIntent?.status === 'succeeded') {
          // Para suscripciones, pasar el subscriptionId
          onSuccess(subscriptionId || paymentIntent.id);
        } else {
          throw new Error('El pago no se completó correctamente');
        }
      } else {
        // Para pagos únicos
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                // Puedes agregar detalles de facturación aquí si los tienes
              },
            },
          }
        );

        if (confirmError) {
          throw new Error(confirmError.message || 'Error al confirmar el pago');
        }

        if (paymentIntent?.status === 'succeeded') {
          onSuccess(paymentIntent.id);
        } else {
          throw new Error('El pago no se completó correctamente');
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error al procesar el pago';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Información de Tarjeta
        </label>
        <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
          <CardElement options={cardElementOptions} />
        </div>
        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded">
            {error}
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Total a pagar:</span>
          <span className="text-2xl font-bold text-gray-900">
            ${amount.toFixed(2)} {currency.toUpperCase()}
          </span>
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Procesando...' : `Pagar $${amount.toFixed(2)}`}
      </button>

      <p className="text-xs text-gray-500 text-center">
        🔒 Tus datos están protegidos y encriptados. No almacenamos información de tu tarjeta.
      </p>
    </form>
  );
}

export function StripePaymentForm({
  publishableKeyUrl,
  publishableKey: publishableKeyProp,
  ...props
}: StripePaymentFormProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initStripe() {
      const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
      const directKey = publishableKeyProp?.trim();

      if (directKey) {
        if (!cancelled) setStripePromise(loadStripe(directKey));
        if (!cancelled) setLoadingKey(false);
        return;
      }

      if (envKey) {
        if (!cancelled) setStripePromise(loadStripe(envKey));
        if (!cancelled) setLoadingKey(false);
        return;
      }

      if (publishableKeyUrl) {
        try {
          const res = await fetch(publishableKeyUrl, { credentials: 'include' });
          const data = (await res.json()) as { publishableKey?: string; error?: string };
          if (!res.ok || !data.publishableKey) {
            if (!cancelled) {
              setConfigError(
                data.error ||
                  'Stripe no está configurado. Configura las claves en Admin → Configuración → General → Stripe.'
              );
            }
          } else if (!cancelled) {
            setStripePromise(loadStripe(data.publishableKey));
          }
        } catch {
          if (!cancelled) {
            setConfigError('No se pudo conectar con el servidor de pagos.');
          }
        }
        if (!cancelled) setLoadingKey(false);
        return;
      }

      if (!cancelled) {
        setConfigError(
          'Stripe no está configurado. Añade la clave en Admin → Stripe o define NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.'
        );
        setLoadingKey(false);
      }
    }

    initStripe();
    return () => {
      cancelled = true;
    };
  }, [publishableKeyUrl, publishableKeyProp]);

  const options: StripeElementsOptions = {
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#E10600',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#dc2626',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  if (loadingKey) {
    return (
      <div className="text-center py-8 text-gray-600 text-sm">Cargando pasarela de pago…</div>
    );
  }

  if (configError || !stripePromise) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">⚠️ {configError}</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm {...props} />
    </Elements>
  );
}

