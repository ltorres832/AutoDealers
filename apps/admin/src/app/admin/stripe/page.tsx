'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface StripeStats {
  balance: {
    available: { amount: number; currency: string }[];
    pending: { amount: number; currency: string }[];
  };
  subscriptions: {
    active: number;
    totalMRR: number;
  };
  revenue: {
    lastMonth: number;
    transactionsCount: number;
  };
  customers: {
    total: number;
  };
  products: {
    total: number;
  };
}

interface StripeInfrastructureStatus {
  mode: 'test' | 'live';
  accountId: string;
  accountName: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  connectTransfersEnabled: boolean;
  webhookUrl: string;
  webhookSecretConfigured: boolean;
  webhookReady: boolean;
  webhookEndpoints: Array<{
    id: string;
    url: string;
    status: string;
    missingEvents: string[];
    matchesTarget: boolean;
  }>;
  balance: {
    available: number;
    pending: number;
    connectReserved: number;
    currency: string;
  };
  affiliates: {
    total: number;
    connectReady: number;
    connectPending: number;
    withoutConnect: number;
    pendingCommissionAmount: number;
    deferredCommissionAmount: number;
    failedCommissionCount: number;
    paidCommissionAmount: number;
  };
  recentAffiliateTransfers: Array<{
    id: string;
    amount: number;
    currency: string;
    created: string;
    commissionId: string | null;
    affiliateId: string | null;
    reversed: boolean;
  }>;
  nextAffiliatePayoutHint: string;
}

