'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

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
      (err: any) => {
        console.error('Error en listener de suscripción:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tenantId]);

  return { paymentMethods, loading, error };
}

