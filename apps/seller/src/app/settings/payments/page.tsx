'use client';

import { PaymentHistoryPanel } from '@autodealers/billing/client';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export default function SellerPaymentsPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Historial de pagos</h1>
        <p className="text-gray-600">
          Consulta tus cobros de membresía, promociones, banners y destacados.
        </p>
      </div>
      <PaymentHistoryPanel
        showTitle={false}
        fetchFn={(url) => fetchWithAuth(url, {})}
      />
    </div>
  );
}
