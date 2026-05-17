'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-lg font-semibold text-gray-900 mb-2">Algo salió mal</p>
      <p className="text-sm text-gray-600 mb-6 max-w-md">
        No se pudo cargar esta página. Intenta de nuevo o vuelve al inicio.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          Reintentar
        </button>
        <button
          type="button"
          onClick={() => (window.location.href = '/dashboard')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Ir al inicio
        </button>
      </div>
    </div>
  );
}
