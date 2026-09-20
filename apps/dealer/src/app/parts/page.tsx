'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { DmsFeatureGate } from '@/components/DmsFeatureGate';
import { escapeHtml, printHtmlDocument } from '@/lib/print-document';

type Tab = 'catalog' | 'suppliers' | 'orders';

function PartsPageInner() {
  const [tab, setTab] = useState<Tab>('catalog');
  const [parts, setParts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    qtyOnHand: '0',
    cost: '0',
    price: '0',
    location: '',
  });
  const [supForm, setSupForm] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    accountNumber: '',
  });
  const [poForm, setPoForm] = useState({
    supplierId: '',
    partId: '',
    qty: '1',
    unitCost: '0',
    notes: '',
  });

  async function loadParts(q?: string) {
    const qs = q ? `?search=${encodeURIComponent(q)}` : '';
    const res = await fetchWithAuth(`/api/parts${qs}`, {});
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setParts(data.parts || []);
  }

  async function loadSuppliers() {
    const res = await fetchWithAuth('/api/parts/procurement?view=suppliers', {});
    const data = await res.json();
    if (res.ok) setSuppliers(data.suppliers || []);
  }

  async function loadOrders() {
    const res = await fetchWithAuth('/api/parts/procurement?view=orders', {});
    const data = await res.json();
    if (res.ok) setOrders(data.orders || []);
  }

  useEffect(() => {
    void loadParts();
  }, []);

  useEffect(() => {
    if (tab === 'suppliers') void loadSuppliers();
    if (tab === 'orders') {
      void loadSuppliers();
      void loadOrders();
      void loadParts();
    }
  }, [tab]);

  async function createPart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetchWithAuth('/api/parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: form.sku,
        name: form.name,
        qtyOnHand: Number(form.qtyOnHand),
        cost: Number(form.cost),
        price: Number(form.price),
        location: form.location || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setForm({ sku: '', name: '', qtyOnHand: '0', cost: '0', price: '0', location: '' });
    await loadParts(search);
  }

  async function adjust(id: string, delta: number) {
    await fetchWithAuth('/api/parts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'adjust', delta, reason: 'manual' }),
    });
    await loadParts(search);
  }

  async function createSupplier(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetchWithAuth('/api/parts/procurement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_supplier', ...supForm }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setSupForm({ name: '', contactName: '', email: '', phone: '', accountNumber: '' });
    await loadSuppliers();
  }

  async function createPo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const part = parts.find((p) => p.id === poForm.partId);
    if (!part) {
      setError('Selecciona una pieza');
      return;
    }
    const res = await fetchWithAuth('/api/parts/procurement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_po',
        supplierId: poForm.supplierId,
        notes: poForm.notes || undefined,
        status: 'ordered',
        lines: [
          {
            partId: part.id,
            sku: part.sku,
            description: part.name,
            qtyOrdered: Number(poForm.qty),
            unitCost: Number(poForm.unitCost || part.cost || 0),
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setPoForm({ supplierId: '', partId: '', qty: '1', unitCost: '0', notes: '' });
    await loadOrders();
  }

  async function receiveAll(order: any) {
    const receipts = (order.lines || []).map((l: any) => ({
      lineId: l.id,
      qty: Math.max(0, Number(l.qtyOrdered || 0) - Number(l.qtyReceived || 0)),
    }));
    const res = await fetchWithAuth('/api/parts/procurement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'receive_po', id: order.id, receipts }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    await loadOrders();
    await loadParts(search);
  }

  async function sendPo(order: any) {
    setError(null);
    const res = await fetchWithAuth('/api/parts/procurement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_po', id: order.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error al enviar');
      return;
    }
    alert(`Orden ${order.number} enviada a ${data.sentTo}`);
    await loadOrders();
  }

  async function printPo(order: any) {
    setError(null);
    try {
      const res = await fetchWithAuth(
        `/api/parts/procurement?view=order&id=${encodeURIComponent(order.id)}&format=html`,
        {}
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'No se pudo generar la impresión');
        return;
      }
      const html = await res.text();
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) {
        setError('Permite ventanas emergentes para imprimir');
        return;
      }
      w.document.write(html);
      w.document.close();
      setTimeout(() => {
        try {
          w.print();
        } catch {
          /* ignore */
        }
      }, 300);
    } catch (e: any) {
      setError(e.message || 'Error al imprimir');
    }
  }

  function printCatalog() {
    const rows = parts
      .map(
        (p) =>
          `<tr><td>${escapeHtml(p.sku)}</td><td>${escapeHtml(p.name)}</td><td class="right">${Number(p.qtyOnHand || 0)}</td><td class="right">$${Number(p.cost || 0).toFixed(2)}</td><td class="right">$${Number(p.price || 0).toFixed(2)}</td><td>${escapeHtml(p.location || '—')}</td></tr>`
      )
      .join('');
    printHtmlDocument(
      `<h1>Catálogo de piezas</h1><p class="meta">${parts.length} ítems · ${new Date().toLocaleString('es-PR')}</p>
      <table><thead><tr><th>SKU</th><th>Nombre</th><th class="right">Stock</th><th class="right">Costo</th><th class="right">Precio</th><th>Ubicación</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Vacío</td></tr>'}</tbody></table>`,
      'Catálogo piezas'
    );
  }

  function printSuppliers() {
    const rows = suppliers
      .map(
        (s) =>
          `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.contactName || '—')}</td><td>${escapeHtml(s.email || '—')}</td><td>${escapeHtml(s.phone || '—')}</td><td>${escapeHtml(s.accountNumber || '—')}</td></tr>`
      )
      .join('');
    printHtmlDocument(
      `<h1>Suplidores</h1><p class="meta">${suppliers.length} suplidores · ${new Date().toLocaleString('es-PR')}</p>
      <table><thead><tr><th>Nombre</th><th>Contacto</th><th>Email</th><th>Teléfono</th><th>Cuenta</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Vacío</td></tr>'}</tbody></table>`,
      'Suplidores'
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Piezas</h1>
        <p className="text-gray-600 mt-1">
          Catálogo, suplidores y órdenes de compra. Al recibir un PO se actualiza el stock.
        </p>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {(
          [
            ['catalog', 'Catálogo'],
            ['suppliers', 'Suplidores'],
            ['orders', 'Órdenes de compra'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-md text-sm ${
              tab === id ? 'bg-primary-600 text-white' : 'bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {tab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => printCatalog()}
              className="text-sm px-3 py-1.5 border rounded-lg bg-white"
            >
              Imprimir catálogo
            </button>
          </div>
          <form
            onSubmit={createPart}
            className="bg-white border rounded-lg p-5 grid grid-cols-2 md:grid-cols-3 gap-3"
          >
            <input
              required
              placeholder="SKU"
              className="border rounded px-3 py-2"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            />
            <input
              required
              placeholder="Nombre"
              className="border rounded px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              type="number"
              placeholder="Stock"
              className="border rounded px-3 py-2"
              value={form.qtyOnHand}
              onChange={(e) => setForm((f) => ({ ...f, qtyOnHand: e.target.value }))}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Costo"
              className="border rounded px-3 py-2"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Precio"
              className="border rounded px-3 py-2"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
            <input
              placeholder="Ubicación"
              className="border rounded px-3 py-2"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
            <button
              type="submit"
              className="bg-primary-600 text-white rounded-lg px-4 py-2 col-span-2 md:col-span-3"
            >
              Agregar pieza
            </button>
          </form>

          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-2 flex-1"
              placeholder="Buscar SKU o nombre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" onClick={() => loadParts(search)} className="px-4 py-2 border rounded-lg">
              Buscar
            </button>
          </div>

          <div className="overflow-x-auto bg-white border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">Costo</th>
                  <th className="px-3 py-2">Precio</th>
                  <th className="px-3 py-2">Ajuste</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2 font-mono">{p.sku}</td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2">{p.qtyOnHand}</td>
                    <td className="px-3 py-2">${Number(p.cost).toFixed(2)}</td>
                    <td className="px-3 py-2">${Number(p.price).toFixed(2)}</td>
                    <td className="px-3 py-2 space-x-1">
                      <button type="button" className="px-2 py-1 border rounded" onClick={() => adjust(p.id, 1)}>
                        +1
                      </button>
                      <button type="button" className="px-2 py-1 border rounded" onClick={() => adjust(p.id, -1)}>
                        -1
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => printSuppliers()}
              className="text-sm px-3 py-1.5 border rounded-lg bg-white"
            >
              Imprimir suplidores
            </button>
          </div>
          <form
            onSubmit={createSupplier}
            className="bg-white border rounded-lg p-5 grid grid-cols-2 md:grid-cols-3 gap-3"
          >
            <input
              required
              placeholder="Nombre suplidor"
              className="border rounded px-3 py-2"
              value={supForm.name}
              onChange={(e) => setSupForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              placeholder="Contacto"
              className="border rounded px-3 py-2"
              value={supForm.contactName}
              onChange={(e) => setSupForm((f) => ({ ...f, contactName: e.target.value }))}
            />
            <input
              placeholder="Email"
              className="border rounded px-3 py-2"
              value={supForm.email}
              onChange={(e) => setSupForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              placeholder="Teléfono"
              className="border rounded px-3 py-2"
              value={supForm.phone}
              onChange={(e) => setSupForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              placeholder="# cuenta"
              className="border rounded px-3 py-2"
              value={supForm.accountNumber}
              onChange={(e) => setSupForm((f) => ({ ...f, accountNumber: e.target.value }))}
            />
            <button type="submit" className="bg-primary-600 text-white rounded-lg px-4 py-2">
              Guardar suplidor
            </button>
          </form>

          <div className="bg-white border rounded-lg divide-y">
            {suppliers.length === 0 && (
              <p className="p-4 text-sm text-gray-500">Sin suplidores aún.</p>
            )}
            {suppliers.map((s) => (
              <div key={s.id} className="px-4 py-3">
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-gray-500">
                  {[s.contactName, s.email, s.phone, s.accountNumber].filter(Boolean).join(' · ') ||
                    'Sin contacto'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-6">
          <form
            onSubmit={createPo}
            className="bg-white border rounded-lg p-5 grid grid-cols-2 md:grid-cols-3 gap-3"
          >
            <select
              required
              className="border rounded px-3 py-2"
              value={poForm.supplierId}
              onChange={(e) => setPoForm((f) => ({ ...f, supplierId: e.target.value }))}
            >
              <option value="">Suplidor…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              required
              className="border rounded px-3 py-2"
              value={poForm.partId}
              onChange={(e) => {
                const part = parts.find((p) => p.id === e.target.value);
                setPoForm((f) => ({
                  ...f,
                  partId: e.target.value,
                  unitCost: part ? String(part.cost || 0) : f.unitCost,
                }));
              }}
            >
              <option value="">Pieza…</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              required
              placeholder="Cantidad"
              className="border rounded px-3 py-2"
              value={poForm.qty}
              onChange={(e) => setPoForm((f) => ({ ...f, qty: e.target.value }))}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Costo unitario"
              className="border rounded px-3 py-2"
              value={poForm.unitCost}
              onChange={(e) => setPoForm((f) => ({ ...f, unitCost: e.target.value }))}
            />
            <input
              placeholder="Notas"
              className="border rounded px-3 py-2 md:col-span-2"
              value={poForm.notes}
              onChange={(e) => setPoForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <button
              type="submit"
              className="bg-primary-600 text-white rounded-lg px-4 py-2 col-span-2 md:col-span-3"
            >
              Crear orden de compra
            </button>
          </form>

          <div className="space-y-3">
            {orders.length === 0 && (
              <p className="text-sm text-gray-500">Sin órdenes de compra.</p>
            )}
            {orders.map((o) => (
              <div key={o.id} className="bg-white border rounded-lg p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-semibold">{o.number}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {o.supplierName || o.supplierId} · {o.status}
                    </span>
                  </div>
                  <div className="text-sm font-medium">${Number(o.total || 0).toFixed(2)}</div>
                </div>
                <ul className="text-sm text-gray-700 space-y-1">
                  {(o.lines || []).map((l: any) => (
                    <li key={l.id}>
                      {l.sku} — {l.description}: {l.qtyReceived}/{l.qtyOrdered} @ $
                      {Number(l.unitCost).toFixed(2)}
                    </li>
                  ))}
                </ul>
                {o.status !== 'received' && o.status !== 'cancelled' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void sendPo(o)}
                      className="text-sm px-3 py-1.5 rounded-lg bg-primary-600 text-white"
                    >
                      Enviar a suplidor
                    </button>
                    <button
                      type="button"
                      onClick={() => printPo(o)}
                      className="text-sm px-3 py-1.5 border rounded-lg bg-white"
                    >
                      Imprimir
                    </button>
                    <button
                      type="button"
                      onClick={() => receiveAll(o)}
                      className="text-sm px-3 py-1.5 border rounded-lg bg-gray-50"
                    >
                      Recibir pendiente → stock
                    </button>
                  </div>
                )}
                {(o.status === 'received' || o.status === 'cancelled') && (
                  <button
                    type="button"
                    onClick={() => printPo(o)}
                    className="text-sm px-3 py-1.5 border rounded-lg bg-white"
                  >
                    Imprimir
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PartsPage() {
  return (
    <DmsFeatureGate featureKey="dms_parts">
      <PartsPageInner />
    </DmsFeatureGate>
  );
}
