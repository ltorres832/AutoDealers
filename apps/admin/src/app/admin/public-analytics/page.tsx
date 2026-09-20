'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type VisitTotals = {
  uniqueVisitors: number;
  pageViews: number;
};

type VisitDay = VisitTotals & {
  date: string;
};

type PlatformApp = 'public-web' | 'advertiser' | 'dealer' | 'seller' | 'admin';

type PathRow = {
  app: PlatformApp;
  path: string;
  label: string;
  pageViews: number;
};

type PublicAnalyticsResponse = {
  timeZone: string;
  app: PlatformApp | 'all';
  apps: Array<{ id: PlatformApp; label: string }>;
  today: VisitTotals;
  week: VisitTotals;
  month: VisitTotals;
  byApp: {
    today: Record<PlatformApp, VisitTotals>;
    week: Record<PlatformApp, VisitTotals>;
    month: Record<PlatformApp, VisitTotals>;
  };
  topPaths: PathRow[];
  highlightPaths: PathRow[];
  contacts: { total: number; unread: number };
  series: VisitDay[];
  generatedAt: string;
};

const emptyTotals: VisitTotals = { uniqueVisitors: 0, pageViews: 0 };

const APP_COLORS: Record<PlatformApp, string> = {
  'public-web': 'bg-primary-600',
  advertiser: 'bg-amber-600',
  dealer: 'bg-emerald-600',
  seller: 'bg-sky-600',
  admin: 'bg-slate-600',
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-PR').format(value || 0);
}

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return dateKey;
  return new Intl.DateTimeFormat('es-PR', { month: 'short', day: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, day, 12))
  );
}

function StatCard({
  title,
  totals,
  description,
}: {
  title: string;
  totals: VisitTotals;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-3 text-4xl font-bold text-gray-900">{formatNumber(totals.uniqueVisitors)}</p>
      <p className="mt-1 text-sm text-gray-600">personas únicas</p>
      <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {formatNumber(totals.pageViews)} páginas vistas
      </div>
      <p className="mt-3 text-xs text-gray-500">{description}</p>
    </div>
  );
}

