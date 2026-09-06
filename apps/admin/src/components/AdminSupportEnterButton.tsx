'use client';

import { useState } from 'react';

interface AdminSupportEnterButtonProps {
  userId?: string;
  tenantId?: string;
  advertiserId?: string;
  label?: string;
  className?: string;
}

/**
 * Botón para que un admin (o empleado con acceso temporal) entre al panel
 * dealer / seller / business / advertiser como soporte.
 */
export function AdminSupportEnterButton({
  userId,
  tenantId,
  advertiserId,
  label = 'Entrar como soporte',
  className = '',
}: AdminSupportEnterButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startSupport() {
    if (!userId && !tenantId && !advertiserId) {
      setError('Falta userId, tenantId o advertiserId');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/support/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          tenantId,
          advertiserId,
          reason: 'Soporte desde admin',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo iniciar el modo soporte');
      }
      if (!data.redirectUrl) {
        throw new Error('Sin URL de redirección');
      }
      window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={startSupport}
        disabled={loading}
        className={
          className ||
          'px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm disabled:opacity-60'
        }
      >
        {loading ? 'Abriendo…' : `🛟 ${label}`}
      </button>
      {error ? <p className="text-xs text-red-600 max-w-xs">{error}</p> : null}
    </div>
  );
}
