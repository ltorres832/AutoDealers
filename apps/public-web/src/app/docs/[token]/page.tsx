'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import LandingFooter from '@/components/LandingFooter';

function money(cents: number) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

export default function BusinessDocumentPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/public/docs/${encodeURIComponent(String(params.token))}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No encontrado');
        setData(json);
      })
      .catch((err) => setError(err.message));
  }, [params.token]);

  const doc = data?.document;
  const isEstimate = data?.type === 'estimate';

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicMarketingNav backHref="/" />
      <main className="max-w-lg mx-auto px-4 py-16">
        <h1 className="text-3xl font-black mb-2">{isEstimate ? 'Estimado' : 'Factura'}</h1>
        {isEstimate ? (
          <p className="text-slate-600 mb-6">Este documento es un estimado. No es un cobro y no se realiza ningún cargo.</p>
        ) : (
          <p className="text-slate-600 mb-6">Documento de factura. Si el negocio tiene cobros activos, el enlace de pago llega por correo.</p>
        )}
        {error ? <p className="text-red-600">{error}</p> : null}
        {doc ? (
          <div className="bg-white rounded-2xl border p-6 space-y-3">
            <p className="font-bold">{data.business?.name || 'Negocio'}</p>
            <p className="text-sm text-slate-600">Cliente: {doc.customerName}</p>
            {doc.vehicleLabel ? <p className="text-sm text-slate-600">Vehículo: {doc.vehicleLabel}</p> : null}
            <ul className="text-sm text-slate-700 space-y-1">
              {(doc.items || []).map((item: any, i: number) => (
                <li key={i}>{item.name}: {item.qty} × {money(item.unitCents)}</li>
              ))}
            </ul>
            <p>Subtotal {money(doc.subtotalCents || 0)}</p>
            <p>Impuesto {money(doc.taxCents || 0)}</p>
            <p className="text-2xl font-black">Total {money(doc.totalCents || 0)}</p>
            {doc.notes ? <p className="text-sm text-slate-500">{doc.notes}</p> : null}
          </div>
        ) : null}
      </main>
      <LandingFooter />
    </div>
  );
}
