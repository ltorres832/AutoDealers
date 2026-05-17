'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import {
  catalogSurfaceLabel,
  catalogInterestSignalsToCsv,
  catalogReferrerHost,
  downloadCatalogInterestCsv,
  parseCatalogUserAgent,
} from '@/lib/catalog-interest-helpers';

type VehicleSummary = {
  label: string;
  stockNumber: string | null;
  year?: number;
  make?: string;
  model?: string;
} | null;

type CatalogInterestSignal = {
  id: string;
  vehicleId: string | null;
  vehicleSummary?: VehicleSummary;
  surface: string | null;
  path: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  userAgent: string | null;
  ipHash: string | null;
  anonymous: boolean;
  hasExplicitContact: boolean;
  createdAt: string | null;
};

type Stats = {
  total: number;
  anonymous: number;
  withContact: number;
  uniqueVehicles: number;
  bySurface: Record<string, number>;
};

const PAGE_SIZE = 50;

function computeStats(rows: CatalogInterestSignal[]): Stats {
  const anonymous = rows.filter((s) => !s.hasExplicitContact).length;
  const withContact = rows.filter((s) => s.hasExplicitContact).length;
  const bySurface: Record<string, number> = {};
  for (const s of rows) {
    const k = s.surface || '—';
    bySurface[k] = (bySurface[k] || 0) + 1;
  }
  const uniqueVehicles = new Set(rows.map((s) => s.vehicleId).filter(Boolean)).size;
  return {
    total: rows.length,
    anonymous,
    withContact,
    uniqueVehicles,
    bySurface,
  };
}

