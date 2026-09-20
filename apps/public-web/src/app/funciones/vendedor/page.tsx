'use client';

import PortalFeaturesDeck from '@/components/PortalFeaturesDeck';
import { SELLER_FEATURE_GROUPS } from '@/lib/portal-feature-catalog';

export default function FuncionesVendedorPage() {
  return (
    <PortalFeaturesDeck
      audienceLabel="Funciones del panel Vendedor"
      audienceSubtitle="Módulos reales del panel del vendedor en AutoDealersOnline"
      groups={SELLER_FEATURE_GROUPS}
      csvFilename="autodealersonline-funciones-vendedor.csv"
      otherHref="/funciones/dealer"
      otherLabel="Ver lista Dealer"
    />
  );
}
