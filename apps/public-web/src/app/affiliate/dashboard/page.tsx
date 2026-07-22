'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface StripeConnectStatus {
  accountId: string | null;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
}

interface DashboardData {
  affiliate: {
    id: string;
    name: string;
    email: string;
    referralCode: string;
    commissionSeller?: number;
    commissionDealerBasic?: number;
    commissionDealerOther?: number;
    commissionDealer?: number;
  };
  referralLink: string;
  commissionConfig: { seller: number; dealerBasic: number; dealerOther: number; currency: string };
  referrals: Array<{
    id: string;
    referredEmail: string;
    userType: string;
    status: string;
    createdAt: string | null;
  }>;
  commissions: Array<{
    id: string;
    referredEmail: string;
    userType: string;
    dealerPlanTier?: 'basic' | 'other';
    amount: number;
    currency: string;
    status: string;
    payoutStatus?: string;
    paidAt: string | null;
  }>;
  stripeConnect: StripeConnectStatus;
  stats: {
    totalReferred: number;
    pendingReferrals: number;
    pendingPayout: number;
    totalPaid: number;
  };
}

function referralStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Esperando activación',
    confirmed: 'Período de prueba (14 días)',
    rewarded: 'Comisión generada',
    cancelled: 'Cancelado',
  };
  return map[status] || status;
}

function commissionStatusLabel(status: string, payoutStatus?: string) {
  if (status === 'paid') return 'Pagada (Stripe)';
  if (status === 'cancelled') return 'Cancelada';
  if (payoutStatus === 'processing') return 'Procesando transferencia';
  if (payoutStatus === 'deferred') return 'Pendiente: conectar Stripe';
  if (payoutStatus === 'failed') return 'Error de pago';
  if (status === 'approved') return 'Pendiente (pago los lunes)';
  return status;
}

function statusClass(status: string, payoutStatus?: string) {
  if (status === 'paid') return 'bg-green-100 text-green-800';
  if (status === 'cancelled' || payoutStatus === 'failed') return 'bg-red-100 text-red-800';
  if (status === 'approved' || status === 'confirmed' || status === 'rewarded') {
    return 'bg-yellow-100 text-yellow-800';
  }
  if (payoutStatus === 'deferred') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
}

function connectStatusLabel(connect: StripeConnectStatus) {
  if (connect.payoutsEnabled) return 'Listo para recibir pagos';
  if (connect.accountId) return 'Onboarding pendiente';
  return 'Sin cuenta conectada';
}

