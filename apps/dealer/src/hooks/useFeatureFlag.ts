'use client';

import { useState, useEffect } from 'react';
import { DashboardType } from '@autodealers/core';

export function useFeatureFlag(featureKey: string, dashboard: DashboardType = 'dealer'): boolean {
  const [enabled, setEnabled] = useState(true); // Por defecto habilitado

  useEffect(() => {
    async function checkFeature() {
      try {
        const response = await fetch(`/api/feature-flags/check?dashboard=${dashboard}&featureKey=${featureKey}`);
        if (response.ok) {
          const data = await response.json();
          setEnabled(data.enabled !== false);
        }
      } catch (error) {
        console.error('Error checking feature flag:', error);
        // En caso de error, mantener habilitado por defecto
      }
    }

    checkFeature();
  }, [featureKey, dashboard]);

  return enabled;
}


