'use client';

import { useState } from 'react';
import Link from 'next/link';

type VinMatch = {
  tenantId: string;
  vehicleId: string;
  status?: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
};

export default function AdminVinConflictsPage() {
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    vinNormalized: string;
    total: number;
    tenantCount: number;
    hasMultiTenantConflict: boolean;
    matches: VinMatch[];
  } | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/admin/vin-conflicts?vin=${encodeURIComponent(vin.trim())}&activeOnly=true`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error consultando VIN');
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Conflictos de VIN</h1>
        <p className="text-sm text-slate-600 mt-1">
          Busca listados activos con el mismo VIN en varios dealers/vendedores. Al marcar
          vendido en uno, el sistema sincroniza el resto automáticamente.
        </p>
      </div>

      <form onSubmit={lookup} className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          VIN
          <input
            className="border border-slate-300 rounded-lg px-3 py-2 w-72 font-mono tracking-wide"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            placeholder="17 caracteres"
            maxLength={32}
          />
        </label>
        <button
          type="submit"
          disabled={loading || !vin.trim()}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="text-sm text-slate-700">
            VIN normalizado: <span className="font-mono font-medium">{result.vinNormalized}</span>
            {' · '}
            {result.total} listado(s) activo(s) en {result.tenantCount} tenant(s)
            {result.hasMultiTenantConflict && (
              <span className="ml-2 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Multi-listado
              </span>
            )}
          </div>

          {result.matches.length === 0 ? (
            <p className="text-sm text-slate-500">No hay listados activos con este VIN.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Tenant</th>
                    <th className="px-3 py-2">Vehículo</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {result.matches.map((m) => (
                    <tr key={`${m.tenantId}-${m.vehicleId}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs">{m.tenantId}</td>
                      <td className="px-3 py-2">
                        {[m.year, m.make, m.model].filter(Boolean).join(' ') || m.vehicleId}
                      </td>
                      <td className="px-3 py-2">{m.status || '—'}</td>
                      <td className="px-3 py-2">
                        <Link
                          className="text-blue-700 hover:underline"
                          href={`/admin/vehicles/${encodeURIComponent(m.tenantId)}/${encodeURIComponent(m.vehicleId)}/edit`}
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
