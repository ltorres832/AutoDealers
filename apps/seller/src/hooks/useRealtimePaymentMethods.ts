'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

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

export function useRealtimePaymentMethods(tenantId?: string) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    async function fetchPaymentMethods() {
      try {
        // Obtener suscripción para obtener stripeCustomerId
        const subscriptionsQuery = query(
          collection(db, 'subscriptions'),
          where('tenantId', '==', tenantId)
        );

        const unsubscribe = onSnapshot(
          subscriptionsQuery,
          async (snapshot: any) => {
            if (snapshot.empty) {
              setPaymentMethods([]);
              setLoading(false);
              return;
            }

            const subscriptionDoc = snapshot.docs[0];
            const subscriptionData = subscriptionDoc.data();
            const stripeCustomerId = subscriptionData.stripeCustomerId;

            if (!stripeCustomerId) {
              setPaymentMethods([]);
              setLoading(false);
              return;
            }

            // Obtener métodos de pago desde la API (ya que Stripe no está en Firestore)
            try {
              const response = await fetch('/api/settings/membership/payment/methods');
              if (response.ok) {
                const data = await response.json();
                setPaymentMethods(data.paymentMethods || []);
              } else {
                setPaymentMethods([]);
              }
            } catch (err: any) {
              console.error('Error fetching payment methods:', err);
              setError(err.message);
              setPaymentMethods([]);
            }

            setLoading(false);
          },
          (err) => {
            console.error('Error en listener de suscripción:', err);
            setError(err.message);
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (err: any) {
        console.error('Error setting up payment methods listener:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    const cleanup = fetchPaymentMethods();
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        (cleanup as any)();
      }
    };
  }, [tenantId]);

  return { paymentMethods, loading, error };
}

