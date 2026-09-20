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
  ['connect', 'resumeDeposit', 'deposit', 'dealId'].forEach((k) => u.searchParams.delete(k));
  window.history.replaceState({}, '', u.pathname + (u.search || ''));
}

export default function DealsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [connectReady, setConnectReady] = useState<boolean | null>(null);
  const [connectLabel, setConnectLabel] = useState('');
  const [activating, setActivating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [share, setShare] = useState<{
    url: string;
    amount: number;
    buyerName: string;
    whatsappUrl?: string;
    mailtoUrl?: string | null;
  } | null>(null);
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
    insurance: '',
    accessories: '',
    fees: '',
    depositAmount: '500',
    notes: '',
    createAndCharge: true,
  });

  const loadConnect = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/settings/connect', {});
      if (!res.ok) return;
      const d = await res.json();
      setConnectReady(d.ready === true);
      setConnectLabel(d.label || '');
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dealsRes, invRes] = await Promise.all([
        fetchWithAuth('/api/deals', {}),
        fetchWithAuth('/api/vehicles?status=available&limit=100', {}),
        loadConnect(),
      ]);
      if (dealsRes.ok) {
        const d = await dealsRes.json();
        setDeals(d.deals || []);
      }
      if (invRes.ok) {
        const d = await invRes.json();
        setVehicles(d.vehicles || d || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [loadConnect]);

  async function activatePayments(resumeDealId?: string) {
    setActivating(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/settings/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnPath: '/deals',
          resumeDealId: resumeDealId || undefined,
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

  async function createDepositLink(dealId: string): Promise<boolean> {
    setBusyId(dealId);
    setError(null);
    setCopied(false);
    try {
      const res = await fetchWithAuth(`/api/deals/${dealId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear depósito');

      if (data.needsConnect && data.onboardingUrl) {
        setMessage(data.message || 'Activando cobros…');
        window.location.href = data.onboardingUrl;
        return false;
      }

      setShare({
        url: data.url,
        amount: data.amount,
        buyerName: data.buyerName,
        whatsappUrl: data.whatsappUrl,
        mailtoUrl: data.mailtoUrl,
      });
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
    const connect = params.get('connect');
    const resumeDeposit = params.get('resumeDeposit');
    const deposit = params.get('deposit');

    if (deposit === 'success') {
      setMessage('¡Depósito recibido! El vehículo queda reservado. Ya puedes pasar a F&I o crear la venta.');
      cleanUrl();
      void load();
      return;
    }
    if (deposit === 'cancel') {
      setMessage('El comprador canceló el pago. Puedes generar el link de nuevo cuando quieras.');
      cleanUrl();
      return;
    }

    if (connect === 'return' || connect === 'refresh') {
      (async () => {
        setMessage(
          connect === 'refresh'
            ? 'Si no terminaste, vuelve a pulsar “Activar cobros”.'
            : 'Revisando activación de cobros…'
        );
        await loadConnect();
        const st = await fetchWithAuth('/api/settings/connect', {});
        const d = st.ok ? await st.json() : null;
        if (d?.ready) {
          setConnectReady(true);
          setMessage('Cobros activados. Continuamos…');
          if (resumeDeposit) {
            await createDepositLink(resumeDeposit);
          }
        } else if (connect === 'return') {
          setConnectReady(false);
          setMessage(
            'Stripe aún no marcó la cuenta como lista. Completa los pasos pendientes o pulsa “Activar cobros” otra vez.'
          );
        }
        cleanUrl();
        await load();
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
        buyer: {
          fullName: form.buyerName,
          email: form.buyerEmail || undefined,
          phone: form.buyerPhone || undefined,
        },
        vehiclePrice: Number(form.vehiclePrice || 0),
        tradeInValue: form.tradeInValue ? Number(form.tradeInValue) : undefined,
        tablilla: form.tablilla ? Number(form.tablilla) : undefined,
        tax: form.tax ? Number(form.tax) : undefined,
        insurance: form.insurance ? Number(form.insurance) : undefined,
        accessories: form.accessories ? Number(form.accessories) : undefined,
        fees: form.fees ? Number(form.fees) : undefined,
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
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setMessage(
        action === 'convert_sale'
          ? `Venta creada: ${data.sale?.id}`
          : action === 'cancel'
            ? 'Deal cancelado'
            : 'Actualizado'
      );
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function copyShareUrl() {
    if (!share?.url) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
    } catch {
      setError('No se pudo copiar. Selecciona el link manualmente.');
    }
  }

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
            Cotiza → cobra depósito al cliente → reserva el carro → F&I / venta. Todo desde aquí.
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

      {/* Activación de cobros — visible y directa */}
      {connectReady === false && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
          <h2 className="font-semibold text-amber-950 text-lg">Activa cobros una sola vez</h2>
          <p className="text-sm text-amber-900 mt-1 max-w-2xl">
            Para recibir depósitos de clientes, Stripe pide tus datos bancarios{' '}
            <strong>una sola vez</strong> (2 minutos). No tienes que crear productos ni paneles en
            Stripe: solo completar el formulario y vuelves aquí. Luego cobras con un clic.
          </p>
          <button
            type="button"
            disabled={activating}
            onClick={() => activatePayments()}
            className="mt-3 px-5 py-2.5 rounded-lg bg-amber-800 text-white font-medium disabled:opacity-50"
          >
            {activating ? 'Abriendo…' : 'Activar cobros ahora'}
          </button>
          {connectLabel && <p className="text-xs text-amber-800 mt-2">{connectLabel}</p>}
        </div>
      )}

      {connectReady === true && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          Cobros activos — puedes generar links de depósito y enviarlos al comprador.
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

      {/* Modal compartir link */}
      {share && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-xl font-bold">Link de depósito listo</h2>
            <p className="text-sm text-gray-600">
              Envíaselo a <strong>{share.buyerName}</strong> por {money(share.amount)}. Cuando pague,
              el deal se actualiza solo y el vehículo queda reservado.
            </p>
            <div className="bg-gray-50 border rounded-lg p-3 text-xs break-all font-mono">
              {share.url}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyShareUrl}
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
                  Enviar por WhatsApp
                </a>
              )}
              {share.mailtoUrl && (
                <a
                  href={share.mailtoUrl}
                  className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                >
                  Enviar por email
                </a>
              )}
              <a
                href={share.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                Abrir pago
              </a>
            </div>
            <button
              type="button"
              onClick={() => setShare(null)}
              className="text-sm text-gray-500 underline"
            >
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
          <p className="sm:col-span-2 text-sm text-gray-600">
            Completa comprador + vehículo. Si marcas “Generar link al guardar”, el sistema pide el
            depósito al momento (o te lleva a activar cobros si aún no lo hiciste).
          </p>
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
            WhatsApp / teléfono
            <input
              value={form.buyerPhone}
              onChange={(e) => setForm((f) => ({ ...f, buyerPhone: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="787..."
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
            Precio vehículo
            <input
              type="number"
              required
              value={form.vehiclePrice}
              onChange={(e) => setForm((f) => ({ ...f, vehiclePrice: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Trade-in
            <input
              type="number"
              value={form.tradeInValue}
              onChange={(e) => setForm((f) => ({ ...f, tradeInValue: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Tablilla
            <input
              type="number"
              value={form.tablilla}
              onChange={(e) => setForm((f) => ({ ...f, tablilla: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Tax / IVU
            <input
              type="number"
              value={form.tax}
              onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Seguro
            <input
              type="number"
              value={form.insurance}
              onChange={(e) => setForm((f) => ({ ...f, insurance: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Accesorios / fees
            <input
              type="number"
              value={form.accessories || form.fees}
              onChange={(e) =>
                setForm((f) => ({ ...f, accessories: e.target.value, fees: e.target.value }))
              }
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Depósito a cobrar *
            <input
              type="number"
              required
              min={0}
              value={form.depositAmount}
              onChange={(e) => setForm((f) => ({ ...f, depositAmount: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Notas
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2"
              rows={2}
            />
          </label>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.createAndCharge}
              onChange={(e) => setForm((f) => ({ ...f, createAndCharge: e.target.checked }))}
            />
            Al guardar, generar link de depósito y poder enviarlo al cliente
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium">
              Guardar deal
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {deals.length === 0 && (
          <p className="text-gray-500">Aún no hay deals. Crea el primero con el botón de arriba.</p>
        )}
        {deals.map((d) => (
          <div key={d.id} className="bg-white border rounded-lg p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="font-semibold text-lg">{d.buyer?.fullName}</div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium capitalize">{String(d.status).replace(/_/g, ' ')}</span>
                  {' · '}Total {money(d.total)} · Depósito {money(d.depositAmount)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {d.buyer?.phone ? `Tel ${d.buyer.phone} · ` : ''}
                  Vehículo {d.vehicleId}
                  {d.saleId ? ` · Venta ${d.saleId}` : ''}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {d.depositAmount > 0 &&
                  !['won', 'cancelled'].includes(d.status) && (
                    <button
                      type="button"
                      disabled={busyId === d.id}
                      onClick={() => runAction(d.id, 'deposit')}
                      className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white disabled:opacity-50 font-medium"
                    >
                      {['deposit_paid', 'reserved', 'fi_handoff'].includes(d.status)
                        ? 'Reenviar link'
                        : 'Cobrar depósito'}
                    </button>
                  )}
                <Link
                  href={`/fi?dealId=${d.id}`}
                  className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
                >
                  F&I
                </Link>
                {!['won', 'cancelled'].includes(d.status) && (
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => runAction(d.id, 'convert_sale')}
                    className="px-3 py-1.5 text-sm rounded bg-primary-600 text-white disabled:opacity-50"
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
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-gray-500">
        Nota: Stripe exige por ley datos bancarios del negocio para depositar dinero. Nosotros no te
        pedimos crear productos ni dashboards; solo ese formulario de activación y el resto ocurre
        dentro de AutoDealers.
      </p>
    </div>
  );
}
