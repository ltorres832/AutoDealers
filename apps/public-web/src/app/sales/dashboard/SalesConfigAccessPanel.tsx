'use client';

import { useCallback, useEffect, useState } from 'react';

interface Grant {
  id: string;
  startsAt: string;
  expiresAt: string;
  durationMinutes: number;
  targetTenantId: string;
  targetAccountId?: string;
  targetUserId?: string;
  targetAccountLabel?: string;
}

function fmt(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-PR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function SalesConfigAccessPanel({
  accounts = [],
}: {
  accounts?: Array<{
    id: string;
    role: string;
    tenantId: string;
    userId: string;
    name: string;
    companyName?: string;
    email: string;
  }>;
}) {
  const list = Array.isArray(accounts) ? accounts : [];
  const [loading, setLoading] = useState(true);
  const [activeGrants, setActiveGrants] = useState<Grant[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [busyId, setBusyId] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/sales/config-access', { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setErr('Sesión expirada. Vuelve a /sales/login');
        setActiveGrants([]);
        return;
      }
      if (!res.ok) {
        throw new Error(json.error || `Error ${res.status}`);
      }
      setActiveGrants(Array.isArray(json.activeGrants) ? json.activeGrants : []);
      setPendingCount(
        (json.requests || []).filter((r: { status: string }) => r.status === 'pending').length
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error cargando acceso');
      setActiveGrants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(t);
  }, [load]);

  function grantForAccount(account: { id: string; tenantId: string; userId: string }) {
    return activeGrants.find(
      (g) =>
        (g.targetAccountId && g.targetAccountId === account.id) ||
        (g.targetTenantId && g.targetTenantId === account.tenantId) ||
        (g.targetUserId && g.targetUserId === account.userId)
    );
  }

  async function enterAccount(account: {
    id: string;
    tenantId: string;
    userId: string;
    name: string;
    companyName?: string;
  }) {
    setBusyId(account.id);
    setErr('');
    setMsg('');
    try {
      const res = await fetch('/api/sales/support/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          tenantId: account.tenantId,
          userId: account.userId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo entrar');
      if (!json.redirectUrl) throw new Error('Sin URL');
      window.open(json.redirectUrl, '_blank', 'noopener,noreferrer');
      setMsg(`Abriendo ${account.companyName || account.name}…`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={() => void load()} className="text-xs underline text-amber-950">
          Actualizar estado
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-amber-900 bg-white/70 rounded-lg p-3">Cargando permisos…</p>
      ) : null}

      <div className="bg-white rounded-lg border-2 border-amber-400 divide-y min-h-[72px]">
        {list.length === 0 ? (
          <div className="p-4 text-sm text-slate-800 space-y-1">
            <p className="font-semibold">Todavía no tienes cuentas / membresías.</p>
            <p className="text-slate-600">
              Cuando crees una en la pestaña <strong>Membresías</strong>, aparecerá aquí. El admin
              podrá seleccionarla y darte acceso temporal a esa cuenta.
            </p>
            {activeGrants.length > 0 ? (
              <p className="text-green-700 text-xs pt-2">
                Tienes {activeGrants.length} grant(s) activo(s), pero no coinciden con cuentas
                listadas en tu portal.
              </p>
            ) : null}
          </div>
        ) : (
          list.map((a) => {
            const grant = grantForAccount(a);
            return (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">{a.companyName || a.name}</p>
                  <p className="text-xs text-slate-500">
                    {a.role} · {a.email}
                  </p>
                  {grant ? (
                    <p className="text-xs text-green-700 mt-0.5 font-medium">
                      Acceso hasta {fmt(grant.expiresAt)} ({grant.durationMinutes} min)
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">Sin acceso a esta cuenta</p>
                  )}
                </div>
                {grant ? (
                  <button
                    type="button"
                    disabled={!!busyId}
                    onClick={() => void enterAccount(a)}
                    className="bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  >
                    {busyId === a.id ? 'Abriendo…' : 'Entrar a configurar'}
                  </button>
                ) : (
                  <span className="text-xs font-medium text-slate-500 px-2 py-1 border rounded bg-slate-50">
                    Bloqueado
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {pendingCount > 0 ? (
        <p className="text-xs font-medium text-amber-950">
          {pendingCount} solicitud(es) pendiente(s) al admin.
        </p>
      ) : null}

      {err ? (
        <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {err}
        </p>
      ) : null}
      {msg ? <p className="text-sm text-green-800">{msg}</p> : null}
    </div>
  );
}
