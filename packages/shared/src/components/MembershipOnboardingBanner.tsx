'use client';

export function MembershipOnboardingBanner({
  accountLabel = 'cuenta',
  createdByAdmin = false,
}: {
  accountLabel?: 'cuenta' | 'concesionario';
  createdByAdmin?: boolean;
}) {
  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-5">
      <h2 className="text-lg font-semibold text-amber-900 mb-2">
        Activa tu {accountLabel}
      </h2>
      <p className="text-amber-800 text-sm mb-1">
        {accountLabel === 'cuenta' && createdByAdmin
          ? 'Tu cuenta fue creada por el administrador y aún no tiene una membresía activa. Elige un plan abajo y completa el pago para desbloquear todas las funciones.'
          : `Tu ${accountLabel} fue creada pero aún no tiene una membresía pagada. Elige un plan abajo y completa el pago para desbloquear todas las funciones.`}
      </p>
      <p className="text-amber-700 text-xs">
        Hasta entonces el acceso a la plataforma permanece limitado.
      </p>
    </div>
  );
}
