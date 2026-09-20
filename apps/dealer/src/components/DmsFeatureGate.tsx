'use client';

import { useEffect, useState } from 'react';
import { MembershipUpsell } from '@/components/MembershipUpsell';

const TITLES: Record<string, string> = {
  dms_service: 'Taller / Servicio',
  dms_parts: 'Piezas e inventario de partes',
  dms_finance: 'Finanzas del dealer',
  dms_hr: 'Recursos humanos',
};

/**
 * Si el plan apaga explícitamente el módulo DMS, muestra CTA a membresía (nunca página vacía/error).
 */
export function DmsFeatureGate({
  featureKey,
  children,
}: {
  featureKey: 'dms_service' | 'dms_parts' | 'dms_finance' | 'dms_hr';
  children: React.ReactNode;
}) {
  const [state, setState] = useState<'loading' | 'on' | 'off'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/feature-flags/check?dashboard=dealer&featureKey=${encodeURIComponent(featureKey)}`,
          { credentials: 'include' }
        );
        if (cancelled) return;
        if (response.ok) {
          const data = await response.json();
          setState(data.enabled === true ? 'on' : 'off');
        } else {
          // Ante error de red/API, no bloquear el módulo (mejor mostrar que esconder).
          setState('on');
        }
      } catch {
        if (!cancelled) setState('on');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [featureKey]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-gray-500">
        Cargando…
      </div>
    );
  }

  if (state === 'off') {
    return (
      <MembershipUpsell
        title={TITLES[featureKey] || 'Módulo no disponible'}
        description="Este módulo está en planes superiores. Activa o mejora tu membresía para usarlo en tu concesionario."
      />
    );
  }

  return <>{children}</>;
}
