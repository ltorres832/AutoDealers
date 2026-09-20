'use client';

import { useState } from 'react';

export function SupportModeBanner({
  targetName,
  targetEmail,
  adminEmail,
}: {
  targetName?: string;
  targetEmail?: string;
  adminEmail?: string;
}) {
  const [exiting, setExiting] = useState(false);

  async function exitSupport() {
    setExiting(true);
    try {
      await fetch('/api/auth/support-exit', { method: 'POST', credentials: 'include' });
    } catch {
      /* ignore */
    }
    window.location.href = '/login';
  }

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-2 z-50">
      <p className="font-medium">
        🛟 Modo soporte — actuando como{' '}
        <strong>{targetName || targetEmail || 'cuenta del cliente'}</strong>
        {adminEmail ? (
          <span className="font-normal opacity-80"> (admin: {adminEmail})</span>
        ) : null}
        . Sin restricciones de membresía.
      </p>
      <button
        type="button"
        onClick={exitSupport}
        disabled={exiting}
        className="shrink-0 px-3 py-1 bg-amber-950 text-amber-50 rounded font-medium hover:bg-black disabled:opacity-60"
      >
        {exiting ? 'Saliendo…' : 'Salir de soporte'}
      </button>
    </div>
  );
}
