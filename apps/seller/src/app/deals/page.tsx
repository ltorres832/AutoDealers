'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

function money(n: number) {
  return new Intl.NumberFormat('es-PR', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function cleanUrl() {
  if (typeof window === 'undefined') return;
  const u = new URL(window.location.href);
  ['connect', 'resumeDeposit', 'deposit', 'dealId', 'connectTenantId'].forEach((k) =>
    u.searchParams.delete(k)
  );
  window.history.replaceState({}, '', u.pathname + (u.search || ''));
}

export default function SellerDealsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [connect, setConnect] = useState<any>(null);
  const [connectTenantId, setConnectTenantId] = useState('');
  const [activating, setActivating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [share, setShare] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    vehicleId: '',
    buyerName: '',
    buyerEmail: '',
    buyerPhone: '',
    vehiclePrice: '',
    tradeInValue: '',
    tablilla: '',
    tax: '',
    depositAmount: '500',
    notes: '',
    createAndCharge: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = connectTenantId ? `?connectTenantId=${encodeURIComponent(connectTenantId)}` : '';
      const [dealsRes, invRes, connectRes] = await Promise.all([
        fetchWithAuth('/api/deals', {}),
        fetchWithAuth('/api/vehicles?status=available&limit=100', {}),
        fetchWithAuth(`/api/settings/connect${qs}`, {}),
      ]);
      if (dealsRes.ok) {
        const d = await dealsRes.json();
        setDeals(d.deals || []);
        if (d.connect) {
          setConnect(d.connect);
          if (!connectTenantId && d.connect.connectTenantId) {
            setConnectTenantId(d.connect.connectTenantId);
          }
        }
      }
      if (invRes.ok) {
        const d = await invRes.json();
        setVehicles(d.vehicles || d || []);
      }
      if (connectRes.ok) {
        const d = await connectRes.json();
        setConnect(d.connect);
        if (!connectTenantId && d.connect?.connectTenantId) {
          setConnectTenantId(d.connect.connectTenantId);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [connectTenantId]);

  async function activatePayments(resumeDealId?: string) {
    setActivating(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/settings/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeDealId,
          connectTenantId: connectTenantId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar activación');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || 'Error');
      setActivating(false);
    }
  }

  async function createDepositLink(dealId: string) {
    setBusyId(dealId);
    setError(null);
    setCopied(false);
    try {
      const res = await fetchWithAuth(`/api/deals/${dealId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectTenantId: connectTenantId || undefined }),
      });
      const data = await res.json();
      if (res.status === 409 || (data.needsConnect && !data.canSelfOnboard)) {
        setError(data.message || data.error || 'Tu dealer debe activar cobros');
        if (data.connect) setConnect(data.connect);
        return false;
      }
      if (!res.ok && !data.needsConnect) throw new Error(data.error || 'Error');

      if (data.needsConnect && data.onboardingUrl) {
        setMessage(data.message || 'Activando cobros…');
        window.location.href = data.onboardingUrl;
        return false;
      }

      setShare(data);
      setMessage(data.message || 'Link listo');
      await load();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectParam = params.get('connect');
    const resumeDeposit = params.get('resumeDeposit');
    const deposit = params.get('deposit');

    if (deposit === 'success') {
      setMessage('¡Depósito recibido! El vehículo queda reservado.');
      cleanUrl();
      void load();
      return;
    }
    if (deposit === 'cancel') {
      setMessage('El comprador canceló el pago. Puedes generar el link de nuevo.');
      cleanUrl();
      return;
    }

    if (connectParam === 'return' || connectParam === 'refresh') {
      (async () => {
        setMessage(
          connectParam === 'refresh'
            ? 'Si no terminaste, vuelve a pulsar “Activar cobros”.'
            : 'Revisando activación…'
        );
        await load();
        if (resumeDeposit) await createDepositLink(resumeDeposit);
        cleanUrl();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createDeal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetchWithAuth('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: form.vehicleId,
        connectTenantId: connectTenantId || undefined,
        buyer: {
          fullName: form.buyerName,
          email: form.buyerEmail || undefined,
          phone: form.buyerPhone || undefined,
        },
        vehiclePrice: Number(form.vehiclePrice || 0),
        tradeInValue: form.tradeInValue ? Number(form.tradeInValue) : undefined,
        tablilla: form.tablilla ? Number(form.tablilla) : undefined,
        tax: form.tax ? Number(form.tax) : undefined,
        depositAmount: Number(form.depositAmount || 0),
        notes: form.notes || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'No se pudo crear');
      return;
    }
    setShowForm(false);
    setMessage('Deal creado');
    await load();
    if (form.createAndCharge && Number(form.depositAmount) > 0 && data.deal?.id) {
      await createDepositLink(data.deal.id);
    }
  }

  async function runAction(dealId: string, action: string) {
    if (action === 'deposit') {
      await createDepositLink(dealId);
      return;
    }
    setBusyId(dealId);
    try {
      const res = await fetchWithAuth(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setMessage(action === 'convert_sale' ? `Venta creada: ${data.sale?.id}` : 'Actualizado');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  const canSelfOnboard = connect?.canSelfOnboard === true;
  const ready = connect?.options?.find((o: any) => o.tenantId === (connectTenantId || connect?.connectTenantId))
    ?.ready;
  const isEmployerMode = connect?.mode === 'seller_uses_employer_dealer';
  const showPicker = (connect?.options?.length || 0) > 1 && !isEmployerMode;

  if (loading && deals.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold">Deal desk</h1>
          <p className="text-gray-600 mt-1">
            Cotiza, cobra depósito y reserva. El dinero va a la cuenta correcta según tu perfil.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium"
        >
          {showForm ? 'Cerrar' : '+ Nuevo deal'}
        </button>
      </div>

      {connect?.message && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            ready
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-300 bg-amber-50 text-amber-950'
          }`}
        >
          <p className="font-medium">{connect.message}</p>
          {showPicker && (
            <label className="block mt-3 text-sm">
              Cuenta que recibe el depósito
              <select
                value={connectTenantId || connect.connectTenantId}
                onChange={(e) => setConnectTenantId(e.target.value)}
                className="mt-1 w-full max-w-md border rounded px-3 py-2 bg-white"
              >
                {connect.options.map((o: any) => (
                  <option key={o.tenantId} value={o.tenantId}>
                    {o.label} {o.ready ? '(lista)' : '(sin cobros)'}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!ready && canSelfOnboard && (
            <button
              type="button"
              disabled={activating}
              onClick={() => activatePayments()}
              className="mt-3 px-4 py-2 rounded-lg bg-amber-800 text-white font-medium disabled:opacity-50"
            >
              {activating ? 'Abriendo…' : 'Activar mis cobros ahora'}
            </button>
          )}
          {!ready && !canSelfOnboard && (
            <p className="mt-2 text-xs">
              No tienes que configurar Stripe: el dealer activa cobros una vez en su Deal desk.
            </p>
          )}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {share?.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-xl font-bold">Link de depósito listo</h2>
            <p className="text-sm text-gray-600">
              Envíalo a <strong>{share.buyerName}</strong> — {money(share.amount)}
            </p>
            <div className="bg-gray-50 border rounded-lg p-3 text-xs break-all font-mono">
              {share.url}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(share.url);
                  setCopied(true);
                }}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm"
              >
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
              {share.whatsappUrl && (
                <a
                  href={share.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm"
                >
                  WhatsApp
                </a>
              )}
              {share.mailtoUrl && (
                <a href={share.mailtoUrl} className="px-4 py-2 rounded-lg border text-sm">
                  Email
                </a>
              )}
            </div>
            <button type="button" onClick={() => setShare(null)} className="text-sm text-gray-500 underline">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={createDeal}
          className="bg-white border rounded-lg p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <label className="text-sm sm:col-span-2">
            Vehículo
            <select
              required
              value={form.vehicleId}
              onChange={(e) => {
                const id = e.target.value;
                const v = vehicles.find((x) => x.id === id);
                setForm((f) => ({
                  ...f,
                  vehicleId: id,
                  vehiclePrice: v?.price != null ? String(v.price) : f.vehiclePrice,
                }));
              }}
              className="mt-1 w-full border rounded px-3 py-2"
            >
              <option value="">Seleccionar…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model} — {money(v.price)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Comprador *
            <input
              required
              value={form.buyerName}
              onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            WhatsApp
            <input
              value={form.buyerPhone}
              onChange={(e) => setForm((f) => ({ ...f, buyerPhone: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Email
            <input
              type="email"
              value={form.buyerEmail}
              onChange={(e) => setForm((f) => ({ ...f, buyerEmail: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Precio
            <input
              type="number"
              required
              value={form.vehiclePrice}
              onChange={(e) => setForm((f) => ({ ...f, vehiclePrice: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Depósito *
            <input
              type="number"
              required
              value={form.depositAmount}
              onChange={(e) => setForm((f) => ({ ...f, depositAmount: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.createAndCharge}
              onChange={(e) => setForm((f) => ({ ...f, createAndCharge: e.target.checked }))}
            />
            Al guardar, generar link de depósito
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="bg-primary-600 text-white px-5 py-2.5 rounded-lg">
              Guardar deal
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {deals.length === 0 && <p className="text-gray-500">Aún no tienes deals.</p>}
        {deals.map((d) => (
          <div key={d.id} className="bg-white border rounded-lg p-4 flex flex-wrap justify-between gap-3">
            <div>
              <div className="font-semibold text-lg">{d.buyer?.fullName}</div>
              <div className="text-sm text-gray-600">
                {String(d.status).replace(/_/g, ' ')} · Total {money(d.total)} · Depósito{' '}
                {money(d.depositAmount)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {d.depositAmount > 0 && !['won', 'cancelled'].includes(d.status) && (
                <button
                  type="button"
                  disabled={busyId === d.id}
                  onClick={() => runAction(d.id, 'deposit')}
                  className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white disabled:opacity-50"
                >
                  Cobrar depósito
                </button>
              )}
              <Link href={`/fi?dealId=${d.id}`} className="px-3 py-1.5 text-sm rounded border">
                F&I
              </Link>
              {!['won', 'cancelled'].includes(d.status) && (
                <button
                  type="button"
                  disabled={busyId === d.id}
                  onClick={() => runAction(d.id, 'convert_sale')}
                  className="px-3 py-1.5 text-sm rounded bg-primary-600 text-white"
                >
                  Crear venta
                </button>
              )}
              {!['won', 'cancelled'].includes(d.status) && (
                <button
                  type="button"
                  disabled={busyId === d.id}
                  onClick={() => runAction(d.id, 'cancel')}
                  className="px-3 py-1.5 text-sm rounded bg-gray-100"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
