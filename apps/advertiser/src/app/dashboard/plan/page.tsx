'use client';

import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';

export default function PlanPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-6">
          <h1 className="mb-2 text-2xl font-bold text-primary-900">Pago por anuncio</h1>
          <p className="mb-4 text-primary-800">
            Ya no necesitas una suscripción mensual. Cada campaña se cobra por separado según la
            ubicación y la duración que elijas al crear el anuncio.
          </p>
          <Link
            href="/dashboard/ads/create"
            className="inline-block rounded-lg bg-primary-600 px-6 py-2 font-semibold text-white hover:bg-primary-700"
          >
            Crear anuncio
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