function trunc(s: string | null | undefined, max: number): string {
  if (s == null || s === '') return '—';
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function formatLocal(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function topSurfaces(bySurface: Record<string, number>, n: number): { key: string; count: number }[] {
  return Object.entries(bySurface)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

function toYyyyMmDd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type CatalogInterestClientProps = {
  initialVehicleId: string;
  initialFrom: string;
  initialTo: string;
};

export default function CatalogInterestClient({
  initialVehicleId: urlVehicleId,
  initialFrom: urlFrom,
  initialTo: urlTo,
}: CatalogInterestClientProps) {
  const router = useRouter();

  const [vehicleIdFilter, setVehicleIdFilter] = useState(urlVehicleId);
  const [dateFrom, setDateFrom] = useState(urlFrom);
  const [dateTo, setDateTo] = useState(urlTo);

  const [signals, setSignals] = useState<CatalogInterestSignal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVehicleIdFilter(urlVehicleId);
    setDateFrom(urlFrom);
    setDateTo(urlTo);
  }, [urlVehicleId, urlFrom, urlTo]);

  const stats = useMemo(() => (signals.length > 0 ? computeStats(signals) : null), [signals]);

  const buildQuery = useCallback((cursor: string | null) => {
    const q = new URLSearchParams();
    if (urlVehicleId) q.set('vehicleId', urlVehicleId);
    if (urlFrom && urlTo) {
      q.set('from', urlFrom);
      q.set('to', urlTo);
    }
    q.set('limit', String(PAGE_SIZE));
    q.set('enrich', '1');
    if (cursor) q.set('cursor', cursor);
    return q;
  }, [urlVehicleId, urlFrom, urlTo]);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(`/api/catalog-interest-signals?${buildQuery(cursor).toString()}`, {});
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === 'string' ? data.error : 'No se pudo cargar');
          if (!append) {
            setSignals([]);
            setNextCursor(null);
            setHasMore(false);
          }
          return;
        }
        const batch: CatalogInterestSignal[] = Array.isArray(data.signals) ? data.signals : [];
        setSignals((prev) => (append ? [...prev, ...batch] : batch));
        setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
        setHasMore(data.hasMore === true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error de red');
        if (!append) {
          setSignals([]);
          setNextCursor(null);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildQuery]
  );

  useEffect(() => {
    void fetchPage(null, false);
  }, [fetchPage]);

  function applyFilter() {
    const qs = new URLSearchParams();
    const v = vehicleIdFilter.trim();
    if (v) qs.set('vehicleId', v);
    const f = dateFrom.trim();
    const t = dateTo.trim();
    if (f && t) {
      qs.set('from', f);
      qs.set('to', t);
    }
    router.replace(`/catalog-interest${qs.size ? `?${qs}` : ''}`);
  }

  function clearFilter() {
    router.replace('/catalog-interest');
  }

  function presetDays(days: number) {
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    setDateFrom(toYyyyMmDd(start));
    setDateTo(toYyyyMmDd(end));
  }

  function exportCsv() {
    const rows = signals.map((row) => ({
      fecha: row.createdAt || '',
      idVehiculo: row.vehicleId || '',
      vehiculo: row.vehicleSummary?.label || '',
      stock: row.vehicleSummary?.stockNumber || '',
      superficie: catalogSurfaceLabel(row.surface),
      superficieCodigo: row.surface || '',
      path: row.path || '',
      referrer: row.referrer || '',
      utm_source: row.utmSource || '',
      utm_medium: row.utmMedium || '',
      utm_campaign: row.utmCampaign || '',
      tipo: row.hasExplicitContact ? 'con_formulario' : 'anonimo',
      user_agent: row.userAgent || '',
      ip_hash: row.ipHash || '',
    }));
    const body = catalogInterestSignalsToCsv(rows);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadCatalogInterestCsv(`interes-catalogo-${stamp}.csv`, body);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Interés en catálogo (web)</h1>
          <p className="text-gray-600 mt-2 max-w-3xl text-sm leading-relaxed">
            Señales agregadas cuando alguien interactúa con un vehículo en la web pública (superficie, ruta, UTM,
            referrer). Son anónimas salvo que el visitante envíe el formulario de contacto en la ficha. Los leads con
            datos de contacto aparecen en{' '}
            <Link href="/leads?status=new" className="text-primary-600 hover:underline font-medium">
              Leads → Nuevos
            </Link>{' '}
            (con etiqueta catálogo web) y el vendedor recibe notificación al instante. Las filas «Con datos» en la tabla
            son envíos del formulario de la ficha. Paginación en bloques de {PAGE_SIZE}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href="/inventory"
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
          >
            Inventario
          </Link>
          <Link href="/leads" className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            Leads
          </Link>
          <button
            type="button"
            onClick={() => void fetchPage(null, false)}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={loading || signals.length === 0}
            className="px-4 py-2 border border-primary-200 bg-primary-50 text-primary-900 rounded-lg text-sm hover:bg-primary-100 disabled:opacity-50"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {stats && signals.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Filas listadas</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">métricas sobre lo visible (incluye «Cargar más»)</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Anónimos</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{stats.anonymous}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Con formulario</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{stats.withContact}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Vehículos distintos</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.uniqueVehicles}</p>
          </div>
        </div>
      )}

      {stats && Object.keys(stats.bySurface || {}).length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Orígenes más frecuentes (filas listadas)</p>
          <div className="flex flex-wrap gap-2">
            {topSurfaces(stats.bySurface, 8).map(({ key, count }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-800"
                title={key}
              >
                <span className="font-medium">{catalogSurfaceLabel(key === '—' ? null : key)}</span>
                <span className="text-slate-500">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => presetDays(7)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => presetDays(30)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Últimos 30 días
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
              Desde (UTC, YYYY-MM-DD)
            </label>
            <input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
              Hasta (UTC, inclusive)
            </label>
            <input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label htmlFor="vehicleIdFilter" className="block text-sm font-medium text-gray-700 mb-1">
              ID de vehículo (Firestore)
            </label>
            <input
              id="vehicleIdFilter"
              type="text"
              value={vehicleIdFilter}
              onChange={(e) => setVehicleIdFilter(e.target.value)}
              placeholder="Opcional — Inventario → «Interés en la web»"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyFilter}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 disabled:opacity-50 h-[42px]"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={clearFilter}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 h-[42px]"
            >
              Limpiar
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Rango de fechas: ambos campos o ninguno (máx. 400 días). La URL guarda filtros para compartir. Paginación por
          cursor en el servidor.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading && signals.length === 0 ? (
        <p className="text-gray-500">Cargando…</p>
      ) : signals.length === 0 ? (
        <p className="text-gray-500">No hay señales aún o no coinciden con el filtro.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[1100px] table-fixed text-sm border-collapse">
              <colgroup>
                <col className="w-[150px]" />
                <col className="w-[200px]" />
                <col className="w-[170px]" />
                <col className="w-[140px]" />
                <col className="w-[110px]" />
                <col className="w-[130px]" />
                <col className="w-[100px]" />
                <col className="w-[100px]" />
                <col className="w-[90px]" />
                <col className="w-[110px]" />
              </colgroup>
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-3 py-3 border-b border-gray-200">Fecha</th>
                  <th className="px-3 py-3 border-b border-gray-200">Vehículo</th>
                  <th className="px-3 py-3 border-b border-gray-200">Origen</th>
                  <th className="px-3 py-3 border-b border-gray-200">Ruta</th>
                  <th className="px-3 py-3 border-b border-gray-200">Referrer</th>
                  <th className="px-3 py-3 border-b border-gray-200">Campaña UTM</th>
                  <th className="px-3 py-3 border-b border-gray-200">Navegador</th>
                  <th className="px-3 py-3 border-b border-gray-200">Sistema</th>
                  <th className="px-3 py-3 border-b border-gray-200">Dispositivo</th>
                  <th className="px-3 py-3 border-b border-gray-200">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {signals.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80 align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-800">{formatLocal(row.createdAt)}</td>
                    <td className="px-3 py-2 text-gray-800">
                      <div className="font-medium text-gray-900">
                        {row.vehicleSummary?.label || (row.vehicleId ? trunc(row.vehicleId, 26) : '—')}
                      </div>
                      {row.vehicleSummary?.stockNumber ? (
                        <div className="text-xs text-blue-800 mt-0.5">Stock #{row.vehicleSummary.stockNumber}</div>
                      ) : null}
                      {row.vehicleId && row.vehicleSummary?.label ? (
                        <div className="font-mono text-[11px] text-gray-500 mt-1 break-all" title={row.vehicleId}>
                          {trunc(row.vehicleId, 28)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-gray-800">
                      <div className="text-sm leading-snug">{catalogSurfaceLabel(row.surface)}</div>
                      {row.surface === 'contact_form' && row.hasExplicitContact ? (
                        <Link
                          href="/leads?status=new"
                          className="inline-block mt-1 text-xs font-medium text-primary-600 hover:underline"
                        >
                          Ver en Leads →
                        </Link>
                      ) : null}
                    </td>
                    <td
                      className="px-3 py-3 text-gray-600 text-xs break-all leading-snug"
                      title={row.path || ''}
                    >
                      {row.path || '—'}
                    </td>
                    <td
                      className="px-3 py-3 text-gray-700 text-xs break-words leading-snug"
                      title={row.referrer || ''}
                    >
                      {catalogReferrerHost(row.referrer)}
                    </td>
                    <td
                      className="px-3 py-3 text-gray-600 text-xs leading-snug break-words"
                      title={[row.utmSource, row.utmMedium, row.utmCampaign].filter(Boolean).join(' | ')}
                    >
                      {[row.utmSource, row.utmMedium, row.utmCampaign].filter(Boolean).length > 0
                        ? [
                            row.utmSource ? `src: ${row.utmSource}` : null,
                            row.utmMedium ? `med: ${row.utmMedium}` : null,
                            row.utmCampaign ? `cmp: ${row.utmCampaign}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-800 text-xs" title={row.userAgent || ''}>
                      {parseCatalogUserAgent(row.userAgent).browser}
                    </td>
                    <td className="px-3 py-3 text-gray-800 text-xs">
                      {parseCatalogUserAgent(row.userAgent).os}
                    </td>
                    <td className="px-3 py-3 text-gray-800 text-xs">
                      {parseCatalogUserAgent(row.userAgent).device}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.hasExplicitContact ? (
                        <span className="text-green-700 font-medium">Con formulario</span>
                      ) : (
                        <span className="text-gray-500">Anónimo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && nextCursor ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => void fetchPage(nextCursor, true)}
                disabled={loadingMore}
                className="px-6 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMore ? 'Cargando…' : 'Cargar más'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
