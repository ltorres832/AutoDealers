'use client';

import { useState, useEffect } from 'react';
import { getFirebaseClient } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';

interface PlanConfig {
  priceId: string;
  amount: number;
  currency: string;
  name: string;
  features: string[];
}

interface PricingConfig {
  starter: PlanConfig;
  professional: PlanConfig;
  premium: PlanConfig;
  updatedAt: string;
  updatedBy: string;
}

export function useRealtimeAdvertiserPricing() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getFirebaseClient();
    if (!client) {
      fetchConfig();
      const interval = setInterval(fetchConfig, 5000);
      return () => clearInterval(interval);
    }

    const { db } = client;
    const docRef = doc(db, 'system', 'advertiser_pricing');

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: any) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setConfig({
            ...data,
            updatedAt: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
          });
        } else {
          // Configuración por defecto
          fetchConfig();
        }
        setLoading(false);
      },
      (error: any) => {
        console.error('Error en listener de pricing:', error);
        fetchConfig();
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function fetchConfig() {
    try {
      const response = await fetch('/api/admin/advertiser-pricing');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error fetching pricing config:', error);
    } finally {
      setLoading(false);
    }
  }

  return { config: config || getDefaultConfig(), loading };
}

function getDefaultConfig(): PricingConfig {
  return {
    starter: {
      priceId: '',
      amount: 9900,
      currency: 'usd',
      name: 'Starter',
      features: [
        '1 banner en sección patrocinadores',
        '10,000 impresiones/mes',
        'Dashboard básico',
        'Soporte por email',
        'Targeting básico',
      ],
    },
    professional: {
      priceId: '',
      amount: 29900,
      currency: 'usd',
      name: 'Professional',
      features: [
        '2 banners (patrocinadores + sidebar)',
        '50,000 impresiones/mes',
        'Dashboard avanzado',
        'Soporte prioritario',
        'Targeting avanzado',
        'Métricas en tiempo real',
      ],
    },
    premium: {
      priceId: '',
      amount: 59900,
      currency: 'usd',
      name: 'Premium',
      features: [
        'Banner en Hero (rotación)',
        'Impresiones ilimitadas',
        'Targeting avanzado',
        'A/B testing',
        'Account manager dedicado',
        'Métricas avanzadas',
        'Soporte 24/7',
      ],
    },
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  };
}