export default function StripeManagementPage() {
  const [stats, setStats] = useState<StripeStats | null>(null);
  const [infra, setInfra] = useState<StripeInfrastructureStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [infraLoading, setInfraLoading] = useState(true);
  const [syncingWebhook, setSyncingWebhook] = useState(false);
  const [runningPayouts, setRunningPayouts] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadInfrastructure = useCallback(async () => {
    setInfraLoading(true);
    try {
      const res = await fetch('/api/admin/stripe/infrastructure', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando infraestructura');
      setInfra(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar Stripe');
    } finally {
      setInfraLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/admin/stripe/dashboard', { credentials: 'include' });
        const data = await response.json();
        setStats(data.stats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    loadInfrastructure();
  }, [loadInfrastructure]);

  async function syncWebhook() {
    setSyncingWebhook(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/stripe/ensure-webhook', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo sincronizar');
      const note = data.appHostingWebhookNote ? ` ${data.appHostingWebhookNote}` : '';
      setMessage(`${data.message || 'Webhook sincronizado'}${note}`);
      if (data.status) setInfra(data.status);
      else await loadInfrastructure();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al sincronizar webhook');
    } finally {
      setSyncingWebhook(false);
    }
  }

  async function runAffiliatePayoutsNow() {
    setRunningPayouts(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/affiliate-commissions/run-payouts', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron procesar pagos');
      setMessage(
        `Pagos procesados: ${data.processed ?? 0}, diferidos: ${data.deferred ?? 0}, fallidos: ${data.failed ?? 0}`
      );
      await loadInfrastructure();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar pagos');
    } finally {
      setRunningPayouts(false);
    }
  }

  function formatCurrency(amount: number, currency: string = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  if (loading && infraLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const targetWebhook = infra?.webhookEndpoints.find((w) => w.matchesTarget);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Stripe</h1>
        <p className="text-gray-600">
          Estado de webhooks, Connect, balance y pagos a afiliados — sin salir del admin
        </p>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {infra && (
        <div className="bg-white rounded-lg shadow p-6 mb-8 space-y-6">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-semibold">Infraestructura Stripe</h2>
              <p className="text-sm text-gray-500 mt-1">
                Cuenta {infra.accountName || infra.accountId} ·{' '}
                <span
                  className={
                    infra.mode === 'live'
                      ? 'text-green-700 font-medium'
                      : 'text-amber-700 font-medium'
                  }
                >
                  Modo {infra.mode === 'live' ? 'LIVE' : 'TEST'}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={syncWebhook}
                disabled={syncingWebhook}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-60"
              >
                {syncingWebhook ? 'Sincronizando…' : 'Sincronizar webhook'}
              </button>
              <button
                type="button"
                onClick={runAffiliatePayoutsNow}
                disabled={runningPayouts}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                {runningPayouts ? 'Procesando…' : 'Ejecutar pagos afiliados ahora'}
              </button>
            </div>
          </div>

          {infra.mode === 'test' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Estás en modo <strong>TEST</strong>. Para producción, guarda las claves{' '}
              <code className="text-xs">sk_live_...</code> y <code className="text-xs">pk_live_...</code>{' '}
              en Configuración → Stripe y pulsa <strong>Sincronizar webhook</strong> de nuevo.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">Webhook admin</div>
              <div
                className={`text-lg font-semibold ${infra.webhookReady ? 'text-green-700' : 'text-amber-700'}`}
              >
                {infra.webhookReady ? 'Listo' : 'Requiere acción'}
              </div>
              <div className="text-xs text-gray-500 mt-1 break-all">{infra.webhookUrl}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">Stripe Connect</div>
              <div
                className={`text-lg font-semibold ${infra.connectTransfersEnabled ? 'text-green-700' : 'text-red-700'}`}
              >
                {infra.connectTransfersEnabled ? 'Transfers activos' : 'Transfers inactivos'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Cobros: {infra.chargesEnabled ? 'sí' : 'no'} · Payouts plataforma:{' '}
                {infra.payoutsEnabled ? 'sí' : 'no'}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">Balance plataforma</div>
              <div className="text-lg font-semibold">
                {formatCurrency(infra.balance.available, infra.balance.currency)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Pendiente: {formatCurrency(infra.balance.pending, infra.balance.currency)} · Connect
                reservado: {formatCurrency(infra.balance.connectReserved, infra.balance.currency)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">Afiliados Connect</div>
              <div className="text-lg font-semibold text-green-700">{infra.affiliates.connectReady} listos</div>
              <div className="text-xs text-gray-500 mt-1">
                {infra.affiliates.connectPending} onboarding · {infra.affiliates.withoutConnect} sin cuenta
              </div>
            </div>
          </div>

          {targetWebhook && targetWebhook.missingEvents.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
              Faltan eventos en el webhook: {targetWebhook.missingEvents.join(', ')}. Pulsa sincronizar.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Comisiones afiliados</h3>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>
                  Pendientes (próximo lunes):{' '}
                  <strong>{formatCurrency(infra.affiliates.pendingCommissionAmount)}</strong>
                </li>
                <li>
                  Diferidas (sin Connect):{' '}
                  <strong>{formatCurrency(infra.affiliates.deferredCommissionAmount)}</strong>
                </li>
                <li>
                  Fallidas: <strong>{infra.affiliates.failedCommissionCount}</strong>
                </li>
                <li>
                  Pagadas vía Stripe:{' '}
                  <strong>{formatCurrency(infra.affiliates.paidCommissionAmount)}</strong>
                </li>
                <li className="text-gray-500 pt-1">{infra.nextAffiliatePayoutHint}</li>
              </ul>
              <Link
                href="/admin/referrals/affiliates"
                className="inline-block mt-3 text-sm text-primary-600 hover:underline"
              >
                Ver afiliados y comisiones →
              </Link>
            </div>
            <div>
              <h3 className="font-medium mb-2">Últimas transferencias a afiliados</h3>
              {infra.recentAffiliateTransfers.length === 0 ? (
                <p className="text-sm text-gray-500">Aún no hay transferencias registradas.</p>
              ) : (
                <ul className="text-sm space-y-2 max-h-48 overflow-y-auto">
                  {infra.recentAffiliateTransfers.map((t) => (
                    <li key={t.id} className="border rounded px-3 py-2">
                      <div className="font-medium">
                        {formatCurrency(t.amount, t.currency)}
                        {t.reversed && (
                          <span className="ml-2 text-red-600 text-xs">revertida</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{t.id}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(t.created).toLocaleString()}
                        {t.commissionId ? ` · comisión ${t.commissionId}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">MRR Mensual</h3>
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(stats.subscriptions.totalMRR)}</div>
            <p className="text-xs opacity-75 mt-1">{stats.subscriptions.active} suscripciones activas</p>
          </div>
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Ingresos (30 días)</h3>
              <span className="text-2xl">📈</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(stats.revenue.lastMonth)}</div>
            <p className="text-xs opacity-75 mt-1">{stats.revenue.transactionsCount} transacciones</p>
          </div>
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Balance Disponible</h3>
              <span className="text-2xl">💵</span>
            </div>
            <div className="text-3xl font-bold">
              {stats.balance.available[0]
                ? formatCurrency(stats.balance.available[0].amount, stats.balance.available[0].currency)
                : '$0'}
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Clientes</h3>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-3xl font-bold">{stats.customers.total}+</div>
            <p className="text-xs opacity-75 mt-1">{stats.products.total} productos activos</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Gestión Rápida</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/stripe/subscriptions"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
          >
            <span className="text-3xl">📋</span>
            <div>
              <div className="font-semibold">Suscripciones</div>
              <div className="text-sm text-gray-500">Ver y gestionar</div>
            </div>
          </Link>
          <Link
            href="/admin/stripe/payments"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
          >
            <span className="text-3xl">💳</span>
            <div>
              <div className="font-semibold">Pagos</div>
              <div className="text-sm text-gray-500">Transacciones</div>
            </div>
          </Link>
          <Link
            href="/admin/referrals/affiliates"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
          >
            <span className="text-3xl">🤝</span>
            <div>
              <div className="font-semibold">Afiliados</div>
              <div className="text-sm text-gray-500">Comisiones y Connect</div>
            </div>
          </Link>
          <Link
            href="/admin/settings/general"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
          >
            <span className="text-3xl">⚙️</span>
            <div>
              <div className="font-semibold">Credenciales Stripe</div>
              <div className="text-sm text-gray-500">Claves y webhook secret</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
