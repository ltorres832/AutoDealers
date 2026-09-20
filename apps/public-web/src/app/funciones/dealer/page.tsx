'use client';

import PortalFeaturesDeck from '@/components/PortalFeaturesDeck';
import { DEALER_FEATURE_GROUPS } from '@/lib/portal-feature-catalog';

export default function FuncionesDealerPage() {
  return (
    <PortalFeaturesDeck
      audienceLabel="Funciones del panel Dealer"
      audienceSubtitle="Módulos reales del panel del concesionario en AutoDealersOnline"
      groups={DEALER_FEATURE_GROUPS}
      csvFilename="autodealersonline-funciones-dealer.csv"
      otherHref="/funciones/vendedor"
      otherLabel="Ver lista Vendedor"
    />
  );
}
