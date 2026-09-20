'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GrantCourtesyDaysForm } from '@/components/GrantCourtesyDaysForm';

function CourtesyDaysInner() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId') || undefined;
  const tenantName = searchParams.get('name') || undefined;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Días de cortesía</h1>
        <p className="text-sm text-gray-600 mt-2">
          Otorga días gratis a un dealer o un vendedor. El acceso se extiende ahora (Firestore) y,
          si tienen Stripe, también se mueve la fecha de cobro o de prueba.
        </p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <GrantCourtesyDaysForm initialTenantId={tenantId} initialTenantName={tenantName} />
      </div>
      <p className="text-sm text-gray-500 mt-4">
        También está en <Link href="/admin/tenants" className="text-primary-600 hover:underline">Tenants</Link>
        {' → '}detalle del tenant, y en las listas de Dealers, Vendedores y Usuarios.
      </p>
    </div>
  );
}

export default function CourtesyDaysPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando…</div>}>
      <CourtesyDaysInner />
    </Suspense>
  );
}
