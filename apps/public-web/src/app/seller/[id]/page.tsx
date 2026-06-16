'use client';

import { useParams } from 'next/navigation';
import SellerPublicCatalogPage from '@/components/SellerPublicCatalogPage';

export default function SellerPublicPage() {
  const params = useParams();
  const sellerId = typeof params.id === 'string' ? params.id : '';
  if (!sellerId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Vendedor no encontrado
      </div>
    );
  }
  // Web personal del vendedor: sin Volver / Ir al inicio (no hay marketplace “atrás”)
  return <SellerPublicCatalogPage sellerId={sellerId} standaloneSellerSite />;
}
