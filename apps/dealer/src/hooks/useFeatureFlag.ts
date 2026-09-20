'use client';

import { useState, useEffect } from 'react';
import type { DashboardType } from '@autodealers/core/feature-flags';
import { useMembershipPlanRevision } from '@/hooks/useMembershipPlanRevision';

/** INV360 / inventario competitivo: opt-out — visibles salvo false explícito. */
const INV360_OPT_OUT_KEYS = new Set([
  'vin_camera_scan',
  'share_landing',
  'photo_guide',
  'bg_remover',
  'dynamic_scenes',
  'dealer_site_builder',
  'daco_labels',
  'inventory_alliances',
  'inventory_feed_sync',
]);

function defaultEnabled(featureKey: string): boolean {
  return INV360_OPT_OUT_KEYS.has(featureKey);
}

export function useFeatureFlag(featureKey: string, dashboard: DashboardType = 'dealer'): boolean {
  const planRevision = useMembershipPlanRevision();
  const [enabled, setEnabled] = useState(() => defaultEnabled(featureKey));

  useEffect(() => {
    let cancelled = false;

    async function checkFeature() {
      try {
        const response = await fetch(
          `/api/feature-flags/check?dashboard=${dashboard}&featureKey=${encodeURIComponent(featureKey)}`,
          { credentials: 'include' }
        );
        if (cancelled) return;
        if (response.ok) {
          const data = await response.json();
          setEnabled(data.enabled === true);
        } else if (!defaultEnabled(featureKey)) {
          setEnabled(false);
        }
      } catch (error) {
        console.error('Error checking feature flag:', error);
        if (!cancelled && !defaultEnabled(featureKey)) {
          setEnabled(false);
        }
      }
    }

    void checkFeature();
    return () => {
      cancelled = true;
    };
  }, [featureKey, dashboard, planRevision]);

  return enabled;
}
