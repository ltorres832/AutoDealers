'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DEALER_ACTIVE_TENANT_KEY } from '@/lib/dealer-tenant-storage';

/**
 * Establece el tenant activo en sessionStorage y envía el header X-Dealer-Tenant-Id en siguientes requests.
 */
export default function DealerTenantContextPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = typeof params?.tenantId === 'string' ? params.tenantId : '';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setError('ID de concesionario no válido');
      return;
    }
    try {
      sessionStorage.setItem(DEALER_ACTIVE_TENANT_KEY, tenantId);
    } catch {
      setError('No se pudo guardar la sede activa. Prueba en otro navegador o desactiva modo privado.');
      return;
    }
    router.replace('/dashboard');
  }, [tenantId, router]);

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
        <p className="mt-4 text-gray-600">Cambiando a la sede seleccionada…</p>
      </div>
    </div>
  );
}
