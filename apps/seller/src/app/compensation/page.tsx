'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { useRealtimeSellerSales } from '@/hooks/useRealtimeCompensation';

type Tab = 'resumen' | 'ventas' | 'pagos' | 'vacaciones';

function money(n: number, currency = 'USD') {
  return new Intl.NumberFormat('es-PR', { style: 'currency', currency }).format(n || 0);
}

export default function CompensationPage() {
  const [tab, setTab] = useState<Tab>('resumen');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [leave, setLeave] = useState<{ balance: any; requests: any[] } | null>(null);
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [tenantId, setTenantId] = useState<string | undefined>();
  const [sellerId, setSellerId] = useState<string | undefined>();
  const { revision } = useRealtimeSellerSales(tenantId, sellerId);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, salesRes, payRes, leaveRes, meRes] = await Promise.all([
        fetchWithAuth('/api/compensation/summary', {}),
        fetchWithAuth('/api/compensation/sales', {}),
        fetchWithAuth('/api/compensation/payouts', {}),
        fetchWithAuth('/api/compensation/leave', {}),
        fetchWithAuth('/api/auth/me', {}),
      ]);
      if (meRes.ok) {
        const me = await meRes.json();
        setTenantId(me.user?.tenantId);
        setSellerId(me.user?.userId);
      }
      if (sumRes.ok) {
        const d = await sumRes.json();
        setSummary(d.summary);
      }
      if (salesRes.ok) {
        const d = await salesRes.json();
        setSales(d.sales || []);
      }
      if (payRes.ok) {
        const d = await payRes.json();
        setPayouts(d.payouts || []);
      }
      if (leaveRes.ok) {
        const d = await leaveRes.json();
        setLeave({ balance: d.balance, requests: d.requests || [] });
      }
    } catch (e: any) {
      setError(e?.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (revision > 0) {
      void loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/compensation/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo solicitar');
      setLeaveForm({ startDate: '', endDate: '', reason: '' });
      await loadAll();
      setTab('vacaciones');
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'ventas', label: 'Mis ventas' },
    { id: 'pagos', label: 'Pagos' },
    { id: 'vacaciones', label: 'Vacaciones' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">Mi compensación</h1>
      <p className="text-gray-600 mb-6">
        Ventas, comisiones, bonos, liquidaciones y vacaciones en un solo lugar.
      </p>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6 border-b pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              tab === t.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Stat label="Ventas completadas" value={String(summary.salesCount)} />
          <Stat label="Comisiones ganadas" value={money(summary.earnedCommission, summary.currency)} />
          <Stat label="Bonos" value={money(summary.bonuses, summary.currency)} />
          <Stat label="Pagado" value={money(summary.paidOut, summary.currency)} />
          <Stat label="Pendiente de pago" value={money(summary.pendingPayouts, summary.currency)} />
          <Stat label="Saldo por liquidar" value={money(summary.balanceDue, summary.currency)} />
          {summary.leave && (
            <Stat
              label={`Vacaciones ${summary.leave.year}`}
              value={`${summary.leave.usedDays + summary.leave.pendingDays} / ${summary.leave.entitledDays} días`}
            />
          )}
        </div>
      )}

      {tab === 'ventas' && (
        <div className="overflow-x-auto bg-white rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Comisión</th>
                <th className="px-4 py-3">Bonos</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Aún no hay ventas registradas.
                  </td>
                </tr>
              )}
              {sales.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-3">
                    {formatDate(s.completedAt || s.createdAt)}
                  </td>
                  <td className="px-4 py-3">{s.status}</td>
                  <td className="px-4 py-3">{money(s.salePrice)}</td>
                  <td className="px-4 py-3">{money(s.totalCommission)}</td>
                  <td className="px-4 py-3">{money(s.bonusTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pagos' && (
        <div className="space-y-3">
          {payouts.length === 0 && (
            <p className="text-gray-500">No hay liquidaciones todavía.</p>
          )}
          {payouts.map((p) => (
            <div key={p.id} className="bg-white border rounded-lg p-4 flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-medium">
                  {p.periodStart} → {p.periodEnd}
                </div>
                <div className="text-sm text-gray-500">Estado: {p.status}</div>
                {p.notes && <div className="text-sm text-gray-600 mt-1">{p.notes}</div>}
              </div>
              <div className="text-lg font-semibold">{money(p.totalAmount, p.currency)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'vacaciones' && (
        <div className="space-y-6">
          {leave?.balance && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Asignados" value={`${leave.balance.entitledDays} días`} />
              <Stat label="Usados" value={`${leave.balance.usedDays} días`} />
              <Stat label="Pendientes" value={`${leave.balance.pendingDays} días`} />
              <Stat
                label="Disponibles"
                value={`${Math.max(
                  0,
                  leave.balance.entitledDays - leave.balance.usedDays - leave.balance.pendingDays
                )} días`}
              />
            </div>
          )}

          <form onSubmit={submitLeave} className="bg-white border rounded-lg p-4 space-y-3 max-w-xl">
            <h2 className="font-semibold text-lg">Solicitar vacaciones</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">
                Desde
                <input
                  type="date"
                  required
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Hasta
                <input
                  type="date"
                  required
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>
            </div>
            <label className="text-sm block">
              Motivo (opcional)
              <textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                className="mt-1 w-full border rounded px-3 py-2"
                rows={2}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </form>

          <div className="space-y-2">
            <h2 className="font-semibold">Historial</h2>
            {(leave?.requests || []).length === 0 && (
              <p className="text-gray-500 text-sm">Sin solicitudes.</p>
            )}
            {(leave?.requests || []).map((r) => (
              <div key={r.id} className="border rounded-lg px-4 py-3 bg-white text-sm flex justify-between gap-2">
                <div>
                  {r.startDate} → {r.endDate} ({r.days} días hábiles)
                  {r.reason ? ` — ${r.reason}` : ''}
                </div>
                <span className="font-medium capitalize">{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function formatDate(value: unknown): string {
  if (!value) return '—';
  try {
    const d =
      typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : value instanceof Date
          ? value
          : new Date(String(value));
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-PR');
  } catch {
    return '—';
  }
}
