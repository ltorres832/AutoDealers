'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { DmsFeatureGate } from '@/components/DmsFeatureGate';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  open: 'Enviada',
  partial: 'Parcial',
  paid: 'Pagada',
  void: 'Anulada',
};

function InvoicesInner() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [pay, setPay] = useState({ invoiceId: '', amount: '', method: 'cash' });
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    description: '',
    itemName: 'Servicio',
    itemAmount: '',
    tax: '0',
  });

  async function load() {
    const res = await fetchWithAuth('/api/finance?view=invoices', {});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setRows(data.invoices || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.itemAmount || 0);
    const tax = Number(form.tax || 0);
    const res = await fetchWithAuth('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        description: form.description || form.itemName,
        items: [{ name: form.itemName, qty: 1, unitPrice: amount, amount, kind: 'other' }],
        subtotal: amount,
        tax,
        total: amount + tax,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setShow(false);
    setForm({ customerName: '', customerEmail: '', customerPhone: '', description: '', itemName: 'Servicio', itemAmount: '', tax: '0' });
    await load();
  }

  async function action(body: Record<string, unknown>) {
    const res = await fetchWithAuth('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    await load();
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Facturas</h1>
          <p className="text-gray-600 mt-1">Número, cliente, líneas, impuesto, cobros y saldo. Usa la misma cartera AR del taller.</p>
        </div>
        <button type="button" onClick={() => setShow((v) => !v)} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm">
          {show ? 'Cerrar' : '+ Nueva factura'}
        </button>
      </div>
      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {show && (
        <form onSubmit={create} className="bg-white border rounded-lg p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">Cliente *<input required className="mt-1 w-full border rounded px-3 py-2" value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} /></label>
          <label className="text-sm">Teléfono<input className="mt-1 w-full border rounded px-3 py-2" value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} /></label>
          <label className="text-sm">Email<input className="mt-1 w-full border rounded px-3 py-2" value={form.customerEmail} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} /></label>
          <label className="text-sm">Concepto<input className="mt-1 w-full border rounded px-3 py-2" value={form.itemName} onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} /></label>
          <label className="text-sm">Monto $<input required type="number" step="0.01" className="mt-1 w-full border rounded px-3 py-2" value={form.itemAmount} onChange={(e) => setForm((f) => ({ ...f, itemAmount: e.target.value }))} /></label>
          <label className="text-sm">Impuesto $<input type="number" step="0.01" className="mt-1 w-full border rounded px-3 py-2" value={form.tax} onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))} /></label>
          <label className="text-sm sm:col-span-2">Notas / descripción<textarea className="mt-1 w-full border rounded px-3 py-2" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
          <div className="sm:col-span-2"><button className="bg-primary-600 text-white px-4 py-2 rounded-lg">Crear factura</button></div>
        </form>
      )}

      <form
        className="bg-white border rounded-lg p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void action({ action: 'payment', invoiceId: pay.invoiceId, amount: Number(pay.amount), method: pay.method });
        }}
      >
        <select className="border rounded px-3 py-2 text-sm" value={pay.invoiceId} onChange={(e) => setPay((p) => ({ ...p, invoiceId: e.target.value }))} required>
          <option value="">Factura a cobrar…</option>
          {rows.filter((i) => i.status === 'open' || i.status === 'partial' || i.status === 'draft').map((i) => (
            <option key={i.id} value={i.id}>{i.number} · saldo ${Number(i.balance).toFixed(2)}</option>
          ))}
        </select>
        <input className="border rounded px-3 py-2 text-sm" type="number" step="0.01" placeholder="Monto" value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} />
        <select className="border rounded px-3 py-2 text-sm" value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="ach">ACH</option>
          <option value="other">Otro</option>
        </select>
        <button className="px-3 py-2 rounded bg-gray-900 text-white text-sm">Registrar cobro</button>
      </form>

      <div className="space-y-3">
        {rows.length === 0 && <p className="text-gray-500">No hay facturas. Créalas aquí o desde una RO / estimado.</p>}
        {rows.map((inv) => (
          <div key={inv.id} className="bg-white border rounded-lg p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="font-semibold">{inv.number} · {inv.customerName}</div>
                <div className="text-sm text-gray-600">
                  {STATUS_LABEL[inv.status] || inv.status} · Total ${Number(inv.total || 0).toFixed(2)} · Saldo ${Number(inv.balance || 0).toFixed(2)}
                  {inv.source === 'repair_order' ? ' · Desde RO' : ''}
                  {inv.source === 'estimate' ? ' · Desde estimado' : ''}
                </div>
                {inv.description ? <p className="text-xs text-gray-500 mt-1">{inv.description}</p> : null}
                {(inv.items || []).length > 0 && (
                  <ul className="text-xs text-gray-600 mt-2">
                    {inv.items.map((it: any, idx: number) => (
                      <li key={idx}>{it.name} · {it.qty} × ${Number(it.unitPrice || 0).toFixed(2)}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {inv.status === 'draft' && (
                  <button type="button" className="px-3 py-1.5 text-sm border rounded" onClick={() => void action({ action: 'send', invoiceId: inv.id })}>Marcar enviada</button>
                )}
                {inv.status !== 'void' && inv.status !== 'paid' && (
                  <button type="button" className="px-3 py-1.5 text-sm border rounded text-red-700" onClick={() => void action({ action: 'void', invoiceId: inv.id })}>Anular</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-gray-500">
        Caja y estado de cuenta siguen en <Link className="text-primary-600" href="/finance">Finanzas</Link>.
      </p>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <DmsFeatureGate featureKey="dms_finance">
      <InvoicesInner />
    </DmsFeatureGate>
  );
}
