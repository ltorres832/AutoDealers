'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { DmsFeatureGate } from '@/components/DmsFeatureGate';
import { escapeHtml, printHtmlDocument } from '@/lib/print-document';

type Tab = 'invoices' | 'caja' | 'statement' | 'gl';

function FinancePageInner() {
  const [tab, setTab] = useState<Tab>('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [statement, setStatement] = useState<any>(null);
  const [glPreview, setGlPreview] = useState<any[]>([]);
  const [glRange, setGlRange] = useState({ from: '', to: '' });
  const [customer, setCustomer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invForm, setInvForm] = useState({ customerName: '', total: '', description: '' });
  const [payForm, setPayForm] = useState({ invoiceId: '', amount: '', method: 'cash' });
  const [cashForm, setCashForm] = useState({ type: 'in', amount: '', category: 'manual', description: '' });

  async function loadInvoices() {
    const res = await fetchWithAuth('/api/finance?view=invoices', {});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Error cargando facturas');
      return;
    }
    setInvoices(data.invoices || []);
  }
  async function loadCaja() {
    const res = await fetchWithAuth('/api/finance?view=caja', {});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Error cargando caja');
      return;
    }
    setEntries(data.entries || []);
  }

  async function loadGl() {
    const qs = new URLSearchParams();
    if (glRange.from) qs.set('from', glRange.from);
    if (glRange.to) qs.set('to', glRange.to);
    const res = await fetchWithAuth(`/api/finance/gl-export?${qs}`, {});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Error cargando GL');
      return;
    }
    setGlPreview(data.entries || []);
  }

  useEffect(() => {
    if (tab === 'invoices') void loadInvoices();
    if (tab === 'caja') void loadCaja();
    if (tab === 'gl') void loadGl();
  }, [tab]);

  async function downloadGl(format: 'quickbooks' | 'xero') {
    const qs = new URLSearchParams({ format });
    if (glRange.from) qs.set('from', glRange.from);
    if (glRange.to) qs.set('to', glRange.to);
    const res = await fetchWithAuth(`/api/finance/gl-export?${qs}`, {});
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Error al exportar');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autodealers-${format}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetchWithAuth('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: invForm.customerName,
        total: Number(invForm.total),
        subtotal: Number(invForm.total),
        description: invForm.description,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setInvForm({ customerName: '', total: '', description: '' });
    await loadInvoices();
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetchWithAuth('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'payment',
        invoiceId: payForm.invoiceId,
        amount: Number(payForm.amount),
        method: payForm.method,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setPayForm({ invoiceId: '', amount: '', method: 'cash' });
    await loadInvoices();
    if (tab === 'caja') await loadCaja();
  }

  async function addCash(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetchWithAuth('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cash', ...cashForm, amount: Number(cashForm.amount) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setCashForm({ type: 'in', amount: '', category: 'manual', description: '' });
    await loadCaja();
  }

  async function loadStatement(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetchWithAuth(
      `/api/finance?view=statement&customer=${encodeURIComponent(customer)}`,
      {}
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setStatement(data.statement);
  }

  function printInvoice(i: any) {
    printHtmlDocument(
      `<h1>Factura ${escapeHtml(i.number)}</h1>
      <p class="meta">Cliente: <strong>${escapeHtml(i.customerName)}</strong><br/>
      Estado: ${escapeHtml(i.status)} · Fuente: ${escapeHtml(i.source || '—')}<br/>
      Fecha: ${i.createdAt ? escapeHtml(new Date(i.createdAt).toLocaleString('es-PR')) : '—'}</p>
      <p>${escapeHtml(i.description || '')}</p>
      <table><thead><tr><th>Concepto</th><th class="right">Monto</th></tr></thead>
      <tbody>
        <tr><td>Subtotal</td><td class="right">$${Number(i.subtotal ?? i.total).toFixed(2)}</td></tr>
        <tr><td>Total</td><td class="right total">$${Number(i.total).toFixed(2)}</td></tr>
        <tr><td>Saldo</td><td class="right">$${Number(i.balance).toFixed(2)}</td></tr>
      </tbody></table>`,
      `Factura ${i.number}`
    );
  }

  function printInvoicesList() {
    const rows = invoices
      .map(
        (i) =>
          `<tr><td>${escapeHtml(i.number)}</td><td>${escapeHtml(i.customerName)}</td><td>${escapeHtml(i.status)}</td><td class="right">$${Number(i.total).toFixed(2)}</td><td class="right">$${Number(i.balance).toFixed(2)}</td></tr>`
      )
      .join('');
    printHtmlDocument(
      `<h1>Facturas AR</h1><p class="meta">${invoices.length} facturas · ${new Date().toLocaleString('es-PR')}</p>
      <table><thead><tr><th>#</th><th>Cliente</th><th>Estado</th><th class="right">Total</th><th class="right">Saldo</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Sin facturas</td></tr>'}</tbody></table>`,
      'Facturas AR'
    );
  }

  function printCaja() {
    const rows = entries
      .map(
        (e) =>
          `<tr><td>${e.type === 'in' ? 'Entrada' : 'Salida'}</td><td>${escapeHtml(e.category)}</td><td>${escapeHtml(e.description || '—')}</td><td class="right">$${Number(e.amount).toFixed(2)}</td><td>${e.createdAt ? escapeHtml(new Date(e.createdAt).toLocaleString('es-PR')) : ''}</td></tr>`
      )
      .join('');
    printHtmlDocument(
      `<h1>Caja / diario</h1><p class="meta">${entries.length} movimientos · ${new Date().toLocaleString('es-PR')}</p>
      <table><thead><tr><th>Tipo</th><th>Categoría</th><th>Descripción</th><th class="right">Monto</th><th>Fecha</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Sin movimientos</td></tr>'}</tbody></table>`,
      'Caja'
    );
  }

  function printStatement() {
    if (!statement) return;
    const invRows = (statement.invoices || [])
      .map(
        (i: any) =>
          `<tr><td>${escapeHtml(i.number)}</td><td>${escapeHtml(i.status)}</td><td class="right">$${Number(i.total).toFixed(2)}</td><td class="right">$${Number(i.balance).toFixed(2)}</td></tr>`
      )
      .join('');
    printHtmlDocument(
      `<h1>Estado de cuenta</h1>
      <p class="meta">Cliente: <strong>${escapeHtml(statement.customer)}</strong><br/>
      Saldo abierto: $${Number(statement.openBalance).toFixed(2)} · Pagado: $${Number(statement.paidTotal).toFixed(2)}</p>
      <h2>Facturas</h2>
      <table><thead><tr><th>#</th><th>Estado</th><th class="right">Total</th><th class="right">Saldo</th></tr></thead><tbody>${invRows || '<tr><td colspan="4">Sin facturas</td></tr>'}</tbody></table>`,
      'Estado de cuenta'
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finanzas</h1>
        <p className="text-gray-600 mt-1">
          AR, caja y export de asientos contables (QuickBooks / Xero CSV).
        </p>
      </div>

      <div className="flex gap-2 border-b pb-2 flex-wrap">
        {(
          [
            ['invoices', 'Facturas AR'],
            ['caja', 'Caja / diario'],
            ['statement', 'Estado de cuenta'],
            ['gl', 'Export GL'],
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

      {tab === 'invoices' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => printInvoicesList()}
              className="text-sm px-3 py-1.5 border rounded-lg bg-white"
            >
              Imprimir listado
            </button>
          </div>
          <form onSubmit={createInvoice} className="bg-white border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              required
              placeholder="Cliente"
              className="border rounded px-3 py-2"
              value={invForm.customerName}
              onChange={(e) => setInvForm((f) => ({ ...f, customerName: e.target.value }))}
            />
            <input
              required
              type="number"
              step="0.01"
              placeholder="Total"
              className="border rounded px-3 py-2"
              value={invForm.total}
              onChange={(e) => setInvForm((f) => ({ ...f, total: e.target.value }))}
            />
            <input
              placeholder="Descripción"
              className="border rounded px-3 py-2"
              value={invForm.description}
              onChange={(e) => setInvForm((f) => ({ ...f, description: e.target.value }))}
            />
            <button type="submit" className="sm:col-span-3 bg-primary-600 text-white rounded-lg px-4 py-2">
              Crear factura
            </button>
          </form>

          <form onSubmit={pay} className="bg-white border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              required
              className="border rounded px-3 py-2"
              value={payForm.invoiceId}
              onChange={(e) => setPayForm((f) => ({ ...f, invoiceId: e.target.value }))}
            >
              <option value="">Factura…</option>
              {invoices
                .filter((i) => i.status === 'open' || i.status === 'partial')
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.number} · {i.customerName} · bal ${i.balance}
                  </option>
                ))}
            </select>
            <input
              required
              type="number"
              step="0.01"
              placeholder="Monto"
              className="border rounded px-3 py-2"
              value={payForm.amount}
              onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <select
              className="border rounded px-3 py-2"
              value={payForm.method}
              onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
            >
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="ach">ACH</option>
              <option value="other">Otro</option>
            </select>
            <button type="submit" className="bg-emerald-600 text-white rounded-lg px-4 py-2">
              Registrar cobro
            </button>
          </form>

          <div className="space-y-2">
            {invoices.map((i) => (
              <div key={i.id} className="bg-white border rounded-lg px-4 py-3 text-sm flex justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {i.number} · {i.customerName}
                  </div>
                  <div className="text-gray-500">
                    {i.status} · total ${Number(i.total).toFixed(2)} · saldo ${Number(i.balance).toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => printInvoice(i)}
                    className="text-xs px-2 py-1 border rounded"
                  >
                    Imprimir
                  </button>
                  <div className="text-xs text-gray-400">{i.source}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'caja' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => printCaja()}
              className="text-sm px-3 py-1.5 border rounded-lg bg-white"
            >
              Imprimir caja
            </button>
          </div>
          <form onSubmit={addCash} className="bg-white border rounded-lg p-4 grid grid-cols-2 gap-3">
            <select
              className="border rounded px-3 py-2"
              value={cashForm.type}
              onChange={(e) => setCashForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="in">Entrada</option>
              <option value="out">Salida</option>
            </select>
            <input
              required
              type="number"
              step="0.01"
              placeholder="Monto"
              className="border rounded px-3 py-2"
              value={cashForm.amount}
              onChange={(e) => setCashForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <input
              placeholder="Categoría"
              className="border rounded px-3 py-2"
              value={cashForm.category}
              onChange={(e) => setCashForm((f) => ({ ...f, category: e.target.value }))}
            />
            <input
              placeholder="Descripción"
              className="border rounded px-3 py-2"
              value={cashForm.description}
              onChange={(e) => setCashForm((f) => ({ ...f, description: e.target.value }))}
            />
            <button type="submit" className="col-span-2 bg-primary-600 text-white rounded-lg px-4 py-2">
              Registrar movimiento
            </button>
          </form>
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="bg-white border rounded-lg px-4 py-3 text-sm flex justify-between">
                <span>
                  {e.type === 'in' ? '+' : '−'} ${Number(e.amount).toFixed(2)} · {e.category} ·{' '}
                  {e.description || '—'}
                </span>
                <span className="text-gray-400 text-xs">
                  {e.createdAt ? new Date(e.createdAt).toLocaleString('es-PR') : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'statement' && (
        <div className="space-y-4">
          <form onSubmit={loadStatement} className="flex gap-2">
            <input
              required
              className="border rounded px-3 py-2 flex-1"
              placeholder="Nombre, email o teléfono del cliente"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg">
              Buscar
            </button>
          </form>
          {statement && (
            <div className="bg-white border rounded-lg p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <div className="font-semibold">Cliente: {statement.customer}</div>
                <button
                  type="button"
                  onClick={() => printStatement()}
                  className="text-sm px-3 py-1.5 border rounded-lg"
                >
                  Imprimir
                </button>
              </div>
              <div className="text-sm">
                Saldo abierto: ${Number(statement.openBalance).toFixed(2)} · Pagado histórico: $
                {Number(statement.paidTotal).toFixed(2)}
              </div>
              {(statement.invoices || []).map((i: any) => (
                <div key={i.id} className="text-sm border-t pt-2">
                  {i.number} · {i.status} · ${Number(i.balance).toFixed(2)} pendiente
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'gl' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Genera asientos desde AR, caja, ventas y RO entregadas. Descarga CSV para importar en
            QuickBooks Online o Xero (manual journals).
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-sm">
              Desde
              <input
                type="date"
                className="block border rounded px-3 py-2 mt-1"
                value={glRange.from}
                onChange={(e) => setGlRange((r) => ({ ...r, from: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              Hasta
              <input
                type="date"
                className="block border rounded px-3 py-2 mt-1"
                value={glRange.to}
                onChange={(e) => setGlRange((r) => ({ ...r, to: e.target.value }))}
              />
            </label>
            <button type="button" onClick={() => loadGl()} className="px-4 py-2 border rounded-lg">
              Vista previa
            </button>
            <button
              type="button"
              onClick={() => downloadGl('quickbooks')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg"
            >
              CSV QuickBooks
            </button>
            <button
              type="button"
              onClick={() => downloadGl('xero')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg"
            >
              CSV Xero
            </button>
          </div>
          <div className="bg-white border rounded-lg overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Ref</th>
                  <th className="px-3 py-2">Memo</th>
                  <th className="px-3 py-2">Líneas</th>
                </tr>
              </thead>
              <tbody>
                {glPreview.map((e, i) => (
                  <tr key={`${e.ref}-${i}`} className="border-t">
                    <td className="px-3 py-2">{e.date}</td>
                    <td className="px-3 py-2 font-mono">{e.ref}</td>
                    <td className="px-3 py-2">{e.memo}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {(e.lines || [])
                        .map(
                          (l: any) =>
                            `${l.account}: D${Number(l.debit || 0).toFixed(2)} / C${Number(l.credit || 0).toFixed(2)}`
                        )
                        .join(' · ')}
                    </td>
                  </tr>
                ))}
                {glPreview.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-gray-500">
                      Sin asientos en el rango (o aún no hay AR/caja).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinancePage() {
  return (
    <DmsFeatureGate featureKey="dms_finance">
      <FinancePageInner />
    </DmsFeatureGate>
  );
}
