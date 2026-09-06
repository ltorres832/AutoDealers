'use client';

import { useCallback, useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import { ensureSalesFirebaseClientAuth } from '@/lib/ensure-sales-firebase-client-auth';

interface Grant {
  id: string;
  startsAt: string;
  expiresAt: string;
  durationMinutes: number;
  targetTenantId: string;
  targetAccountId?: string;
  targetUserId?: string;
  targetAccountLabel?: string;
  status?: string;
}

function toIso(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return '';
    }
  }
  return '';
}

function fmt(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-PR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function mapGrant(id: string, data: Record<string, unknown>): Grant {
  return {
    id,
    startsAt: toIso(data.startsAt),
    expiresAt: toIso(data.expiresAt),
    durationMinutes: Number(data.durationMinutes || 0),
    targetTenantId: String(data.targetTenantId || ''),
    targetAccountId: data.targetAccountId ? String(data.targetAccountId) : undefined,
    targetUserId: data.targetUserId ? String(data.targetUserId) : undefined,
    targetAccountLabel: data.targetAccountLabel ? String(data.targetAccountLabel) : undefined,
    status: String(data.status || 'active'),
  };
}

export function SalesConfigAccessPanel({
  accounts = [],
  employeeId,
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
  employeeId?: string;
}) {
  const list = Array.isArray(accounts) ? accounts : [];
  const [loading, setLoading] = useState(true);
  const [activeGrants, setActiveGrants] = useState<Grant[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [busyId, setBusyId] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [realtime, setRealtime] = useState(false);

  const applyActiveGrants = useCallback((grants: Grant[]) => {
    const now = Date.now();
    setActiveGrants(
      grants.filter((g) => {
        if (g.status && g.status !== 'active') return false;
        const exp = g.expiresAt ? new Date(g.expiresAt).getTime() : 0;
        const start = g.startsAt ? new Date(g.startsAt).getTime() : 0;
        return (!start || start <= now) && (!exp || exp > now);
      })
    );
  }, []);

  const loadApi = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) {
      setLoading(true);
      setErr('');
    }
    try {
      const res = await fetch('/api/sales/config-access', { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setErr('Sesión expirada. Vuelve a /sales/login');
        if (!silent) setActiveGrants([]);
        return;
      }
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      applyActiveGrants(Array.isArray(json.activeGrants) ? json.activeGrants : []);
      setPendingCount(
        (json.requests || []).filter((r: { status: string }) => r.status === 'pending').length
      );
      setErr('');
    } catch (e) {
      if (!silent) {
        setErr(e instanceof Error ? e.message : 'Error cargando acceso');
        setActiveGrants([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [applyActiveGrants]);

  useEffect(() => {
    let cancelled = false;
    const unsubs: Unsubscribe[] = [];
    let pollTimer: number | undefined;

    async function start() {
      await loadApi();
      if (cancelled || !employeeId) return;

      const ok = await ensureSalesFirebaseClientAuth();
      if (cancelled) return;
      if (!ok || !db) {
        pollTimer = window.setInterval(() => void loadApi({ silent: true }), 60000);
        return;
      }

      setRealtime(true);

      unsubs.push(
        onSnapshot(
          query(
            collection(db, 'staff_access_grants'),
            where('salesEmployeeId', '==', employeeId)
          ),
          (snap) => {
            applyActiveGrants(
              snap.docs.map((d) => mapGrant(d.id, d.data() as Record<string, unknown>))
            );
            setLoading(false);
          },
          (error) => {
            console.warn('[sales] grants listener', error);
            void loadApi({ silent: true });
          }
        )
      );

      unsubs.push(
        onSnapshot(
          query(
            collection(db, 'staff_access_requests'),
            where('salesEmployeeId', '==', employeeId)
          ),
          (snap) => {
            setPendingCount(
              snap.docs.filter((d) => String(d.data().status || '') === 'pending').length
            );
          },
          (error) => console.warn('[sales] requests listener', error)
        )
      );
    }

    void start();

    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          /* ignore */
        }
      });
    };
  }, [employeeId, loadApi, applyActiveGrants]);

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
      <div className="flex justify-between items-center gap-2">
        <p className="text-[11px] text-slate-400">
          {realtime ? 'Tiempo real' : 'Sincronizando…'}
        </p>
        <button
          type="button"
          onClick={() => void loadApi({ silent: true })}
          className="text-xs underline text-slate-600"
        >
          Actualizar
        </button>
      </div>

      {loading ? <p className="text-sm text-slate-500">Cargando…</p> : null}

      <div className="rounded-lg border border-slate-200 divide-y min-h-[72px]">
        {list.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">
            <p>No hay cuentas todavía. Créalas en Membresías.</p>
            {activeGrants.length > 0 ? (
              <p className="text-green-700 text-xs pt-2">
                Tienes acceso activo, pero no coincide con una cuenta de este portal.
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
                      Hasta {fmt(grant.expiresAt)}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">Sin acceso</p>
                  )}
                </div>
                {grant ? (
                  <button
                    type="button"
                    disabled={!!busyId}
                    onClick={() => void enterAccount(a)}
                    className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  >
                    {busyId === a.id ? 'Abriendo…' : 'Entrar'}
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
        <p className="text-xs text-slate-500">
          {pendingCount} solicitud{pendingCount === 1 ? '' : 'es'} pendiente
          {pendingCount === 1 ? '' : 's'}.
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
