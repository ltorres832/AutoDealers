'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { DmsFeatureGate } from '@/components/DmsFeatureGate';

const STATUSES = [
  { value: 'intake', label: 'Recepción' },
  { value: 'diagnosing', label: 'Diagnóstico' },
  { value: 'waiting_parts', label: 'Esperando piezas' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'quality_check', label: 'Control de calidad' },
  { value: 'ready', label: 'Lista' },
  { value: 'delivered', label: 'Entregada' },
  { value: 'cancelled', label: 'Cancelada' },
];

function ServicePageInner() {
  const [orders, setOrders] = useState<any[]>([]);
  const [partsCatalog, setPartsCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [laborDesc, setLaborDesc] = useState('');
  const [laborHours, setLaborHours] = useState('1');
  const [laborRate, setLaborRate] = useState('75');
  const [partId, setPartId] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [hoursLog, setHoursLog] = useState('');
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    vehicleLabel: '',
    plate: '',
    vin: '',
    complaints: '',
    diagnosis: '',
    notes: '',
    technicianId: '',
    leadId: '',
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/service/repair-orders', {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setOrders(data.orders || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void (async () => {
      try {
        const res = await fetchWithAuth('/api/parts', {});
        if (res.ok) {
          const data = await res.json();
          setPartsCatalog(data.parts || []);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetchWithAuth('/api/service/repair-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setShowForm(false);
    setForm({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      vehicleLabel: '',
      plate: '',
      vin: '',
      complaints: '',
      diagnosis: '',
      notes: '',
      technicianId: '',
      leadId: '',
    });
    await load();
  }

  async function setStatus(id: string, status: string) {
    await fetchWithAuth(`/api/service/repair-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function makeEstimate(id: string) {
    const res = await fetchWithAuth(`/api/service/repair-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'estimate' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    alert(`Estimado creado: ${data.estimate?.number}`);
  }

  async function uploadMedia(order: any, files: FileList | null, kind: 'photos' | 'videos') {
    if (!files?.length) return;
    const urls = [...(order[kind] || [])];
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append('file', file);
      body.append('type', 'service');
      body.append('folder', `service/${order.id}`);
      const res = await fetchWithAuth('/api/upload', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo subir el archivo');
        return;
      }
      if (data.url) urls.push(data.url);
    }
    await fetchWithAuth(`/api/service/repair-orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [kind]: urls }),
    });
    await load();
  }

  async function logHours(order: any) {
    const add = Number(hoursLog || 0);
    if (add <= 0) return;
    await fetchWithAuth(`/api/service/repair-orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hoursLogged: Number(order.hoursLogged || 0) + add }),
    });
    setHoursLog('');
    await load();
  }

  async function makeInvoice(id: string) {
    const res = await fetchWithAuth(`/api/service/repair-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invoice' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    alert(`Factura creada: ${data.invoice?.number}`);
  }

  async function saveLines(order: any, labor: any[], parts: any[]) {
    setError(null);
    const res = await fetchWithAuth(`/api/service/repair-orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labor, parts }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error al guardar líneas');
      return;
    }
    await load();
  }

  async function addLabor(order: any) {
    const hours = Number(laborHours || 0);
    const rate = Number(laborRate || 0);
    if (!laborDesc.trim() || hours <= 0) {
      setError('Describe el labor y las horas');
      return;
    }
    const labor = [
      ...(order.labor || []),
      {
        id: `lab_${Date.now()}`,
        description: laborDesc.trim(),
        hours,
        rate,
        amount: Math.round((hours * rate + Number.EPSILON) * 100) / 100,
      },
    ];
    setLaborDesc('');
    await saveLines(order, labor, order.parts || []);
  }

  async function addPart(order: any) {
    const part = partsCatalog.find((p) => p.id === partId);
    const qty = Number(partQty || 0);
    if (!part || qty <= 0) {
      setError('Selecciona una pieza y cantidad');
      return;
    }
    const unitPrice = Number(part.price || part.cost || 0);
    const unitCost = Number(part.cost || 0);
    const parts = [
      ...(order.parts || []),
      {
        id: `prt_${Date.now()}`,
        partId: part.id,
        sku: part.sku,
        description: part.name,
        qty,
        unitCost,
        unitPrice,
        amount: Math.round((qty * unitPrice + Number.EPSILON) * 100) / 100,
      },
    ];
    setPartId('');
    setPartQty('1');
    await saveLines(order, order.labor || [], parts);
  }

  async function removeLabor(order: any, lineId: string) {
    await saveLines(
      order,
      (order.labor || []).filter((l: any) => l.id !== lineId),
      order.parts || []
    );
  }

  async function removePart(order: any, lineId: string) {
    await saveLines(
      order,
      order.labor || [],
      (order.parts || []).filter((p: any) => p.id !== lineId)
    );
  }

  async function consumeParts(order: any) {
    const res = await fetchWithAuth(`/api/service/repair-orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'consume_parts' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error al descontar piezas');
      return;
    }
    alert('Piezas descontadas del inventario');
  }

  async function printRo(order: any) {
    try {
      const res = await fetchWithAuth(
        `/api/service/repair-orders/${order.id}?format=text`,
        {}
      );
      if (!res.ok) {
        setError('No se pudo generar el documento');
        return;
      }
      const text = await res.text();
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) {
        setError('Permite ventanas emergentes para imprimir');
        return;
      }
      w.document.write(
        `<pre style="font-family:ui-monospace,monospace;padding:24px;white-space:pre-wrap;">${text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')}</pre><script>window.onload=function(){window.print();}</script>`
      );
      w.document.close();
    } catch (e: any) {
      setError(e.message || 'Error al imprimir');
    }
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
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Taller / Servicio</h1>
          <p className="text-gray-600 mt-1">
            Órdenes de reparación (RO): quejas, labor, piezas y estados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm"
        >
          {showForm ? 'Cerrar' : '+ Nueva RO'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={create}
          className="bg-white border rounded-lg p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <label className="text-sm">
            Cliente *
            <input
              required
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            Teléfono
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.customerPhone}
              onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            Email
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.customerEmail}
              onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            Vehículo
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="2020 Toyota Corolla"
              value={form.vehicleLabel}
              onChange={(e) => setForm((f) => ({ ...f, vehicleLabel: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            Tablilla
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.plate}
              onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            VIN
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.vin}
              onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            Técnico / asesor
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="Nombre o ID"
              value={form.technicianId}
              onChange={(e) => setForm((f) => ({ ...f, technicianId: e.target.value }))}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Quejas (una por línea)
            <textarea
              className="mt-1 w-full border rounded px-3 py-2"
              rows={3}
              value={form.complaints}
              onChange={(e) => setForm((f) => ({ ...f, complaints: e.target.value }))}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Diagnóstico
            <textarea
              className="mt-1 w-full border rounded px-3 py-2"
              rows={2}
              value={form.diagnosis}
              onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg">
              Crear RO
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {orders.length === 0 && <p className="text-gray-500">No hay órdenes todavía.</p>}
        {orders.map((o) => (
          <div key={o.id} className="bg-white border rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="font-semibold">
                  {o.number} · {o.customerName}
                </div>
                <div className="text-sm text-gray-600">
                  {o.vehicleLabel || 'Sin vehículo'} {o.plate ? `· ${o.plate}` : ''} · Total $
                  {Number(o.total || 0).toFixed(2)}
                  {Number(o.laborTotal || 0) > 0 || Number(o.partsTotal || 0) > 0
                    ? ` (labor $${Number(o.laborTotal || 0).toFixed(2)} · piezas $${Number(o.partsTotal || 0).toFixed(2)})`
                    : ''}
                </div>
                {o.complaints?.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">{o.complaints.join(' · ')}</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={o.status}
                  onChange={(e) => setStatus(o.id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === o.id ? null : o.id)}
                  className="px-3 py-1.5 text-sm border rounded"
                >
                  {editingId === o.id ? 'Cerrar líneas' : 'Labor / Piezas'}
                </button>
                <button
                  type="button"
                  onClick={() => void printRo(o)}
                  className="px-3 py-1.5 text-sm border rounded"
                >
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => void makeEstimate(o.id)}
                  className="px-3 py-1.5 text-sm border rounded"
                >
                  A estimado
                </button>
                <button
                  type="button"
                  onClick={() => makeInvoice(o.id)}
                  className="px-3 py-1.5 text-sm rounded bg-primary-600 text-white"
                >
                  Facturar
                </button>
              </div>
            </div>

            {editingId === o.id && (
              <div className="border-t pt-3 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Labor</h3>
                  <ul className="text-sm space-y-1 mb-2">
                    {(o.labor || []).length === 0 && (
                      <li className="text-gray-500">Sin líneas de labor.</li>
                    )}
                    {(o.labor || []).map((l: any) => (
                      <li key={l.id} className="flex justify-between gap-2">
                        <span>
                          {l.description}: {l.hours}h × ${Number(l.rate).toFixed(2)} = $
                          {Number(l.amount).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          className="text-red-600 text-xs"
                          onClick={() => void removeLabor(o, l.id)}
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input
                      placeholder="Descripción"
                      className="border rounded px-2 py-1.5 text-sm md:col-span-2"
                      value={laborDesc}
                      onChange={(e) => setLaborDesc(e.target.value)}
                    />
                    <input
                      type="number"
                      step="0.25"
                      placeholder="Horas"
                      className="border rounded px-2 py-1.5 text-sm"
                      value={laborHours}
                      onChange={(e) => setLaborHours(e.target.value)}
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Tarifa $"
                      className="border rounded px-2 py-1.5 text-sm"
                      value={laborRate}
                      onChange={(e) => setLaborRate(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => void addLabor(o)}
                      className="md:col-span-4 text-sm px-3 py-1.5 rounded bg-gray-900 text-white"
                    >
                      Agregar labor
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Piezas</h3>
                  <ul className="text-sm space-y-1 mb-2">
                    {(o.parts || []).length === 0 && (
                      <li className="text-gray-500">Sin piezas. Agrégalas del catálogo.</li>
                    )}
                    {(o.parts || []).map((p: any) => (
                      <li key={p.id} className="flex justify-between gap-2">
                        <span>
                          {p.sku} {p.description}: {p.qty} × ${Number(p.unitPrice).toFixed(2)} = $
                          {Number(p.amount).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          className="text-red-600 text-xs"
                          onClick={() => void removePart(o, p.id)}
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <select
                      className="border rounded px-2 py-1.5 text-sm md:col-span-2"
                      value={partId}
                      onChange={(e) => setPartId(e.target.value)}
                    >
                      <option value="">Pieza del catálogo…</option>
                      {partsCatalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name} (stock {p.qtyOnHand})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      className="border rounded px-2 py-1.5 text-sm"
                      value={partQty}
                      onChange={(e) => setPartQty(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => void addPart(o)}
                      className="text-sm px-3 py-1.5 rounded bg-gray-900 text-white"
                    >
                      Agregar pieza
                    </button>
                    {(o.parts || []).length > 0 && (
                      <button
                        type="button"
                        onClick={() => void consumeParts(o)}
                        className="md:col-span-4 text-sm px-3 py-1.5 border rounded"
                      >
                        Descontar piezas del inventario
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Fotos y videos del trabajo</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(o.photos || []).map((url: string) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="w-20 h-16 rounded overflow-hidden border bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                    {(o.videos || []).map((url: string) => (
                      <video key={url} src={url} controls className="w-36 h-16 rounded border bg-black" />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <label className="px-3 py-1.5 border rounded cursor-pointer">
                      Subir fotos
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(ev) => void uploadMedia(o, ev.target.files, 'photos')} />
                    </label>
                    <label className="px-3 py-1.5 border rounded cursor-pointer">
                      Subir videos
                      <input type="file" accept="video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={(ev) => void uploadMedia(o, ev.target.files, 'videos')} />
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      placeholder="Horas"
                      className="border rounded px-2 py-1.5 w-24"
                      value={hoursLog}
                      onChange={(e) => setHoursLog(e.target.value)}
                    />
                    <button type="button" className="px-3 py-1.5 border rounded" onClick={() => void logHours(o)}>
                      Registrar horas ({Number(o.hoursLogged || 0)}h)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ServicePage() {
  return (
    <DmsFeatureGate featureKey="dms_service">
      <ServicePageInner />
    </DmsFeatureGate>
  );
}
