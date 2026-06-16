import React, { Suspense } from 'react';

/** useSearchParams() en la página hija requiere Suspense; sin esto → 500 "Internal Server Error" en producción. */
export const dynamic = 'force-dynamic';

export default function VehicleDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-gray-600 animate-pulse">Cargando vehículo…</div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