function userTypeLabel(type: string, dealerPlanTier?: 'basic' | 'other') {
  if (type !== 'dealer') return 'Vendedor';
  if (dealerPlanTier === 'basic') return 'Dealer básico';
  if (dealerPlanTier === 'other') return 'Dealer otro plan';
  return 'Dealer';
}

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'referrals' | 'commissions' | 'payout'>('referrals');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectMessage, setConnectMessage] = useState('');
  const [connectError, setConnectError] = useState('');

  const loadDashboard = useCallback(async () => {
    const res = await fetch('/api/affiliate/dashboard', { credentials: 'include' });
    if (res.status === 401) {
      router.replace('/affiliate/login');
      return null;
    }
    const json = await res.json();
    if (json && !json.error) {
      setData(json);
    }
    return json;
  }, [router]);

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard]);

  useEffect(() => {
    const connectParam = searchParams.get('connect');
    if (connectParam === 'return' || connectParam === 'refresh') {
      setConnectMessage(
        connectParam === 'return'
          ? 'Onboarding completado. Verificando estado de tu cuenta Stripe…'
          : 'Continúa configurando tu cuenta Stripe para recibir pagos.'
      );
      setTab('payout');
      loadDashboard();
    }
  }, [searchParams, loadDashboard]);

  async function logout() {
    await fetch('/api/affiliate/logout', { method: 'POST', credentials: 'include' });
    router.push('/affiliate/login');
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function startStripeConnect() {
    setConnectLoading(true);
    setConnectError('');
    setConnectMessage('');
    try {
      const res = await fetch('/api/affiliate/stripe-connect/onboard', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo iniciar Stripe Connect');
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      throw new Error('Stripe no devolvió URL de onboarding');
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Error al conectar Stripe');
    } finally {
      setConnectLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No se pudo cargar tu panel.</p>
          <Link href="/affiliate/login" className="text-primary-600 hover:underline">
            Volver al login
          </Link>
        </div>
      </div>
    );
  }

  const connectReady = data.stripeConnect?.payoutsEnabled === true;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Hola, {data.affiliate.name}</h1>
            <p className="text-sm text-gray-500">{data.affiliate.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-gray-600 hover:text-gray-900 border rounded-lg px-3 py-1.5"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {!connectReady && data.stats.pendingPayout > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Tienes comisiones pendientes. Conecta tu{' '}
            <button
              type="button"
              onClick={() => setTab('payout')}
              className="font-semibold underline"
            >
              cuenta Stripe
            </button>{' '}
            para recibir pagos automáticos cada lunes.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Referidos totales</div>
            <div className="text-2xl font-bold">{data.stats.totalReferred}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">En proceso</div>
            <div className="text-2xl font-bold text-yellow-600">{data.stats.pendingReferrals}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Pendiente de cobro</div>
            <div className="text-2xl font-bold text-orange-600">${data.stats.pendingPayout}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Total recibido</div>
            <div className="text-2xl font-bold text-green-600">${data.stats.totalPaid}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Tu link de referido</h2>
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <code className="bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono">
              {data.affiliate.referralCode}
            </code>
            <button
              type="button"
              onClick={() => copyLink(data.referralLink)}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
            >
              {copied ? '¡Copiado!' : 'Copiar link'}
            </button>
          </div>
          <p className="text-sm text-gray-600 break-all">{data.referralLink}</p>
          <p className="text-sm text-gray-500 mt-3">
            <strong>Gana comisión en efectivo</strong> por cada vendedor o dealer que se registre con tu
            código. Cuando generes comisiones, verás el monto en la pestaña Comisiones y el pago se
            transfiere vía Stripe los lunes.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="border-b border-gray-200 flex flex-wrap">
            {(
              [
                ['referrals', `Referidos (${data.referrals.length})`],
                ['commissions', `Comisiones (${data.commissions.length})`],
                ['payout', 'Cobros Stripe'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-4 py-3 text-sm font-medium ${
                  tab === key
                    ? 'border-b-2 border-primary-600 text-primary-700'
                    : 'text-gray-600'
                }`}
              >
                {label}
                {key === 'payout' && !connectReady && (
                  <span className="ml-2 inline-block w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            ))}
          </div>

          {tab === 'referrals' && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-500">Referido</th>
                    <th className="px-4 py-3 text-left text-gray-500">Tipo de cuenta</th>
                    <th className="px-4 py-3 text-left text-gray-500">Estado</th>
                    <th className="px-4 py-3 text-left text-gray-500">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.referrals.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        Aún no tienes referidos. Comparte tu link para empezar.
                      </td>
                    </tr>
                  ) : (
                    data.referrals.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3">{r.referredEmail}</td>
                        <td className="px-4 py-3">{userTypeLabel(r.userType)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${statusClass(r.status)}`}>
                            {referralStatusLabel(r.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'commissions' && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-500">Referido</th>
                    <th className="px-4 py-3 text-left text-gray-500">Tipo</th>
                    <th className="px-4 py-3 text-left text-gray-500">Monto</th>
                    <th className="px-4 py-3 text-left text-gray-500">Estado</th>
                    <th className="px-4 py-3 text-left text-gray-500">Fecha pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.commissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Las comisiones aparecen cuando el referido completa la prueba y se cobra la
                        membresía.
                      </td>
                    </tr>
                  ) : (
                    data.commissions.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3">{c.referredEmail}</td>
                        <td className="px-4 py-3">{userTypeLabel(c.userType, c.dealerPlanTier)}</td>
                        <td className="px-4 py-3 font-semibold">
                          ${c.amount} {c.currency}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${statusClass(c.status, c.payoutStatus)}`}
                          >
                            {commissionStatusLabel(c.status, c.payoutStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {c.paidAt ? new Date(c.paidAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'payout' && (
            <div className="p-6 max-w-xl">
              <h3 className="text-lg font-semibold mb-1">Recibe pagos con Stripe</h3>
              <p className="text-sm text-gray-600 mb-4">
                Conecta tu cuenta bancaria vía Stripe Connect. Las comisiones aprobadas se pagan
                automáticamente cada lunes.
              </p>

              <div
                className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                  connectReady
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : data.stripeConnect?.accountId
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <p className="font-medium">{connectStatusLabel(data.stripeConnect)}</p>
                {data.stripeConnect?.accountId && (
                  <p className="text-xs mt-1 opacity-80">
                    Cuenta Stripe: {data.stripeConnect.accountId}
                  </p>
                )}
              </div>

              {connectMessage && (
                <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                  {connectMessage}
                </div>
              )}
              {connectError && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                  {connectError}
                </div>
              )}

              {!connectReady && (
                <button
                  type="button"
                  onClick={startStripeConnect}
                  disabled={connectLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60"
                >
                  {connectLoading
                    ? 'Redirigiendo a Stripe…'
                    : data.stripeConnect?.accountId
                      ? 'Continuar onboarding Stripe'
                      : 'Conectar cuenta Stripe para recibir pagos'}
                </button>
              )}

              {connectReady && (
                <p className="text-sm text-gray-600">
                  Tu cuenta está lista. Si necesitas actualizar datos bancarios, usa el botón de
                  abajo.
                </p>
              )}

              {connectReady && (
                <button
                  type="button"
                  onClick={startStripeConnect}
                  disabled={connectLoading}
                  className="mt-3 text-sm text-primary-600 hover:underline disabled:opacity-60"
                >
                  Actualizar información en Stripe
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
