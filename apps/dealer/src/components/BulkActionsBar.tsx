'use client';

import { useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export type BulkActionPayload =
  | { type: 'updatePrice'; mode: 'set' | 'increaseAmount' | 'decreaseAmount' | 'increasePercent' | 'decreasePercent'; value: number }
  | { type: 'updateStatus'; status: 'available' | 'reserved' }
  | { type: 'sold'; showPublicSoldBadge?: boolean }
  | { type: 'hide' }
  | { type: 'reactivate' }
  | { type: 'delete' }
  | { type: 'publish' }
  | { type: 'unpublish' }
  | { type: 'setQuantity'; quantity: number };

export default function BulkActionsBar({
  selectedIds,
  endpoint = '/api/vehicles/bulk-actions',
  buildBody,
  onDone,
  onClear,
}: {
  selectedIds: string[];
  endpoint?: string;
  /** Personaliza el body (p. ej. admin agrupa por tenant). Por defecto { vehicleIds, action }. */
  buildBody?: (action: BulkActionPayload) => Record<string, unknown>;
  onDone: () => void;
  onClear: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [priceMode, setPriceMode] = useState<'set' | 'increaseAmount' | 'decreaseAmount' | 'increasePercent' | 'decreasePercent'>('set');
  const [priceValue, setPriceValue] = useState('');
  const [quantityValue, setQuantityValue] = useState('');
  const [message, setMessage] = useState('');

  const run = async (action: BulkActionPayload, confirmText?: string) => {
    if (selectedIds.length === 0) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMessage('');
    try {
      const body = buildBody ? buildBody(action) : { vehicleIds: selectedIds, action };
      const res = await fetchWithAuth(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error aplicando la acción');
      setMessage('Acción aplicada correctamente');
      onDone();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error aplicando la acción');
    } finally {
      setBusy(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="sticky bottom-4 z-40 mt-6">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl px-5 py-4 flex flex-wrap items-center gap-3">
        <span className="font-semibold">{selectedIds.length} seleccionados</span>
        <button
          onClick={onClear}
          className="text-slate-300 hover:text-white text-sm underline"
        >
          Limpiar
        </button>

        <span className="w-px h-6 bg-slate-700 mx-1" />

        <button
          disabled={busy}
          onClick={() => void run({ type: 'sold' }, `¿Marcar ${selectedIds.length} vehículos como vendidos?`)}
          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-sm font-medium disabled:opacity-50"
        >
          Vendido
        </button>
        <button
          disabled={busy}
          onClick={() => void run({ type: 'hide' })}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium disabled:opacity-50"
        >
          Ocultar
        </button>
        <button
          disabled={busy}
          onClick={() => void run({ type: 'reactivate' })}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium disabled:opacity-50"
        >
          Reactivar
        </button>
        <button
          disabled={busy}
          onClick={() => void run({ type: 'publish' })}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium disabled:opacity-50"
        >
          Publicar
        </button>
        <button
          disabled={busy}
          onClick={() => void run({ type: 'unpublish' })}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium disabled:opacity-50"
        >
          Despublicar
        </button>
        <button
          disabled={busy}
          onClick={() =>
            void run({ type: 'delete' }, `¿Eliminar ${selectedIds.length} vehículos del inventario? (se conservan como eliminados)`)
          }
          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium disabled:opacity-50"
        >
          Eliminar
        </button>

        <span className="w-px h-6 bg-slate-700 mx-1" />

        <div className="flex items-center gap-1.5">
          <select
            value={priceMode}
            onChange={(e) => setPriceMode(e.target.value as typeof priceMode)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="set">Precio =</option>
            <option value="increaseAmount">Precio +$</option>
            <option value="decreaseAmount">Precio −$</option>
            <option value="increasePercent">Precio +%</option>
            <option value="decreasePercent">Precio −%</option>
          </select>
          <input
            type="number"
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            placeholder="Valor"
            className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm"
          />
          <button
            disabled={busy || !priceValue}
            onClick={() => void run({ type: 'updatePrice', mode: priceMode, value: Number(priceValue) })}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            value={quantityValue}
            onChange={(e) => setQuantityValue(e.target.value)}
            placeholder="Cantidad"
            className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm"
          />
          <button
            disabled={busy || quantityValue === ''}
            onClick={() => void run({ type: 'setQuantity', quantity: Number(quantityValue) })}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-medium disabled:opacity-50"
          >
            Fijar cantidad
          </button>
        </div>

        {busy && <span className="text-sm text-slate-300">Aplicando…</span>}
        {message && !busy && <span className="text-sm text-slate-300">{message}</span>}
      </div>
    </div>
  );
}