export default function PublicAnalyticsPage() {
  const [data, setData] = useState<PublicAnalyticsResponse | null>(null);
  const [appFilter, setAppFilter] = useState<PlatformApp | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAnalytics(nextApp: PlatformApp | 'all' = appFilter) {
    setLoading(true);
    setError(null);
    try {
      const query = nextApp === 'all' ? '' : `?app=${encodeURIComponent(nextApp)}`;
      const response = await fetch(`/api/admin/public-analytics${query}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('No se pudieron cargar las estadísticas de la plataforma.');
      }
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando estadísticas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalytics(appFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appFilter]);

  const maxVisitors = useMemo(
    () => Math.max(1, ...(data?.series || []).map((day) => day.uniqueVisitors)),
    [data?.series]
  );

  const appRows = useMemo(() => {
    const apps = data?.apps || [];
    return apps.map((app) => ({
      ...app,
      today: data?.byApp.today[app.id] || emptyTotals,
      week: data?.byApp.week[app.id] || emptyTotals,
      month: data?.byApp.month[app.id] || emptyTotals,
    }));
  }, [data]);

  const visiblePaths = useMemo(() => {
    const highlights = data?.highlightPaths || [];
    const highlightKeys = new Set(highlights.map((row) => `${row.app}:${row.path}`));
    const extras = (data?.topPaths || []).filter((row) => !highlightKeys.has(`${row.app}:${row.path}`));
    return [...highlights, ...extras].slice(0, 40);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Actividad del sitio</h1>
          <p className="mt-2 text-gray-600">
            Visitas y páginas vistas de todas las apps: sitio público, anunciante, dealer, vendedor y admin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={appFilter}
            onChange={(event) => setAppFilter(event.target.value as PlatformApp | 'all')}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
          >
            <option value="all">Todas las apps</option>
            {(data?.apps || []).map((app) => (
              <option key={app.id} value={app.id}>
                {app.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => void loadAnalytics(appFilter)}
            className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
          >
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="Hoy"
          totals={data?.today || emptyTotals}
          description="Visitantes únicos registrados hoy."
        />
        <StatCard
          title="Últimos 7 días"
          totals={data?.week || emptyTotals}
          description="Suma diaria de visitantes únicos en la última semana."
        />
        <StatCard
          title="Mes actual"
          totals={data?.month || emptyTotals}
          description="Suma diaria desde el día 1 del mes actual."
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/admin/contact-inquiries"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-primary-300"
        >
          <p className="text-sm font-medium text-gray-500">Mensajes de contacto</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(data?.contacts?.total || 0)}</p>
          <p className="mt-1 text-sm text-gray-600">
            {formatNumber(data?.contacts?.unread || 0)} sin leer · ver bandeja
          </p>
        </Link>
        <Link
          href="/admin/all-leads"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-primary-300"
        >
          <p className="text-sm font-medium text-gray-500">Leads</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">Abrir todos los leads</p>
          <p className="mt-1 text-sm text-gray-600">
            El detalle de CRM sigue en su pantalla; aquí solo el acceso rápido.
          </p>
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Por app</h2>
        <p className="mt-1 text-sm text-gray-500">Visitantes únicos y páginas vistas de cada panel o sitio.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">App</th>
                <th className="py-2 pr-4 font-medium">Hoy</th>
                <th className="py-2 pr-4 font-medium">7 días</th>
                <th className="py-2 font-medium">Mes</th>
              </tr>
            </thead>
            <tbody>
              {appRows.map((app) => (
                <tr key={app.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => setAppFilter(app.id)}
                      className="inline-flex items-center gap-2 font-medium text-gray-900 hover:text-primary-700"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${APP_COLORS[app.id]}`} />
                      {app.label}
                    </button>
                  </td>
                  <td className="py-3 pr-4 text-gray-700">
                    {formatNumber(app.today.uniqueVisitors)} · {formatNumber(app.today.pageViews)} views
                  </td>
                  <td className="py-3 pr-4 text-gray-700">
                    {formatNumber(app.week.uniqueVisitors)} · {formatNumber(app.week.pageViews)} views
                  </td>
                  <td className="py-3 text-gray-700">
                    {formatNumber(app.month.uniqueVisitors)} · {formatNumber(app.month.pageViews)} views
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Páginas clave y más vistas</h2>
        <p className="mt-1 text-sm text-gray-500">
          Incluye Plataforma, membresías/precios, registro y rutas de anunciante. Los IDs dinámicos se agrupan.
        </p>
        {visiblePaths.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4 font-medium">Página</th>
                  <th className="py-2 pr-4 font-medium">App</th>
                  <th className="py-2 pr-4 font-medium">Ruta</th>
                  <th className="py-2 text-right font-medium">Vistas (30 días)</th>
                </tr>
              </thead>
              <tbody>
                {visiblePaths.map((row) => (
                  <tr key={`${row.app}:${row.path}`} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium text-gray-900">{row.label}</td>
                    <td className="py-3 pr-4 text-gray-600">
                      {data?.apps.find((app) => app.id === row.app)?.label || row.app}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">{row.path}</td>
                    <td className="py-3 text-right text-gray-800">{formatNumber(row.pageViews)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-lg bg-gray-50 p-8 text-center text-gray-500">
            Todavía no hay desglose por página. Abre las apps una vez después del deploy para empezar a llenar esta tabla.
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Últimos 30 días</h2>
            <p className="text-sm text-gray-500">
              Zona horaria: {data?.timeZone || 'America/Puerto_Rico'}
            </p>
          </div>
          {data?.generatedAt && (
            <p className="text-xs text-gray-500">
              Actualizado: {new Date(data.generatedAt).toLocaleString('es-PR')}
            </p>
          )}
        </div>

        {data?.series?.some((day) => day.uniqueVisitors || day.pageViews) ? (
          <div className="space-y-3">
            {data.series.map((day) => (
              <div key={day.date} className="grid grid-cols-[5rem_1fr_8rem] items-center gap-3 text-sm">
                <div className="font-medium text-gray-700">{formatDate(day.date)}</div>
                <div className="h-8 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="flex h-full items-center rounded-full bg-primary-600 px-3 text-xs font-semibold text-white"
                    style={{ width: `${Math.max(8, (day.uniqueVisitors / maxVisitors) * 100)}%` }}
                  >
                    {formatNumber(day.uniqueVisitors)}
                  </div>
                </div>
                <div className="text-right text-gray-500">{formatNumber(day.pageViews)} views</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
            Todavía no hay visitas registradas. Los datos comenzarán a aparecer cuando entren visitantes.
          </div>
        )}
      </div>
    </div>
  );
}
