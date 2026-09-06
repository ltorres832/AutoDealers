'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

const STATUSES = [
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviada' },
  { value: 'paid', label: 'Pagada' },
  { value: 'void', label: 'Anulada' },
];

type Line = { name: string; qty: number; unitCents: number };

const emptyForm = {
  id: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  notes: '',
  tax: '0',
  status: 'draft',
  items: [{ name: 'Servicio', qty: 1, unitCents: 0 }] as Line[],
};

function money(cents: number) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

export default function BusinessInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [paymentsActive, setPaymentsActive] = useState(false);
  const [payMethodsLabel, setPayMethodsLabel] = useState('');
  const [platformMethods, setPlatformMethods] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState('');

  async function load() {
    const res = await fetch('/api/business/invoices');
    const data = await res.json();
    setInvoices(data.invoices || []);
    setPaymentsActive(Boolean(data.paymentsActive));
    setPayMethodsLabel(String(data.payMethodsLabel || ''));
    setPlatformMethods(Array.isArray(data.platformMethods) ? data.platformMethods : []);
  }
  useEffect(() => {
    void load();
  }, []);

  function setItem(index: number, patch: Partial<Line>) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  async function save(e: FormEvent, extra?: Record<string, unknown>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/business/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id || undefined,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail,
          taxCents: Math.round(Number(form.tax || 0) * 100),
          status: extra?.status || form.status,
          paidCents: extra?.paidCents,
          items: form.items.map((item) => ({
            name: item.name,
            qty: item.qty,
            unitCents: item.unitCents,
            totalCents: item.qty * item.unitCents,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function patchInvoice(item: any, patch: Record<string, unknown>) {
    const res = await fetch('/api/business/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        estimateId: item.estimateId,
        customerName: item.customerName,
        customerPhone: item.customerPhone,
        customerEmail: item.customerEmail,
        items: item.items,
        taxCents: item.taxCents,
        paidCents: patch.paidCents ?? item.paidCents,
        status: patch.status || item.status,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No se pudo actualizar');
      return;
    }
    await load();
  }

  async function sendEmail(item: any) {
    if (!item.customerEmail) {
      setError('Agrega el email del cliente a la factura antes de enviarla.');
      return;
    }
    setSendingId(item.id);
    setError('');
    setInfo('');
    const res = await fetch('/api/business/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_email', id: item.id }),
    });
    const data = await res.json();
    setSendingId('');
    if (!res.ok) {
      setError(data.error || 'No se pudo enviar el correo');
      return;
    }
    const methods = data.payMethodsLabel || payMethodsLabel;
    setInfo(
      data.payUrl
        ? `Factura enviada a ${data.to}. El cliente podrá pagar con ${methods || 'tarjeta'} en el enlace de pago.`
        : `Factura enviada a ${data.to} como documento. Puedes enviarla ahora, pero las opciones de pago no aparecerán hasta que los cobros estén activos.`
    );
    await load();
  }

  function edit(item: any) {
    setForm({
      id: item.id,
      customerName: item.customerName || '',
      customerPhone: item.customerPhone || '',
      customerEmail: item.customerEmail || '',
      notes: '',
      tax: item.taxCents ? String(item.taxCents / 100) : '0',
      status: item.status || 'draft',
      items: (item.items || []).map((line: any) => ({
        name: line.name,
        qty: line.qty || 1,
        unitCents: line.unitCents || 0,
      })),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const subtotal = form.items.reduce((sum, item) => sum + item.qty * item.unitCents, 0);

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-black mb-2">Facturas</h1>
      <p className="text-slate-600 mb-6">Crea la factura, pulsa Enviar por correo y el cliente abre el enlace de pago.</p>
      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-semibold mb-1">Cómo cobra el cliente</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Pon el email del cliente en la factura.</li>
          <li>Pulsa <strong>Enviar por correo</strong>.</li>
          <li>El cliente recibe el documento y, si los cobros están activos, un botón <strong>Pagar</strong> hacia <code>/pay/…</code>.</li>
        </ol>
        {paymentsActive ? (
          <p className="mt-2">
            Cobros activos. El cliente podrá pagar con {payMethodsLabel || 'tarjeta'}.
            {platformMethods.some((method) => method.key !== 'card' && method.flagEnabled)
              ? ' Klarna y Affirm aparecen solo si están habilitados para este negocio.'
              : ''}
          </p>
        ) : (
          <p className="mt-2">
            Puedes enviar la factura ahora como documento. Las opciones de pago (tarjeta, Klarna, Affirm) no aparecerán hasta que los cobros estén activos.{' '}
            <Link className="font-semibold text-primary-700" href="/dashboard/payments">Ir a Cobros AutoDealers</Link>
          </p>
        )}
      </div>
      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}
      {info ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">{info}</div> : null}

      <form onSubmit={(e) => void save(e)} className="bg-white rounded-2xl border p-5 mb-6 grid md:grid-cols-2 gap-3">
        <input required className="border rounded-xl px-3 py-2" placeholder="Cliente *" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
        <input className="border rounded-xl px-3 py-2" placeholder="Teléfono" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
        <input className="border rounded-xl px-3 py-2" placeholder="Email del cliente (requerido para enviar)" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
        <input className="border rounded-xl px-3 py-2" placeholder="Impuesto USD" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
        <select className="border rounded-xl px-3 py-2 md:col-span-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <div className="md:col-span-2 space-y-2">
          <p className="text-sm font-semibold">Conceptos</p>
          {form.items.map((item, index) => (
            <div key={index} className="grid md:grid-cols-12 gap-2">
              <input className="border rounded-xl px-3 py-2 md:col-span-6" placeholder="Concepto" value={item.name} onChange={(e) => setItem(index, { name: e.target.value })} />
              <input type="number" min={1} className="border rounded-xl px-3 py-2 md:col-span-2" value={item.qty} onChange={(e) => setItem(index, { qty: Number(e.target.value) || 1 })} />
              <input className="border rounded-xl px-3 py-2 md:col-span-3" placeholder="Precio USD" value={item.unitCents ? String(item.unitCents / 100) : ''} onChange={(e) => setItem(index, { unitCents: Math.round(Number(e.target.value || 0) * 100) })} />
              <button type="button" className="border rounded-xl md:col-span-1" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}>×</button>
            </div>
          ))}
          <button type="button" className="text-sm font-semibold text-primary-700" onClick={() => setForm({ ...form, items: [...form.items, { name: '', qty: 1, unitCents: 0 }] })}>
            + Agregar concepto
          </button>
          <p className="text-sm text-slate-600">Subtotal {money(subtotal)}</p>
        </div>

        <div className="md:col-span-2 flex gap-3">
          <button disabled={saving} className="bg-primary-600 text-white rounded-xl px-5 py-2 font-bold disabled:opacity-50">
            {saving ? 'Guardando…' : form.id ? 'Actualizar factura' : 'Crear factura'}
          </button>
          {form.id ? <button type="button" className="border rounded-xl px-5 py-2" onClick={() => setForm(emptyForm)}>Cancelar</button> : null}
        </div>
      </form>

      {invoices.length === 0 ? (
        <p className="text-slate-500">No hay facturas. Crea una o conviértela desde un estimado. Luego envíala por correo al cliente.</p>
      ) : (
        <ul className="space-y-3">
          {invoices.map((item) => (
            <li key={item.id} className="bg-white rounded-2xl border p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <div className="font-bold">{item.customerName} · {STATUSES.find((s) => s.value === item.status)?.label || item.status}</div>
                  <div className="text-sm text-slate-500">
                    {money(item.totalCents || 0)}
                    {item.paidCents ? ` · pagado ${money(item.paidCents)}` : ''}
                    {item.customerPhone ? ` · ${item.customerPhone}` : ''}
                    {item.estimateId ? ' · desde estimado' : ''}
                    {item.lastEmailedAt ? ' · enviada por correo' : ''}
                  </div>
                  {!paymentsActive && item.status !== 'paid' ? (
                    <p className="text-xs text-slate-500 mt-1">Pago en plataforma no activo. Solicita cobros para habilitar el botón Pagar.</p>
                  ) : null}
                  <ul className="text-sm mt-2 text-slate-600">
                    {(item.items || []).map((line: any, i: number) => (
                      <li key={i}>{line.name}: {line.qty} × {money(line.unitCents)}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2 h-fit">
                  <select value={item.status} onChange={(e) => void patchInvoice(item, { status: e.target.value })} className="border rounded-xl px-3 py-2 text-sm">
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <button type="button" className="px-3 py-2 text-sm border rounded-xl" onClick={() => edit(item)}>Editar</button>
                  <button
                    type="button"
                    disabled={sendingId === item.id || !item.customerEmail}
                    title={!item.customerEmail ? 'Agrega el email del cliente para enviarla' : 'Enviar factura por correo'}
                    className="px-3 py-2 text-sm rounded-xl bg-primary-600 text-white font-semibold disabled:opacity-50"
                    onClick={() => void sendEmail(item)}
                  >
                    {sendingId === item.id ? 'Enviando…' : 'Enviar por correo'}
                  </button>
                  {item.status !== 'paid' ? (
                    <button
                      type="button"
                      className="px-3 py-2 text-sm rounded-xl bg-primary-600 text-white"
                      onClick={() => void patchInvoice(item, { status: 'paid', paidCents: item.totalCents })}
                    >
                      Marcar pagada
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  );
}
