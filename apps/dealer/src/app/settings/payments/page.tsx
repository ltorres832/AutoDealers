'use client';

import { PaymentHistoryPanel } from '@autodealers/billing/client';

export default function DealerPaymentsPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Historial de pagos</h1>
        <p className="text-gray-600">
          Membresía, promociones, banners premium y destacados en un solo lugar.
        </p>
      </div>
      <PaymentHistoryPanel showTitle={false} />
    </div>
  );
}
