'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { DmsFeatureGate } from '@/components/DmsFeatureGate';

const STATUSES = [
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviado' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'rejected', label: 'Rechazado' },
];

function EstimatesInner() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [laborDesc, setLaborDesc] = useState('');
  const [laborHours, setLaborHours] = useState('1');
  const [laborRate, setLaborRate] = useState('75');
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partPrice, setPartPrice] = useState('');
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    vehicleLabel: '',
    plate: '',
    vin: '',
    tax: '0',
    notes: '',
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/service/estimates', {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setRows(data.estimates || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetchWithAuth('/api/service/estimates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tax: Number(form.tax || 0) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setShow(false);
    setForm({ customerName: '', customerPhone: '', customerEmail: '', vehicleLabel: '', plate: '', vin: '', tax: '0', notes: '' });
    await load();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetchWithAuth(`/api/service/estimates/${id}`, {
      method: 'PATCH',
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

  async function printEst(id: string) {
    const [res, brandingRes] = await Promise.all([
      fetchWithAuth(`/api/service/estimates/${id}?format=text`, {}),
      fetchWithAuth('/api/settings/branding', {}),
    ]);
    if (!res.ok) return;
    const text = await res.text();
    const branding = brandingRes.ok ? await brandingRes.json().catch(() => ({})) : {};
    const logo = branding.logo || branding.logoUrl || '';
    const w = window.open('', '_blank');
    if (!w) return;
    const safe = text.replace(/</g, '&lt;');
    w.document.write(`<div style="padding:24px;font-family:sans-serif">${logo ? `<img src="${String(logo).replace(/"/g, '')}" alt="Perfil" style="height:64px;margin-bottom:16px;object-fit:contain" />` : ''}<pre style="white-space:pre-wrap;font-family:monospace">${safe}</pre></div><script>window.onload=function(){window.print()}</script>`);
    w.document.close();
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Estimados</h1>
          <p className="text-gray-600 mt-1">Labor, piezas, impuesto y conversión a RO o factura.</p>
        </div>
        <button type="button" onClick={() => setShow((v) => !v)} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm">
          {show ? 'Cerrar' : '+ Nuevo estimado'}
        </button>
      </div>
      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {show && (
        <form onSubmit={create} className="bg-white border rounded-lg p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">Cliente *<input required className="mt-1 w-full border rounded px-3 py-2" value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} /></label>
          <label className="text-sm">Teléfono<input className="mt-1 w-full border rounded px-3 py-2" value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} /></label>
          <label className="text-sm">Email<input className="mt-1 w-full border rounded px-3 py-2" value={form.customerEmail} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} /></label>
          <label className="text-sm">Vehículo<input className="mt-1 w-full border rounded px-3 py-2" value={form.vehicleLabel} onChange={(e) => setForm((f) => ({ ...f, vehicleLabel: e.target.value }))} /></label>
          <label className="text-sm">Tablilla<input className="mt-1 w-full border rounded px-3 py-2" value={form.plate} onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))} /></label>
          <label className="text-sm">VIN<input className="mt-1 w-full border rounded px-3 py-2" value={form.vin} onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))} /></label>
          <label className="text-sm">Impuesto $<input type="number" step="0.01" className="mt-1 w-full border rounded px-3 py-2" value={form.tax} onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))} /></label>
          <label className="text-sm sm:col-span-2">Notas<textarea className="mt-1 w-full border rounded px-3 py-2" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
          <div className="sm:col-span-2"><button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg">Crear estimado</button></div>
        </form>
      )}

      <div className="space-y-3">
        {rows.length === 0 && <p className="text-gray-500">No hay estimados. Crea el primero para cotizar labor y piezas.</p>}
        {rows.map((e) => (
          <div key={e.id} className="bg-white border rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="font-semibold">{e.number} · {e.customerName}</div>
                <div className="text-sm text-gray-600">
                  {e.vehicleLabel || 'Sin vehículo'} · Total ${Number(e.total || 0).toFixed(2)}
                  {e.repairOrderId ? ` · RO ${e.repairOrderId.slice(0, 6)}` : ''}
                  {e.invoiceId ? ` · Factura creada` : ''}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <select value={e.status} onChange={(ev) => void patch(e.id, { status: ev.target.value })} className="border rounded px-2 py-1 text-sm">
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <button type="button" className="px-3 py-1.5 text-sm border rounded" onClick={() => setEditing(editing === e.id ? null : e.id)}>
                  {editing === e.id ? 'Cerrar' : 'Líneas'}
                </button>
                <button type="button" className="px-3 py-1.5 text-sm border rounded" onClick={() => void printEst(e.id)}>Imprimir</button>
                <button type="button" className="px-3 py-1.5 text-sm border rounded" onClick={() => void patch(e.id, { action: 'to_ro' })}>A RO</button>
                <button type="button" className="px-3 py-1.5 text-sm rounded bg-primary-600 text-white" onClick={() => void patch(e.id, { action: 'to_invoice' })}>A factura</button>
              </div>
            </div>
            {editing === e.id && (
              <div className="border-t pt-3 space-y-3">
                <ul className="text-sm space-y-1">
                  {(e.labor || []).map((l: any) => <li key={l.id}>{l.description}: {l.hours}h × ${Number(l.rate).toFixed(2)} = ${Number(l.amount).toFixed(2)}</li>)}
                  {(e.parts || []).map((p: any) => <li key={p.id}>{p.description}: {p.qty} × ${Number(p.unitPrice).toFixed(2)}</li>)}
                </ul>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input className="border rounded px-2 py-1.5 text-sm md:col-span-2" placeholder="Labor" value={laborDesc} onChange={(ev) => setLaborDesc(ev.target.value)} />
                  <input className="border rounded px-2 py-1.5 text-sm" type="number" step="0.25" value={laborHours} onChange={(ev) => setLaborHours(ev.target.value)} />
                  <input className="border rounded px-2 py-1.5 text-sm" type="number" step="0.01" value={laborRate} onChange={(ev) => setLaborRate(ev.target.value)} />
                  <button type="button" className="md:col-span-4 text-sm px-3 py-1.5 rounded bg-gray-900 text-white" onClick={() => {
                    const hours = Number(laborHours || 0);
                    const rate = Number(laborRate || 0);
                    void patch(e.id, { labor: [...(e.labor || []), { id: `lab_${Date.now()}`, description: laborDesc, hours, rate, amount: hours * rate }] });
                    setLaborDesc('');
                  }}>Agregar labor</button>
                  <input className="border rounded px-2 py-1.5 text-sm md:col-span-2" placeholder="Pieza" value={partName} onChange={(ev) => setPartName(ev.target.value)} />
                  <input className="border rounded px-2 py-1.5 text-sm" type="number" value={partQty} onChange={(ev) => setPartQty(ev.target.value)} />
                  <input className="border rounded px-2 py-1.5 text-sm" type="number" step="0.01" placeholder="$" value={partPrice} onChange={(ev) => setPartPrice(ev.target.value)} />
                  <button type="button" className="md:col-span-4 text-sm px-3 py-1.5 rounded bg-gray-900 text-white" onClick={() => {
                    const qty = Number(partQty || 0);
                    const unitPrice = Number(partPrice || 0);
                    void patch(e.id, { parts: [...(e.parts || []), { id: `prt_${Date.now()}`, description: partName, qty, unitCost: unitPrice, unitPrice, amount: qty * unitPrice }] });
                    setPartName('');
                  }}>Agregar pieza</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-gray-500">También puedes crear un estimado desde <Link className="text-primary-600" href="/service">una orden de trabajo</Link>.</p>
    </div>
  );
}

export default function EstimatesPage() {
  return (
    <DmsFeatureGate featureKey="dms_service">
      <EstimatesInner />
    </DmsFeatureGate>
  );
}
