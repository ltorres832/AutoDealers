'use client';

import { useEffect } from 'react';

export default function CatalogInterestError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[catalog-interest]', error);
  }, [error]);

  const detail = error?.message || 'Error desconocido';

  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <p className="text-lg font-semibold text-gray-900 mb-2">No se pudo mostrar el interés del catálogo</p>
      <p className="text-sm text-red-700 mb-2 max-w-lg mx-auto break-words">{detail}</p>
      {error?.digest ? (
        <p className="text-xs text-gray-500 mb-6 font-mono">Ref: {error.digest}</p>
      ) : (
        <p className="mb-6" />
      )}
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          Reintentar
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/dashboard';
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Ir al inicio
        </button>
      </div>
    </div>
  );
}
