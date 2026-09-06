'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface Grant {
  id: string;
  employeeEmail: string;
  employeeName: string;
  startsAt: string;
  expiresAt: string;
  durationMinutes: number;
  status: string;
  targetTenantId?: string;
  targetAccountLabel?: string;
}

interface AccessRequest {
  id: string;
  employeeEmail: string;
  employeeName: string;
  requestedMinutes: number;
  preferredStartAt?: string;
  reason: string;
  status: string;
  targetTenantId?: string;
  targetAccountId?: string;
  targetAccountLabel?: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface AccountOption {
  id: string;
  employeeId: string;
  tenantId: string;
  userId: string;
  name: string;
  companyName?: string;
  email: string;
  role: string;
}

function fmt(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function StaffAccessPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grants, setGrants] = useState<Grant[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [salesEmployeeId, setSalesEmployeeId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [startsAt, setStartsAt] = useState(toLocalInputValue(new Date()));
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [reason, setReason] = useState('Configuración de cuenta específica');
  const [saving, setSaving] = useState(false);

  const employeeAccounts = useMemo(
    () => accounts.filter((a) => a.employeeId === salesEmployeeId),
    [accounts, salesEmployeeId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [accessRes, overviewRes] = await Promise.all([
        fetchWithAuth('/api/admin/staff-access'),
        fetchWithAuth('/api/admin/empleados-ventas/overview'),
      ]);
      const data = await accessRes.json();
      if (!accessRes.ok) throw new Error(data.error || 'Error cargando');
      setGrants(data.grants || []);
      setRequests(data.requests || []);
      setEmployees((data.employees || []).filter((e: EmployeeOption) => e.status === 'active'));
      setAccounts(data.accounts || []);
      if ((!data.accounts || data.accounts.length === 0) && overviewRes.ok) {
        const ov = await overviewRes.json();
        setAccounts(ov.accounts || []);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function grantAccess(e: React.FormEvent) {
    e.preventDefault();
    const account = employeeAccounts.find((a) => a.id === accountId);
    if (!salesEmployeeId || !account) {
      alert('Selecciona empleado y cuenta específica');
      return;
    }
    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/admin/staff-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesEmployeeId,
          startsAt: new Date(startsAt).toISOString(),
          durationMinutes,
          reason,
          targetTenantId: account.tenantId,
          targetUserId: account.userId,
          targetAccountId: account.id,
          targetAccountLabel: account.companyName || account.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo otorgar');
      alert(`Acceso a «${account.companyName || account.name}» hasta ${fmt(data.grant?.expiresAt)}`);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function patchRequest(
    id: string,
    action: 'approve' | 'deny' | 'revoke',
    extra?: Record<string, unknown>
  ) {
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/admin/staff-access/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Acceso temporal por cuenta</h1>
        <p className="text-sm text-gray-600 mt-2">
          Cada permiso es a <strong>una cuenta</strong>. El empleado solo entra a esa. También en{' '}
          <Link href="/admin/empleados-ventas" className="text-primary-700 underline">
            Empleados de ventas → Citas
          </Link>
          .
        </p>
      </div>

      {error ? <p className="text-red-600 text-sm">{error}</p> : null}

      <form onSubmit={grantAccess} className="bg-white rounded-lg shadow p-5 space-y-4">
        <h2 className="font-semibold text-lg">Otorgar acceso a una cuenta</h2>
        <p className="text-xs text-gray-600">
          Elige empleado y luego la <strong>cuenta específica</strong> en el selector de abajo.
        </p>
        <label className="text-sm block font-medium">
          Empleado
          <select
            value={salesEmployeeId}
            onChange={(e) => {
              setSalesEmployeeId(e.target.value);
              setAccountId('');
            }}
            className="mt-1 w-full border-2 border-amber-400 rounded-lg px-3 py-2"
            required
          >
            <option value="">Seleccionar empleado…</option>
            {employees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm block font-medium">
          Cuenta a la que das acceso
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full border-2 border-amber-500 rounded-lg px-3 py-2 bg-amber-50"
            required
            disabled={!salesEmployeeId}
          >
            <option value="">
              {salesEmployeeId
                ? employeeAccounts.length
                  ? 'Seleccionar cuenta…'
                  : 'Este empleado no tiene cuentas'
                : 'Primero elige empleado'}
            </option>
            {employeeAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.companyName || a.name} ({a.role}) · {a.email}
              </option>
            ))}
          </select>
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm block">
            Inicio
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              required
            />
          </label>
          <label className="text-sm block">
            Duración
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value={30}>30 min</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
              <option value={240}>4 horas</option>
              <option value={480}>8 horas</option>
            </select>
          </label>
        </div>
        <label className="text-sm block">
          Motivo
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
        >
          Otorgar a esta cuenta
        </button>
      </form>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-5 py-3 border-b font-semibold">Solicitudes pendientes</div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Empleado</th>
              <th className="px-4 py-2">Cuenta</th>
              <th className="px-4 py-2">Inicio</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {requests.filter((r) => r.status === 'pending').length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-gray-500">
                  Sin pendientes.
                </td>
              </tr>
            ) : (
              requests
                .filter((r) => r.status === 'pending')
                .map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.employeeName}</div>
                      <div className="text-xs text-gray-500">{r.employeeEmail}</div>
                    </td>
                    <td className="px-4 py-2">
                      {r.targetAccountLabel || r.targetTenantId || '—'}
                    </td>
                    <td className="px-4 py-2">{fmt(r.preferredStartAt)}</td>
                    <td className="px-4 py-2 space-x-2">
                      <button
                        type="button"
                        disabled={saving || !r.targetTenantId}
                        className="text-green-700 hover:underline disabled:opacity-40"
                        onClick={() =>
                          void patchRequest(r.id, 'approve', {
                            startsAt: r.preferredStartAt || new Date().toISOString(),
                            durationMinutes: r.requestedMinutes || 120,
                            targetTenantId: r.targetTenantId,
                            targetAccountId: r.targetAccountId,
                            targetAccountLabel: r.targetAccountLabel,
                          })
                        }
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        className="text-red-700 hover:underline"
                        onClick={() => void patchRequest(r.id, 'deny')}
                      >
                        Denegar
                      </button>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-5 py-3 border-b font-semibold">Grants</div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Empleado</th>
              <th className="px-4 py-2">Cuenta</th>
              <th className="px-4 py-2">Expira</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {grants.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="px-4 py-2">
                  <div className="font-medium">{g.employeeName}</div>
                  <div className="text-xs text-gray-500">{g.employeeEmail}</div>
                </td>
                <td className="px-4 py-2">{g.targetAccountLabel || g.targetTenantId || '—'}</td>
                <td className="px-4 py-2">{fmt(g.expiresAt)}</td>
                <td className="px-4 py-2">{g.status}</td>
                <td className="px-4 py-2">
                  {g.status === 'active' ? (
                    <button
                      type="button"
                      className="text-red-700 hover:underline"
                      onClick={() => void patchRequest(g.id, 'revoke')}
                    >
                      Revocar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
