'use client';

import LeadsList from '@/components/LeadsList';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LeadsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Leads</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/settings/crm-sla"
            className="px-4 py-2 border border-amber-200 rounded text-sm text-amber-900 bg-amber-50 hover:bg-amber-100"
          >
            SLA seguimiento
          </Link>
          <Link
            href="/leads/kanban"
            className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2"
          >
            Vista Kanban
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
          >
            Nuevo Lead
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <span className="font-medium">Tráfico en la web pública</span>
        {' '}
        — señales anónimas (superficie, UTM, ruta) por vehículo:{' '}
        <Link href="/catalog-interest" className="text-primary-600 font-medium hover:underline">
          Interés catálogo web
        </Link>
        .
      </div>

      <LeadsList />

      {showCreateModal && (
        <CreateLeadModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

type TradeInForm = {
  make: string;
  model: string;
  year: string;
  trim: string;
  vin: string;
  mileage: string;
  stockNumber: string;
  color: string;
  interiorColor: string;
  transmission: string;
  fuelType: string;
  engine: string;
  bodyType: string;
  condition: string;
  estimatedValue: string;
  payoffBalance: string;
  lienholder: string;
  titleStatus: '' | 'clean' | 'salvage' | 'rebuilt' | 'unknown';
  accidentHistory: string;
  serviceRecords: boolean;
  notes: string;
};

const emptyTradeIn = (): TradeInForm => ({
  make: '',
  model: '',
  year: '',
  trim: '',
  vin: '',
  mileage: '',
  stockNumber: '',
  color: '',
  interiorColor: '',
  transmission: '',
  fuelType: '',
  engine: '',
  bodyType: '',
  condition: '',
  estimatedValue: '',
  payoffBalance: '',
  lienholder: '',
  titleStatus: '',
  accidentHistory: '',
  serviceRecords: false,
  notes: '',
});

function buildTradeInPayload(enabled: boolean, t: TradeInForm): Record<string, unknown> | undefined {
  if (!enabled) return undefined;
  const o: Record<string, unknown> = {};
  const str = (v: string, max: number) => {
    const x = v.trim();
    return x ? x.slice(0, max) : undefined;
  };
  const m = str(t.make, 80);
  const mo = str(t.model, 80);
  if (m) o.make = m;
  if (mo) o.model = mo;
  if (t.year.trim()) {
    const y = parseInt(t.year, 10);
    if (Number.isFinite(y)) o.year = y;
  }
  const tr = str(t.trim, 120);
  if (tr) o.trim = tr;
  const vin = str(t.vin, 32);
  if (vin) o.vin = vin.toUpperCase();
  if (t.mileage.trim()) {
    const mi = parseInt(String(t.mileage).replace(/,/g, ''), 10);
    if (Number.isFinite(mi)) o.mileage = mi;
  }
  const sn = str(t.stockNumber, 80);
  if (sn) o.stockNumber = sn;
  const col = str(t.color, 60);
  if (col) o.color = col;
  const ic = str(t.interiorColor, 60);
  if (ic) o.interiorColor = ic;
  const tx = str(t.transmission, 80);
  if (tx) o.transmission = tx;
  const ft = str(t.fuelType, 60);
  if (ft) o.fuelType = ft;
  const en = str(t.engine, 120);
  if (en) o.engine = en;
  const bt = str(t.bodyType, 60);
  if (bt) o.bodyType = bt;
  const cond = str(t.condition, 80);
  if (cond) o.condition = cond;
  if (t.estimatedValue.trim()) {
    const ev = parseFloat(t.estimatedValue.replace(/,/g, ''));
    if (Number.isFinite(ev)) o.estimatedValue = ev;
  }
  if (t.payoffBalance.trim()) {
    const pb = parseFloat(t.payoffBalance.replace(/,/g, ''));
    if (Number.isFinite(pb)) o.payoffBalance = pb;
  }
  const lh = str(t.lienholder, 200);
  if (lh) o.lienholder = lh;
  if (t.titleStatus) o.titleStatus = t.titleStatus;
  const ah = str(t.accidentHistory, 2000);
  if (ah) o.accidentHistory = ah;
  if (t.serviceRecords) o.serviceRecords = true;
  const n = str(t.notes, 5000);
  if (n) o.notes = n;
  if (Object.keys(o).length === 0) return undefined;
  return o;
}

function CreateLeadModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    source: 'manual',
    preferredChannel: 'phone',
    name: '',
    phone: '',
    email: '',
    notes: '',
    vehicleInterest: '',
    budget: '',
    vehicleId: '',
  });
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [tradeIn, setTradeIn] = useState<TradeInForm>(emptyTradeIn);
  const [vehicles, setVehicles] = useState<
    { id: string; make?: string; model?: string; year?: number; stockNumber?: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
        const res = await fetchWithAuth('/api/vehicles', {});
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setVehicles(data.vehicles || []);
      } catch {
        /* inventario opcional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const tradeInBody = buildTradeInPayload(hasTradeIn, tradeIn);
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: formData.source,
          contact: {
            name: formData.name,
            phone: formData.phone,
            email: formData.email || undefined,
            preferredChannel: formData.preferredChannel,
          },
          notes: formData.notes || undefined,
          vehicleId: formData.vehicleId || undefined,
          vehicleInterest: formData.vehicleInterest.trim() || undefined,
          budget: formData.budget.trim() || undefined,
          ...(tradeInBody ? { tradeIn: tradeInBody } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        onClose();
        window.location.reload();
      } else {
        setError(data.error || 'Error al crear lead');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al crear lead');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <h2 className="text-xl font-bold mb-4">Crear Nuevo Lead</h2>
        {error ? (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Contacto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Fuente</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="web">Web</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="email">Email</option>
                  <option value="phone">Teléfono</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Canal preferido</label>
                <select
                  value={formData.preferredChannel}
                  onChange={(e) => setFormData({ ...formData, preferredChannel: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="phone">Teléfono</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Interés</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Vehículo del inventario (opcional)</label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">— Sin seleccionar —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                      {v.stockNumber ? ` · Stock ${v.stockNumber}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Qué busca / comentario de interés</label>
                <textarea
                  value={formData.vehicleInterest}
                  onChange={(e) => setFormData({ ...formData, vehicleInterest: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  placeholder="Ej. SUV 7 pasajeros, presupuesto flexible…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Presupuesto (texto o número)</label>
                <input
                  type="text"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ej. 25000 o hasta $30k"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasTradeIn}
                onChange={(e) => {
                  setHasTradeIn(e.target.checked);
                  if (!e.target.checked) setTradeIn(emptyTradeIn());
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Incluir trade-in</span>
            </label>
            {hasTradeIn ? (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg text-sm">
                {(
                  [
                    ['make', 'Marca'],
                    ['model', 'Modelo'],
                    ['year', 'Año'],
                    ['trim', 'Versión / trim'],
                    ['vin', 'VIN'],
                    ['mileage', 'Millaje'],
                    ['stockNumber', 'Número de stock (si aplica)'],
                    ['color', 'Color exterior'],
                    ['interiorColor', 'Color interior'],
                    ['transmission', 'Transmisión'],
                    ['fuelType', 'Combustible'],
                    ['engine', 'Motor'],
                    ['bodyType', 'Carrocería'],
                    ['condition', 'Condición general'],
                    ['estimatedValue', 'Valor estimado'],
                    ['payoffBalance', 'Saldo a liquidar'],
                    ['lienholder', 'Acreedor / banco'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input
                      type={key === 'year' || key === 'mileage' ? 'number' : 'text'}
                      value={tradeIn[key]}
                      onChange={(e) => setTradeIn({ ...tradeIn, [key]: e.target.value })}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
                  <select
                    value={tradeIn.titleStatus}
                    onChange={(e) =>
                      setTradeIn({
                        ...tradeIn,
                        titleStatus: e.target.value as TradeInForm['titleStatus'],
                      })
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">—</option>
                    <option value="clean">Limpio</option>
                    <option value="salvage">Salvage</option>
                    <option value="rebuilt">Reconstruido</option>
                    <option value="unknown">Desconocido</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Historial de accidentes</label>
                  <input
                    type="text"
                    value={tradeIn.accidentHistory}
                    onChange={(e) => setTradeIn({ ...tradeIn, accidentHistory: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="svc-rec"
                    checked={tradeIn.serviceRecords}
                    onChange={(e) => setTradeIn({ ...tradeIn, serviceRecords: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="svc-rec" className="text-xs text-gray-700">
                    Tiene registros de servicio
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notas trade-in</label>
                  <textarea
                    value={tradeIn.notes}
                    onChange={(e) => setTradeIn({ ...tradeIn, notes: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                    rows={2}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded" disabled={loading}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





