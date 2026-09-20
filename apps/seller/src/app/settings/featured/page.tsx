'use client';

import { useState } from 'react';
import Link from 'next/link';
import FeaturedPurchaseModal from '@/components/FeaturedPurchaseModal';

export default function SellerFeaturedSettingsPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Destacar mi cuenta</h1>
        <p className="mt-2 text-gray-600">
          Compra un destacado o boost 24 horas para que tu perfil aparezca con prioridad en la página pública.
        </p>
      </div>
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Perfil de vendedor</h2>
        <p className="mt-1 text-sm text-gray-600">
          Se activa automáticamente después del pago y se desactiva solo al vencer.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mt-4 rounded-lg bg-amber-500 px-5 py-2 font-semibold text-white hover:bg-amber-600"
        >
          ⭐ Destacar / Boost mi perfil
        </button>
      </div>
      <Link href="/settings" className="text-primary-600 hover:underline">Volver a configuración</Link>
      {open ? (
        <FeaturedPurchaseModal
          targetType="seller"
          targetId="me"
          title="Perfil de vendedor"
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
