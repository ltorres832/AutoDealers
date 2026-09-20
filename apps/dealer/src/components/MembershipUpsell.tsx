'use client';

import Link from 'next/link';

/**
 * Pantalla de conversión cuando un módulo no está en el plan (o aún no está disponible).
 */
export function MembershipUpsell({
  title,
  description,
  backHref = '/dashboard',
  backLabel = 'Volver al panel',
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center p-6 text-center">
      <div className="w-full rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
          💎
        </div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          {description ||
            'Este módulo forma parte de un plan superior. Activa o mejora tu membresía para usarlo en tu concesionario.'}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/settings/membership"
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            Ver planes y activar
          </Link>
          <Link
            href={backHref}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
