'use client';

import { useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export type PostSaleDocPayload = {
  vehicleId?: string;
  leadId?: string;
  saleId?: string;
  buyer?: { name?: string; email?: string; phone?: string };
  vehicle?: {
    year?: number | string;
    make?: string;
    model?: string;
    vin?: string;
    stockNumber?: string;
    mileage?: number | string;
  };
  sale?: { price?: number | string; salePrice?: number | string; paymentMethod?: string };
};

const QUICK_TYPES = [
  { type: 'bill_of_sale', label: 'Bill of Sale' },
  { type: 'receipt', label: 'Recibo' },
  { type: 'invoice', label: 'Factura' },
] as const;

/**
 * Acciones rápidas post-venta para generar documentos del tenant.
 */
export default function PostSaleDocumentsPanel({
  payload,
  compact = false,
}: {
  payload: PostSaleDocPayload;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const generate = async (type: string) => {
    setBusy(type);
    setError('');
    setMessage('');
    try {
      const res = await fetchWithAuth('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          vehicleId: payload.vehicleId,
          leadId: payload.leadId,
          saleId: payload.saleId,
          payload: {
            buyer: payload.buyer,
            vehicle: payload.vehicle,
            sale: {
              price: payload.sale?.salePrice ?? payload.sale?.price,
              paymentMethod: payload.sale?.paymentMethod,
            },
            parties: {
              buyerName: payload.buyer?.name,
              buyerEmail: payload.buyer?.email,
              buyerPhone: payload.buyer?.phone,
            },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar');
      const url = data.document?.pdfUrl as string | undefined;
      setMessage(`${data.document?.name || type} generado`);
      if (url) window.open(url, '_blank');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={compact ? 'mt-3 pt-3 border-t border-slate-200' : 'mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200'}>
      <p className="text-sm font-semibold text-slate-900 mb-1">Documentos de la venta</p>
      <p className="text-xs text-slate-600 mb-3">
        Genera Bill of Sale, recibo o factura ahora, o abre la biblioteca completa.
      </p>
      <div className="flex flex-wrap gap-2">
        {QUICK_TYPES.map((t) => (
          <button
            key={t.type}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void generate(t.type)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50"
          >
            {busy === t.type ? 'Generando…' : t.label}
          </button>
        ))}
        <Link
          href="/documents"
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800"
        >
          Ver todos
        </Link>
      </div>
      {message ? <p className="mt-2 text-xs text-green-700">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
