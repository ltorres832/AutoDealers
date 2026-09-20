'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { InventoryFeedJob } from '@autodealers/inventory/client';

export default function InventoryFeedsPage() {
  const enabled = useFeatureFlag('inventory_feed_sync');
  const [jobs, setJobs] = useState<InventoryFeedJob[]>([]);
  const [form, setForm] = useState({ name: 'Feed principal', feedUrl: '', format: 'csv' as 'csv' | 'json' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const res = await fetchWithAuth('/api/inventory-feeds', {});
    const json = await res.json();
    if (res.ok) setJobs(json.jobs || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setBusy(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/inventory-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setMessage('Feed guardado. No borra vehículos que no vengan en el archivo.');
      setForm({ name: 'Feed principal', feedUrl: '', format: 'csv' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function run(jobId: string, commit: boolean) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetchWithAuth('/api/inventory-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', jobId, commit }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setMessage(
        commit
          ? `Importado: ${json.created || 0} creados, ${json.updated || 0} actualizados.`
          : `Vista previa: ${json.previewRows || 0} filas.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
      <Link href="/inventory" className="text-sm text-slate-600 hover:underline">
        ← Inventario
      </Link>
      <h1 className="text-2xl font-bold">Sync por feed URL</h1>
      <p className="text-sm text-slate-600">
        CSV o JSON por URL. Actualiza / crea por VIN o stock. <strong>Nunca borra</strong> unidades que solo
        existan en AutoDealers.
      </p>
      {!enabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">Activa `inventory_feed_sync`.</div>
      ) : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {message ? <div className="text-sm text-green-700">{message}</div> : null}

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="https://.../inventario.csv"
          value={form.feedUrl}
          onChange={(e) => setForm({ ...form, feedUrl: e.target.value })}
        />
        <select
          className="w-full border rounded-lg px-3 py-2"
          value={form.format}
          onChange={(e) => setForm({ ...form, format: e.target.value as 'csv' | 'json' })}
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
        <button type="button" disabled={busy} onClick={() => void save()} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">
          Guardar feed
        </button>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="border-b pb-3 text-sm space-y-1">
            <p className="font-medium">{job.name}</p>
            <p className="text-xs break-all text-slate-500">{job.feedUrl}</p>
            <p className="text-xs">
              Último: {job.lastStatus || '—'} {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString('es-PR') : ''}
              {job.lastError ? ` — ${job.lastError}` : ''}
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={busy} className="px-2 py-1 border rounded" onClick={() => void run(job.id, false)}>
                Preview
              </button>
              <button type="button" disabled={busy} className="px-2 py-1 bg-slate-900 text-white rounded" onClick={() => void run(job.id, true)}>
                Importar
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        También puedes usar la{' '}
        <Link href="/inventory/bulk" className="underline">
          importación masiva
        </Link>{' '}
        por archivo.
      </p>
    </div>
  );
}
