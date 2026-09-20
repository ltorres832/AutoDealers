'use client';

import { useCallback, useEffect, useState } from 'react';

interface UsageMetricRow {
  metric: string;
  label: string;
  used: number;
  limit: number | null;
  extraUnits: number;
  effectiveLimit: number | null;
  percentUsed: number | null;
  overLimit: boolean;
}

interface UsageChargeRow {
  id: string;
  metric: string;
  units: number;
  totalUsd: number;
  status: string;
  description: string;
  stripeInvoiceUrl?: string;
  createdAt?: string;
}

interface UsageApiResponse {
  period: string;
  metrics: UsageMetricRow[];
  overageBillingEnabled: boolean;
  charges?: UsageChargeRow[];
}

export interface UsageMonthWidgetProps {
  /** Ruta del API que devuelve el snapshot de uso (GET) */
  apiPath?: string;
  /** Fetch con auth de la app (por defecto window.fetch) */
  fetchFn?: (url: string) => Promise<Response>;
  /** Link para mejorar plan / comprar paquetes */
  upgradeHref?: string;
  showTitle?: boolean;
  /** Solo mostrar métricas con límite definido (oculta ilimitadas) */
  onlyLimited?: boolean;
  className?: string;
}

function barColor(pct: number | null, overLimit: boolean): string {
  if (overLimit) return 'bg-red-500';
  if (pct === null) return 'bg-gray-300';
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 75) return 'bg-yellow-500';
  return 'bg-green-500';
}

function chargeStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'invoiced':
      return 'Facturado';
    case 'paid':
      return 'Pagado';
    case 'failed':
      return 'Fallido';
    case 'waived':
      return 'Exonerado';
    default:
      return status;
  }
}

function chargeStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-700';
    case 'pending':
    case 'invoiced':
      return 'bg-yellow-100 text-yellow-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function UsageMonthWidget({
  apiPath = '/api/settings/usage',
  fetchFn,
  upgradeHref = '/settings/membership',
  showTitle = true,
  onlyLimited = true,
  className = '',
}: UsageMonthWidgetProps) {
  const [data, setData] = useState<UsageApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const doFetch = fetchFn || ((url: string) => fetch(url, { credentials: 'include' }));
      const res = await doFetch(apiPath);
      if (!res.ok) throw new Error('No se pudo cargar el uso del mes');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Error cargando uso');
    } finally {
      setLoading(false);
    }
  }, [apiPath, fetchFn]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={load} className="mt-2 text-sm text-blue-600 hover:underline">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const metrics = onlyLimited
    ? data.metrics.filter((m) => m.effectiveLimit !== null)
    : data.metrics;
  const anyNearLimit = metrics.some(
    (m) => m.overLimit || (m.percentUsed !== null && m.percentUsed >= 90)
  );
  const charges = data.charges || [];

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            📊 Uso del mes ({data.period})
          </h3>
          <button onClick={load} className="text-sm text-blue-600 hover:underline">
            Actualizar
          </button>
        </div>
      )}

      {metrics.length === 0 ? (
        <p className="text-sm text-gray-500">
          Tu plan no tiene límites mensuales configurados. Uso ilimitado.
        </p>
      ) : (
        <div className="space-y-4">
          {metrics.map((m) => (
            <div key={m.metric}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{m.label}</span>
                <span className={m.overLimit ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                  {m.used.toLocaleString()}
                  {m.effectiveLimit !== null && ` / ${m.effectiveLimit.toLocaleString()}`}
                  {m.extraUnits > 0 && (
                    <span className="ml-1 text-xs text-blue-600">
                      (+{m.extraUnits.toLocaleString()} extra)
                    </span>
                  )}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${barColor(m.percentUsed, m.overLimit)}`}
                  style={{ width: `${Math.min(100, m.percentUsed ?? 0)}%` }}
                />
              </div>
              {m.overLimit && (
                <p className="text-xs text-red-600 mt-1">
                  {data.overageBillingEnabled
                    ? 'Límite excedido: el uso adicional se facturará automáticamente.'
                    : 'Límite alcanzado: mejora tu plan o compra un paquete adicional.'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {anyNearLimit && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between gap-3">
          <p className="text-sm text-yellow-800">
            Estás cerca del límite de tu plan este mes.
          </p>
          <a
            href={upgradeHref}
            className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Mejorar plan
          </a>
        </div>
      )}

      {charges.length > 0 && (
        <div className="mt-5 border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">
            Cargos por uso adicional
          </h4>
          <div className="space-y-2">
            {charges.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-gray-700 truncate">{c.description}</p>
                  {c.stripeInvoiceUrl && (
                    <a
                      href={c.stripeInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver factura
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="font-medium text-gray-900">
                    ${c.totalUsd.toFixed(2)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${chargeStatusColor(c.status)}`}
                  >
                    {chargeStatusLabel(c.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
