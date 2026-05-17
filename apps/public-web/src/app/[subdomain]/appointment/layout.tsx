import React, { Suspense } from 'react';

/** useSearchParams() en la página hija requiere Suspense; sin esto → 500 "Internal Server Error" en producción. */
export const dynamic = 'force-dynamic';

export default function AppointmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-600 animate-pulse">Cargando formulario…</div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
