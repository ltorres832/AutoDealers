'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import LandingFooter from '@/components/LandingFooter';

export default function PayLinkPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const paid = searchParams.get('paid') === '1';
  const cancelled = searchParams.get('cancelled') === '1';

  useEffect(() => {
    fetch(`/api/public/pay/${encodeURIComponent(String(params.token))}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No encontrado');
        setData(json);
      })
      .catch((err) => setError(err.message));
  }, [params.token]);

  async function startPay(method: 'card' | 'klarna' | 'affirm') {
    setPaying(true);
    setError('');
    const res = await fetch(`/api/public/pay/${encodeURIComponent(String(params.token))}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method }),
    });
    const json = await res.json();
    if (!res.ok || !json.url) {
      setError(json.error || 'No se pudo iniciar el pago');
      setPaying(false);
      return;
    }
    window.location.href = json.url;
  }

  const amount = data?.link?.amountCents != null ? (data.link.amountCents / 100).toFixed(2) : null;
  const methods = data?.methods || {};
  const canPay = data?.link?.status === 'open' && Boolean(methods.card || methods.klarna || methods.affirm);
  const methodLabels = [
    methods.card ? 'tarjeta' : null,
    methods.klarna ? 'Klarna' : null,
    methods.affirm ? 'Affirm' : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicMarketingNav backHref="/" />
      <main className="max-w-lg mx-auto px-4 py-16">
        <h1 className="text-3xl font-black mb-4">Pagar factura</h1>
        {paid ? <p className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800">Pago recibido. Gracias.</p> : null}
        {cancelled ? <p className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800">Pago cancelado. Puedes intentarlo de nuevo.</p> : null}
        {error ? <p className="text-red-600 mb-4">{error}</p> : null}
        {data ? (
          <div className="bg-white rounded-2xl border p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white border flex items-center justify-center">
                {data.business?.logoUrl ? (
                  <img src={data.business.logoUrl} alt={data.business.name || 'Negocio'} className="absolute inset-0 h-full w-full object-contain" />
                ) : (
                  <span className="text-xl text-slate-400">
                    {String(data.business?.name || 'N').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="font-bold">{data.business?.name || 'Negocio'}</p>
            </div>
            <p>{data.link.description}</p>
            <p className="text-3xl font-black">${amount}</p>
            {data.link.status === 'paid' || paid ? (
              <p className="text-slate-500">Esta factura ya fue pagada.</p>
            ) : data.link.status !== 'open' ? (
              <p className="text-slate-500">Este enlace ya no está disponible.</p>
            ) : canPay ? (
              <div className="space-y-2">
                {methodLabels.length ? (
                  <p className="text-sm text-slate-600">
                    Métodos disponibles: {methodLabels.join(', ').replace(/, ([^,]*)$/, ' o $1')}.
                  </p>
                ) : null}
                {methods.card ? (
                  <button
                    type="button"
                    disabled={paying}
                    onClick={() => void startPay('card')}
                    className="w-full rounded-xl bg-primary-600 text-white font-bold py-3 disabled:opacity-50"
                  >
                    {paying ? 'Abriendo Stripe…' : 'Pagar con tarjeta'}
                  </button>
                ) : null}
                {methods.klarna ? (
                  <button
                    type="button"
                    disabled={paying}
                    onClick={() => void startPay('klarna')}
                    className="w-full rounded-xl border-2 border-slate-900 text-slate-900 font-bold py-3 disabled:opacity-50"
                  >
                    {paying ? 'Abriendo Stripe…' : 'Pagar con Klarna'}
                  </button>
                ) : null}
                {methods.affirm ? (
                  <button
                    type="button"
                    disabled={paying}
                    onClick={() => void startPay('affirm')}
                    className="w-full rounded-xl border-2 border-slate-900 text-slate-900 font-bold py-3 disabled:opacity-50"
                  >
                    {paying ? 'Abriendo Stripe…' : 'Pagar con Affirm'}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Este negocio todavía no tiene cobros en línea activos. Coordina el pago directamente con el negocio.
              </p>
            )}
          </div>
        ) : null}
      </main>
      <LandingFooter />
    </div>
  );
}
