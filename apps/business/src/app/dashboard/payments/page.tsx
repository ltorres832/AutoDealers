'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

const STATUS_STYLES: Record<string, string> = {
  no_solicitado: 'bg-slate-100 text-slate-700',
  pendiente: 'bg-amber-100 text-amber-800',
  aprobado: 'bg-sky-100 text-sky-800',
  rechazado: 'bg-red-100 text-red-800',
  activo: 'bg-emerald-100 text-emerald-800',
  suspendido: 'bg-orange-100 text-orange-800',
};

function formatWhen(value?: string | Date | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-PR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function BusinessPaymentsPage() {
  const [data, setData] = useState<any>(null);
  const [accepted, setAccepted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/business/payments');
    const json = await res.json();
    setData(json);
  }
  useEffect(() => {
    void load();
  }, []);

  async function submitAcceptance(kind: 'apply' | 'accept_only') {
    setBusy(true);
    setError('');
    setMessage('');
    setConfirmOpen(false);
    const res = await fetch('/api/business/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        kind === 'accept_only'
          ? { action: 'accept_agreement' }
          : { acceptAgreement: true }
      ),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'No se pudo registrar el acuerdo');
    } else {
      setMessage(
        kind === 'accept_only'
          ? 'Acuerdo aceptado. El administrador ya puede ver la fecha, la versión y las tarifas.'
          : 'Solicitud enviada. Un administrador revisa el acuerdo aceptado y activa los cobros.'
      );
      setAccepted(false);
    }
    setBusy(false);
    void load();
  }

  async function startConnect() {
    setBusy(true);
    setError('');
    const res = await fetch('/api/business/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'connect' }),
    });
    const json = await res.json();
    if (!res.ok || !json.url) {
      setError(json.error || 'No se pudo abrir Stripe Connect');
      setBusy(false);
      return;
    }
    window.location.href = json.url;
  }

  const displayStatus = data?.displayStatus || 'no_solicitado';
  const canApply = displayStatus === 'no_solicitado' || displayStatus === 'rechazado';
  const canAcceptExisting = Boolean(data?.application && !data?.agreementAccepted);
  const showAcceptForm = canApply || canAcceptExisting;
  const canConnect = displayStatus === 'aprobado' || (displayStatus === 'activo' && !data?.connect?.ready);
  const isActive = Boolean(data?.canCollectOnInvoices);
  const platformMethods = Array.isArray(data?.platformMethods) ? data.platformMethods : [];
  const feeLabels = data?.feeLabels || { card: '3.5%', klarna: '10%', affirm: '10%' };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-black mb-2">Cobros AutoDealers</h1>
      <p className="text-slate-600 mb-6">
        Servicio opcional para cobrar facturas en la plataforma. No es obligatorio para enviar estimados ni facturas por correo.
      </p>

      <div className="bg-white rounded-2xl border p-5 mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_STYLES[displayStatus] || STATUS_STYLES.no_solicitado}`}>
            {data?.displayLabel || 'No solicitado'}
          </span>
          {data?.agreementAccepted ? (
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800">
              Acuerdo aceptado
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-800">
              Acuerdo no aceptado
            </span>
          )}
        </div>
        {data?.application?.businessName ? (
          <p className="text-sm text-slate-600">Solicitud de {data.application.businessName}</p>
        ) : null}
        {data?.agreementAccepted ? (
          <p className="text-sm text-slate-600 mt-1">
            Aceptaste la versión {data.application?.agreementVersion || data.agreement?.version}
            {data.application?.acceptedAt || data.application?.agreementAcceptedAt
              ? ` el ${formatWhen(data.application.acceptedAt || data.application.agreementAcceptedAt)}`
              : ''}
            .
          </p>
        ) : null}
      </div>

      <div className="bg-white rounded-2xl border p-5 mb-6">
        <h2 className="text-xl font-bold mb-1">Métodos de la plataforma</h2>
        <p className="text-sm text-slate-600 mb-4">
          Estos métodos y tarifas son los de AutoDealers Payments. El cliente los ve en <code>/pay/…</code> solo cuando tus cobros estén activos.
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          {platformMethods.length
            ? platformMethods.map((method: any) => (
                <div key={method.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-lg font-black">{method.label}</div>
                  <div className="text-2xl font-black text-primary-700 my-1">{method.feeLabel}</div>
                  <p className="text-xs text-slate-600">Comisión de plataforma. El cliente paga el total; tú recibes el neto.</p>
                  <p className="text-xs font-semibold mt-2">
                    {method.customerEligible
                      ? 'Disponible ahora en el enlace de pago del cliente.'
                      : 'Método de la plataforma. El cliente lo verá cuando los cobros estén activos.'}
                  </p>
                </div>
              ))
            : (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-lg font-black">Tarjeta</div>
                  <div className="text-2xl font-black text-primary-700 my-1">{feeLabels.card}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-lg font-black">Klarna</div>
                  <div className="text-2xl font-black text-primary-700 my-1">{feeLabels.klarna}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-lg font-black">Affirm</div>
                  <div className="text-2xl font-black text-primary-700 my-1">{feeLabels.affirm}</div>
                </div>
              </>
            )}
        </div>
        <p className="text-xs text-slate-500 mt-3">Los movimientos del libro mayor se guardan en centavos.</p>
      </div>

      <div className="bg-white rounded-2xl border p-5 mb-6">
        <h2 className="text-xl font-bold mb-2">{data?.agreement?.title || 'Acuerdo de AutoDealers Payments'}</h2>
        <p className="text-xs text-slate-500 mb-2">Versión {data?.agreement?.version || '—'}</p>
        <div className="whitespace-pre-wrap text-sm text-slate-700 leading-6 max-h-80 overflow-y-auto border rounded-xl p-4 bg-slate-50">
          {data?.agreement?.text || 'Cargando acuerdo…'}
        </div>
      </div>

      {showAcceptForm ? (
        <div className="bg-white rounded-2xl border p-5 mb-6">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1"
            />
            <span>
              He leído el acuerdo y las tarifas. Acepto AutoDealers Payments (tarjeta {feeLabels.card}, Klarna {feeLabels.klarna} y Affirm {feeLabels.affirm}).
            </span>
          </label>
          <button
            type="button"
            disabled={busy || !accepted}
            onClick={() => setConfirmOpen(true)}
            className="mt-4 px-5 py-2 bg-primary-600 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {canApply ? 'Solicitar cobros' : 'Aceptar acuerdo ahora'}
          </button>
        </div>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2">Confirmar aceptación</h3>
            <p className="text-sm text-slate-700 mb-4">
              Vas a aceptar el acuerdo versión {data?.agreement?.version}. Tarifas: tarjeta {feeLabels.card}, Klarna {feeLabels.klarna}, Affirm {feeLabels.affirm}.
              {canApply ? ' Luego un administrador revisa tu solicitud.' : ' Quedará registrado para el administrador.'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitAcceptance(canApply ? 'apply' : 'accept_only')}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {busy ? 'Guardando…' : 'Sí, acepto'}
              </button>
              <button type="button" className="px-4 py-2 border rounded-xl" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {canConnect ? (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 mb-6">
          <h2 className="font-bold mb-2">Activa Stripe Connect</h2>
          <p className="text-sm text-slate-700 mb-3">
            Tu solicitud fue aprobada. Completa el onboarding de Stripe para recibir los depósitos en tu cuenta.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void startConnect()}
            className="px-5 py-2 bg-primary-600 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {busy ? 'Abriendo Stripe…' : 'Activar cuenta Stripe'}
          </button>
        </div>
      ) : null}

      {isActive ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">
          <h2 className="font-bold mb-2">Cómo cobrar una factura</h2>
          <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
            <li>Crea o abre la factura en <Link className="text-primary-700 font-semibold" href="/dashboard/invoices">Facturas</Link>.</li>
            <li>Pulsa <strong>Enviar por correo</strong>. El cliente recibe el documento y un botón <strong>Pagar</strong>.</li>
            <li>
              El enlace público es <code>/pay/…</code> y muestra
              {data?.bnpl?.available ? ' tarjeta, Klarna y Affirm, según lo que elija el cliente.' : ' los métodos activos para este negocio.'}
            </li>
          </ol>
        </div>
      ) : (
        <div className="bg-slate-50 border rounded-2xl p-5 mb-6 text-sm text-slate-700">
          Mientras los cobros no estén activos puedes enviar estimados y facturas por correo como documento, sin botón de pago en línea.
          Klarna y Affirm ya están listados arriba como métodos de la plataforma; el cliente no los ve todavía.
        </div>
      )}

      {error ? <p className="text-red-600 text-sm mb-4">{error}</p> : null}
      {message ? <p className="text-emerald-700 text-sm mb-4">{message}</p> : null}

      <h2 className="text-xl font-bold mb-3">Movimientos</h2>
      {(data?.ledger || []).length === 0 ? (
        <p className="text-slate-500">No hay movimientos. El ledger guarda montos en centavos.</p>
      ) : (
        <ul className="bg-white rounded-2xl border divide-y">
          {(data.ledger || []).map((row: any) => (
            <li key={row.id} className="p-4 flex justify-between text-sm">
              <span>{row.type} · {row.method === 'klarna' ? 'Klarna' : row.method === 'affirm' ? 'Affirm' : 'tarjeta'}</span>
              <span>{row.netCents} centavos netos</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  );
}
