'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

const RATE_LABELS: Record<string, string> = {
  vehicle: 'Vehículo %',
  insurance: 'Seguro %',
  accessories: 'Accesorios %',
  warranty: 'Warranty %',
  servicePackage: 'Paquete servicio %',
  other: 'Otros %',
};

export default function CompensationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [annualLeaveDays, setAnnualLeaveDays] = useState(15);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [sellers, setSellers] = useState<Array<{ id: string; name: string }>>([]);
  const [payoutForm, setPayoutForm] = useState({
    sellerId: '',
    periodStart: '',
    periodEnd: '',
    notes: '',
    markPaid: true,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, payoutsRes, leaveRes, sellersRes] = await Promise.all([
        fetchWithAuth('/api/settings/compensation', {}),
        fetchWithAuth('/api/compensation/payouts', {}),
        fetchWithAuth('/api/compensation/leave?status=pending', {}),
        fetchWithAuth('/api/sellers', {}),
      ]);
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        setRates(d.settings?.rates || {});
        setAnnualLeaveDays(d.settings?.annualLeaveDays ?? 15);
      }
      if (payoutsRes.ok) {
        const d = await payoutsRes.json();
        setPayouts(d.payouts || []);
      }
      if (leaveRes.ok) {
        const d = await leaveRes.json();
        setLeaveRequests(d.requests || []);
      }
      if (sellersRes.ok) {
        const d = await sellersRes.json();
        const list = (d.sellers || d || []).map((s: any) => ({
          id: s.id,
          name: s.name || s.email || s.id,
        }));
        setSellers(list);
        if (list[0] && !payoutForm.sellerId) {
          setPayoutForm((f) => ({ ...f, sellerId: list[0].id }));
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/settings/compensation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates, annualLeaveDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setMessage('Configuración guardada');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function createPayout(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/compensation/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payoutForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear liquidación');
      setMessage('Liquidación creada');
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function reviewLeave(leaveId: string, status: 'approved' | 'rejected') {
    setError(null);
    const res = await fetchWithAuth('/api/compensation/leave', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaveId, status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    await load();
  }

  async function markPayout(payoutId: string, status: 'paid' | 'cancelled') {
    const res = await fetchWithAuth('/api/compensation/payouts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payoutId, status }),
    });
    if (res.ok) await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Compensación y vacaciones</h1>
        <p className="text-gray-600 mt-1">
          Tasas de comisión, liquidaciones a vendedores y aprobación de vacaciones.
        </p>
      </div>

      {message && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-green-800 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={saveSettings} className="bg-white border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-lg">Tasas por producto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.keys(RATE_LABELS).map((key) => (
            <label key={key} className="text-sm">
              {RATE_LABELS[key]}
              <input
                type="number"
                step="0.1"
                min={0}
                value={rates[key] ?? 0}
                onChange={(e) =>
                  setRates((r) => ({ ...r, [key]: parseFloat(e.target.value) || 0 }))
                }
                className="mt-1 w-full border rounded px-3 py-2"
              />
            </label>
          ))}
        </div>
        <label className="text-sm block max-w-xs">
          Días de vacaciones / año
          <input
            type="number"
            min={0}
            max={365}
            value={annualLeaveDays}
            onChange={(e) => setAnnualLeaveDays(parseInt(e.target.value, 10) || 0)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar tasas'}
        </button>
      </form>

      <form onSubmit={createPayout} className="bg-white border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-lg">Crear liquidación</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">
            Vendedor
            <select
              required
              value={payoutForm.sellerId}
              onChange={(e) => setPayoutForm((f) => ({ ...f, sellerId: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            >
              <option value="">Seleccionar…</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={payoutForm.markPaid}
              onChange={(e) => setPayoutForm((f) => ({ ...f, markPaid: e.target.checked }))}
            />
            Marcar como pagado
          </label>
          <label className="text-sm">
            Desde
            <input
              type="date"
              required
              value={payoutForm.periodStart}
              onChange={(e) => setPayoutForm((f) => ({ ...f, periodStart: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Hasta
            <input
              type="date"
              required
              value={payoutForm.periodEnd}
              onChange={(e) => setPayoutForm((f) => ({ ...f, periodEnd: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
        </div>
        <label className="text-sm block">
          Notas
          <input
            value={payoutForm.notes}
            onChange={(e) => setPayoutForm((f) => ({ ...f, notes: e.target.value }))}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Generar liquidación del período
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Liquidaciones recientes</h2>
        {payouts.length === 0 && <p className="text-sm text-gray-500">Ninguna aún.</p>}
        {payouts.slice(0, 20).map((p) => (
          <div
            key={p.id}
            className="bg-white border rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <div>
              <div className="font-medium">
                {p.sellerName || p.sellerId} · {p.periodStart} → {p.periodEnd}
              </div>
              <div className="text-gray-500">
                {p.status} · ${Number(p.totalAmount || 0).toFixed(2)}
              </div>
            </div>
            <div className="flex gap-2">
              {p.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => markPayout(p.id, 'paid')}
                  className="px-3 py-1 rounded bg-green-600 text-white"
                >
                  Marcar pagado
                </button>
              )}
              {p.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => markPayout(p.id, 'cancelled')}
                  className="px-3 py-1 rounded bg-gray-200"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Solicitudes de vacaciones pendientes</h2>
        {leaveRequests.length === 0 && (
          <p className="text-sm text-gray-500">No hay pendientes.</p>
        )}
        {leaveRequests.map((r) => (
          <div
            key={r.id}
            className="bg-white border rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <div>
              <div className="font-medium">
                {r.sellerName || r.sellerId}: {r.startDate} → {r.endDate} ({r.days} días)
              </div>
              {r.reason && <div className="text-gray-500">{r.reason}</div>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => reviewLeave(r.id, 'approved')}
                className="px-3 py-1 rounded bg-green-600 text-white"
              >
                Aprobar
              </button>
              <button
                type="button"
                onClick={() => reviewLeave(r.id, 'rejected')}
                className="px-3 py-1 rounded bg-red-100 text-red-700"
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
