'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type AccessState = {
  applicable: boolean;
  status: string;
  membershipId?: string;
  membershipName?: string;
  reason?: string;
  provisionedByAdmin?: boolean;
  adminMembershipRequired?: boolean;
};

type PlanOption = { id: string; name: string; price: number };

export function AdminMembershipAccessPanel({
  userId,
  role,
  dealerId,
  compact = false,
}: {
  userId: string;
  role: string;
  dealerId?: string;
  compact?: boolean;
}) {
  const [access, setAccess] = useState<AccessState | null>(null);
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);
  const [grantMembershipId, setGrantMembershipId] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const roleOk = role === 'seller' || role === 'dealer';
  const dealerManaged = role === 'seller' && Boolean(dealerId?.trim());

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}/membership-access`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setApiError(
          'La API de membresía no está en este servidor (falta deploy del admin). Despliega la app admin con los cambios recientes.'
        );
        setAccess(null);
        return;
      }
      if (!res.ok) {
        const detail =
          typeof data.details === 'string'
            ? data.details
            : typeof data.error === 'string'
              ? data.error
              : `Error ${res.status} al cargar estado`;
        setApiError(detail);
        setAccess({ applicable: false, status: 'not_applicable' });
        return;
      }
      if (data.access) {
        setAccess(data.access as AccessState);
        if (data.access.membershipId) {
          setGrantMembershipId((prev) => prev || data.access.membershipId);
        }
      } else {
        setAccess({ applicable: false, status: 'not_applicable' });
      }
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Error de red');
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!roleOk || dealerManaged) {
      setLoading(false);
      return;
    }
    void load();
  }, [load, roleOk, dealerManaged]);

  useEffect(() => {
    if (!access?.applicable) return;
    const type = role === 'dealer' ? 'dealer' : 'seller';
    void (async () => {
      try {
        const res = await fetchWithAuth(`/api/admin/memberships?type=${type}&activeOnly=true`);
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data.memberships) ? data.memberships : [];
        setPlanOptions(
          list.map((m: { id: string; name: string; price: number }) => ({
            id: m.id,
            name: m.name,
            price: m.price,
          }))
        );
        setGrantMembershipId((prev) => prev || list[0]?.id || '');
      } catch {
        setPlanOptions([]);
      }
    })();
  }, [access?.applicable, role]);

  async function runAction(action: 'grant' | 'require' | 'mark-provisioned') {
    if (action === 'require') {
      if (
        typeof window !== 'undefined' &&
        !window.confirm(
          '¿Exigir membresía pagada? Se revoca el acceso demo/sin facturación (no afecta suscripciones Stripe ya pagadas).'
        )
      ) {
        return;
      }
    } else if (action === 'grant' && !grantMembershipId) {
      setMessage({ type: 'err', text: 'Selecciona un plan' });
      return;
    }

    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}/membership-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'grant'
            ? { action: 'grant', membershipId: grantMembershipId }
            : action === 'mark-provisioned'
              ? { action: 'mark-provisioned' }
              : { action: 'require' }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail =
          typeof data.details === 'string'
            ? data.details
            : typeof data.error === 'string'
              ? data.error
              : 'No se pudo actualizar';
        setMessage({ type: 'err', text: detail });
        return;
      }
      if (data.access) setAccess(data.access);
      else await load();
      setMessage({
        type: 'ok',
        text:
          action === 'grant'
            ? 'Cuenta activada sin facturación (demo/cortesía).'
            : action === 'mark-provisioned'
              ? 'Cuenta marcada como provisionada por admin.'
              : 'Acceso demo revocado: el usuario deberá elegir y pagar un plan.',
      });
    } catch {
      setMessage({ type: 'err', text: 'Error de red' });
    } finally {
      setActionLoading(false);
    }
  }

  const shellClass = `rounded-lg border-2 border-primary-400 bg-primary-50 space-y-4 ${
    compact ? 'p-4' : 'p-5'
  }`;

  if (!roleOk) {
    return (
      <div className={shellClass} id="sin-facturacion">
        <h3 className="font-semibold text-primary-950">Cuenta sin facturación / Demo</h3>
        <p className="text-sm text-gray-700">Solo disponible para usuarios con rol seller o dealer.</p>
      </div>
    );
  }

  if (dealerManaged) {
    return (
      <div className={shellClass} id="sin-facturacion">
        <h3 className="font-semibold text-primary-950">Cuenta sin facturación / Demo</h3>
        <p className="text-sm text-gray-700">
          Este vendedor está bajo un concesionario; usa el plan del dealer, no membresía propia.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={shellClass} id="sin-facturacion">
        <h3 className="font-semibold text-primary-950">Cuenta sin facturación / Demo</h3>
        <p className="text-sm text-primary-800">Cargando…</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className={shellClass} id="sin-facturacion">
        <h3 className="font-semibold text-primary-950">Cuenta sin facturación / Demo</h3>
        <p className="text-sm text-red-700">{apiError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm text-primary-700 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!access?.applicable) {
    return (
      <div className={shellClass} id="sin-facturacion">
        <h3 className="font-semibold text-primary-950">Cuenta sin facturación / Demo</h3>
        <p className="text-sm text-gray-800">
          {access?.reason ||
            'Esta cuenta no admite control de membresía desde aquí (revisa tenantId y dealerId).'}
        </p>
        <p className="text-xs text-gray-600 font-mono">UID: {userId}</p>
      </div>
    );
  }

  const statusLabel =
    access.status === 'granted_by_admin'
      ? `Sin facturación activa${access.membershipName ? ` — ${access.membershipName}` : ''}`
      : access.status === 'paid_stripe'
        ? `Membresía pagada (Stripe)${access.membershipName ? ` — ${access.membershipName}` : ''}`
        : access.adminMembershipRequired
          ? 'Membresía pagada exigida (sin plan activo)'
          : 'Debe elegir y pagar membresía';

  return (
    <div id="sin-facturacion" className={shellClass}>
      <div>
        <h3 className="text-lg font-bold text-primary-950">Cuenta sin facturación / Demo</h3>
        <p className="text-sm text-primary-800 mt-1">
          Activa acceso completo <strong>sin cobro</strong>, o exige que el usuario elija plan y pague.
        </p>
        <p className="text-xs text-primary-700 mt-1 font-mono">Usuario: {userId}</p>
      </div>

      {message ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            message.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <p className="text-sm text-primary-900">
        Estado: <strong>{statusLabel}</strong>
        {access.provisionedByAdmin === false ? (
          <span className="block text-xs text-amber-800 mt-1">
            (Cuenta antigua sin marca admin — puedes marcarla abajo)
          </span>
        ) : null}
      </p>

      {access.status !== 'paid_stripe' ? (
        <>
          <div>
            <label className="block text-sm font-medium mb-2 text-primary-950">Plan (sin cobro)</label>
            <select
              className="w-full border rounded px-3 py-2 bg-white text-sm"
              value={grantMembershipId}
              onChange={(e) => setGrantMembershipId(e.target.value)}
            >
              <option value="">— Seleccionar plan —</option>
              {planOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${p.price})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={actionLoading || !grantMembershipId}
              onClick={() => void runAction('grant')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
            >
              {actionLoading ? '…' : 'Activar sin facturación (demo)'}
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void runAction('require')}
              className="px-4 py-2 border-2 border-primary-600 bg-white text-primary-900 rounded-lg text-sm font-semibold hover:bg-primary-100 disabled:opacity-50"
            >
              {actionLoading
                ? '…'
                : access.adminMembershipRequired
                  ? 'Reforzar exigencia de pago'
                  : 'Exigir membresía pagada'}
            </button>
            {access.provisionedByAdmin === false ? (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void runAction('mark-provisioned')}
                className="px-4 py-2 border border-amber-400 bg-amber-50 text-amber-900 rounded-lg text-sm hover:bg-amber-100 disabled:opacity-50"
              >
                Marcar cuenta admin
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-xs text-primary-700">
          Ya tiene suscripción Stripe. Para cambiar el plan, el usuario debe hacerlo desde su panel.
        </p>
      )}
    </div>
  );
}
