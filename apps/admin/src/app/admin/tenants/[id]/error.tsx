'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';

export default function TenantDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton label="Volver" />
      </div>
      <div className="bg-white rounded-lg shadow p-6 max-w-lg">
        <h1 className="text-2xl font-bold text-red-600 mb-2">No se pudo cargar el tenant</h1>
        <p className="text-gray-600 mb-4">
          Ocurrió un error al mostrar esta página. Puedes reintentar o volver al listado.
        </p>
        {error?.message ? (
          <p className="text-xs text-gray-500 font-mono mb-4 break-all">{error.message}</p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Reintentar
          </button>
          <Link
            href="/admin/tenants"
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Ir a tenants
          </Link>
        </div>
      </div>
    </div>
  );
}
