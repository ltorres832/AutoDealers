'use client';

import Link from 'next/link';

type BillingAccessBannerProps = {
  status: string;
  daysPastDue?: number;
  graceDays?: number;
  settingsHref: string;
  reason?: string;
};

/**
 * Banner cuando la suscripción está past_due o suspendida.
 */
export function BillingAccessBanner({
  status,
  daysPastDue = 0,
  graceDays = 3,
  settingsHref,
  reason,
}: BillingAccessBannerProps) {
  const isSuspended = status === 'suspended' || status === 'unpaid' || status === 'cancelled';
  const isPastDue = status === 'past_due';

  if (!isSuspended && !isPastDue) return null;

  const title = isSuspended
    ? 'Cuenta suspendida por falta de pago'
    : 'Pago pendiente';

  const message =
    reason ||
    (isSuspended
      ? 'Tu acceso está bloqueado hasta que se procese el pago de tu membresía.'
      : `Tienes un pago pendiente. Si no se regulariza en ${Math.max(0, graceDays - daysPastDue)} día(s), la cuenta se suspenderá automáticamente.`);

  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 ${
        isSuspended
          ? 'border-red-300 bg-red-50 text-red-900'
          : 'border-amber-300 bg-amber-50 text-amber-900'
      }`}
      role="alert"
    >
      <p className="font-semibold">{title}</p>
      <p className="text-sm mt-1">{message}</p>
      <Link
        href={settingsHref}
        className="inline-block mt-3 text-sm font-medium underline hover:no-underline"
      >
        Ir a Membresía y pagar →
      </Link>
    </div>
  );
}
