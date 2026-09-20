'use client';

import { useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export default function MigrationKitPage() {
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File, mode: 'preview' | 'commit') {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('mode', mode);
      const res = await fetchWithAuth('/api/leads/import', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      if (mode === 'preview') setPreview(data.preview);
      else {
        setResult(data.result);
        setPreview(data.preview ? { summary: data.preview } : preview);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Migración de datos</h1>
        <p className="text-gray-600 mt-1">
          Kit CSV: inventario (ya disponible) + leads/clientes.
        </p>
      </div>

      <section className="bg-white border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-lg">Inventario de vehículos</h2>
        <p className="text-sm text-gray-600">
          Usa el importador masivo existente (VIN, stock, dry-run, commit).
        </p>
        <Link
          href="/inventory/bulk"
          className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          Ir a importación de inventario
        </Link>
      </section>

      <section className="bg-white border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-lg">Leads / clientes</h2>
        <p className="text-sm text-gray-600">
          Sube CSV o Excel. Columnas reconocidas: nombre, teléfono, email, fuente, ciudad, notas,
          presupuesto, interés.
        </p>
        <a
          href="/api/leads/import"
          className="inline-block text-sm text-primary-600 underline"
        >
          Descargar plantilla CSV
        </a>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm">
            Vista previa
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              disabled={busy}
              className="mt-1 block"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f, 'preview');
              }}
            />
          </label>
          <label className="text-sm">
            Importar (commit)
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              disabled={busy}
              className="mt-1 block"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f, 'commit');
              }}
            />
          </label>
        </div>
        {busy && <p className="text-sm text-gray-500">Procesando…</p>}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {preview?.summary && (
          <div className="text-sm">
            Filas: {preview.summary.total} · OK: {preview.summary.ok} · Errores:{' '}
            {preview.summary.errors}
          </div>
        )}
        {preview?.rows && (
          <div className="max-h-64 overflow-auto text-xs border rounded">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">Fila</th>
                  <th className="px-2 py-1 text-left">Nombre</th>
                  <th className="px-2 py-1 text-left">Tel</th>
                  <th className="px-2 py-1 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 40).map((r: any) => (
                  <tr key={r.rowNumber} className="border-t">
                    <td className="px-2 py-1">{r.rowNumber}</td>
                    <td className="px-2 py-1">{r.mapped?.name}</td>
                    <td className="px-2 py-1">{r.mapped?.phone}</td>
                    <td className="px-2 py-1">{r.ok ? 'OK' : r.errors?.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result && (
          <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm">
            Creados: {result.created} · Omitidos: {result.skipped}
            {result.errors?.length > 0 && (
              <ul className="mt-1 text-red-700">
                {result.errors.slice(0, 10).map((e: string) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
