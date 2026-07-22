'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'affiliates' | 'commissions' | 'config';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  referralCode: string;
  referralLink?: string;
  status?: 'active' | 'inactive';
  commissionSeller?: number;
  commissionDealerBasic?: number;
  commissionDealerOther?: number;
  commissionDealer?: number;
  paymentMethod?: string;
  paymentNotes?: string;
  payoutProfileConfigured?: boolean;
  payoutProfileSummary?: string;
  stripeConnectAccountId?: string | null;
  stripeConnectOnboardingComplete?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  portalEnabled?: boolean;
  selfRegistered?: boolean;
  authUserId?: string;
  stats?: {
    totalReferred: number;
    totalCommissions: number;
    pendingPayout: number;
    totalPaid: number;
  };
}

interface Commission {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  referredEmail: string;
  userType: 'seller' | 'dealer';
  dealerPlanTier?: 'basic' | 'other';
  amount: number;
  currency: string;
  status: 'approved' | 'paid' | 'cancelled';
  payoutStatus?: string | null;
  stripeTransferId?: string | null;
  payoutError?: string | null;
  eligibleAt?: string | null;
  referralCode: string;
  approvedAt?: string;
  paidAt?: string;
  paymentReference?: string;
  paymentNotes?: string;
  affiliatePayoutConfigured?: boolean;
  affiliatePayoutSummary?: string;
  affiliatePayoutProfile?: {
    method?: string;
    accountHolder?: string;
    zelleEmail?: string;
    zellePhone?: string;
    bankName?: string;
    routingNumber?: string;
    accountNumber?: string;
    accountType?: string;
    paypalEmail?: string;
    otherDetails?: string;
  } | null;
}

interface CommissionConfig {
  seller: number;
  dealerBasic: number;
  dealerOther: number;
  currency: string;
}

const emptyAffiliateForm = {
  name: '',
  email: '',
  phone: '',
  commissionSeller: '',
  commissionDealerBasic: '',
  commissionDealerOther: '',
  paymentMethod: '',
  paymentNotes: '',
};

const PUBLIC_WEB_BASE =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PUBLIC_WEB_URL
    ? process.env.NEXT_PUBLIC_PUBLIC_WEB_URL.replace(/\/$/, '')
    : 'https://www.autodealers-online.com';

function previewAffiliateReferralCode(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 24);
  return `${slug || 'AFILIADO'}${new Date().getFullYear()}`;
}

function affiliateConnectLabel(a: Affiliate) {
  if (a.stripeConnectPayoutsEnabled) return 'Conectado';
  if (a.stripeConnectAccountId) return 'Onboarding pendiente';
  return 'Sin cuenta';
}

function commissionPayoutLabel(c: Commission) {
  if (c.status === 'paid') return 'Pagada Stripe';
  if (c.status === 'cancelled') return 'Cancelada';
  if (c.payoutStatus === 'processing') return 'Procesando';
  if (c.payoutStatus === 'deferred') return 'Diferida';
  if (c.payoutStatus === 'failed') return 'Fallida';
  if (c.status === 'approved') return 'Pendiente lunes';
  return c.status;
}

function commissionPayoutClass(c: Commission) {
  if (c.status === 'paid') return 'bg-green-100 text-green-800';
  if (c.status === 'cancelled' || c.payoutStatus === 'failed') return 'bg-red-100 text-red-800';
  if (c.payoutStatus === 'deferred') return 'bg-amber-100 text-amber-800';
  if (c.payoutStatus === 'processing') return 'bg-blue-100 text-blue-800';
  return 'bg-yellow-100 text-yellow-800';
}

export default function AffiliatesAdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('affiliates');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commissionStats, setCommissionStats] = useState({
    pendingAmount: 0,
    paidAmount: 0,
    approved: 0,
    paid: 0,
  });
  const [commissionFilter, setCommissionFilter] = useState<'all' | 'approved' | 'paid'>('approved');
  const [config, setConfig] = useState<CommissionConfig>({
    seller: 50,
    dealerBasic: 100,
    dealerOther: 200,
    currency: 'USD',
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyAffiliateForm);
  const [creating, setCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    temporaryPassword?: string;
    portalUrl: string;
  } | null>(null);

  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [editForm, setEditForm] = useState(emptyAffiliateForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const [retryingCommissionId, setRetryingCommissionId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [detailCommission, setDetailCommission] = useState<Commission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<{
    commission: Record<string, unknown> | null;
    transfer: Record<string, unknown> | null;
    connectAccount: Record<string, unknown> | null;
  } | null>(null);

  const fetchAffiliates = useCallback(async () => {
    const res = await fetch('/api/admin/affiliates', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando afiliados');
    setAffiliates(data.affiliates || []);
  }, []);

  const fetchCommissions = useCallback(async () => {
    const params = new URLSearchParams();
    if (commissionFilter !== 'all') params.set('status', commissionFilter);
    const res = await fetch(`/api/admin/affiliate-commissions?${params}`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando comisiones');
    setCommissions(data.commissions || []);
    setCommissionStats({
      pendingAmount: data.stats?.pendingAmount ?? 0,
      paidAmount: data.stats?.paidAmount ?? 0,
      approved: data.stats?.approved ?? 0,
      paid: data.stats?.paid ?? 0,
    });
  }, [commissionFilter]);

  const fetchConfig = useCallback(async () => {
    const res = await fetch('/api/admin/affiliates/config', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando config');
    if (data.config) {
      const c = data.config as CommissionConfig & { dealer?: number };
      setConfig({
        seller: Number(c.seller) || 50,
        dealerBasic: Number(c.dealerBasic) || 100,
        dealerOther: Number(c.dealerOther ?? c.dealer) || 200,
        currency: c.currency || 'USD',
      });
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        await Promise.all([fetchAffiliates(), fetchCommissions(), fetchConfig()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fetchAffiliates, fetchCommissions, fetchConfig]);

  useEffect(() => {
    if (!loading) {
      fetchCommissions().catch((err) =>
        setError(err instanceof Error ? err.message : 'Error al cargar comisiones')
      );
    }
  }, [commissionFilter, fetchCommissions, loading]);

  async function handleCreateAffiliate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/affiliates', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          phone: createForm.phone || undefined,
          commissionSeller: createForm.commissionSeller ? Number(createForm.commissionSeller) : undefined,
          commissionDealerBasic: createForm.commissionDealerBasic
            ? Number(createForm.commissionDealerBasic)
            : undefined,
          commissionDealerOther: createForm.commissionDealerOther
            ? Number(createForm.commissionDealerOther)
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear');
      setCreatedCredentials({
        email: createForm.email,
        temporaryPassword: data.temporaryPassword,
        portalUrl: data.portalUrl || '/affiliate/login',
      });
      setMessage(`Afiliado creado: ${data.affiliate?.referralCode}`);
      setShowCreateModal(false);
      setCreateForm(emptyAffiliateForm);
      await fetchAffiliates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setCreating(false);
    }
  }

  function openEdit(affiliate: Affiliate) {
    setEditingAffiliate(affiliate);
    setEditForm({
      name: affiliate.name,
      email: affiliate.email,
      phone: affiliate.phone || '',
      commissionSeller: affiliate.commissionSeller?.toString() || '',
      commissionDealerBasic: affiliate.commissionDealerBasic?.toString() || '',
      commissionDealerOther:
        affiliate.commissionDealerOther?.toString() ||
        affiliate.commissionDealer?.toString() ||
        '',
      paymentMethod: affiliate.paymentMethod || '',
      paymentNotes: affiliate.paymentNotes || '',
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAffiliate) return;
    setSavingEdit(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/affiliates/${editingAffiliate.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          commissionSeller: editForm.commissionSeller ? Number(editForm.commissionSeller) : null,
          commissionDealerBasic: editForm.commissionDealerBasic
            ? Number(editForm.commissionDealerBasic)
            : null,
          commissionDealerOther: editForm.commissionDealerOther
            ? Number(editForm.commissionDealerOther)
            : null,
          status: editingAffiliate.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setMessage('Afiliado actualizado');
      setEditingAffiliate(null);
      await fetchAffiliates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingEdit(false);
    }
  }

  async function provisionPortal(affiliate: Affiliate) {
    if (!confirm(`¿Activar acceso al portal para ${affiliate.name}? Se generará una contraseña temporal.`)) {
      return;
    }
    setError('');
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliate.id}/provision-auth`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setCreatedCredentials({
        email: affiliate.email,
        temporaryPassword: data.temporaryPassword,
        portalUrl: data.portalUrl || '/affiliate/login',
      });
      setMessage('Portal activado');
      await fetchAffiliates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al activar portal');
    }
  }

  async function toggleAffiliateStatus(affiliate: Affiliate) {
    const newStatus = affiliate.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliate.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      await fetchAffiliates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingConfig(true);
    setError('');
    try {
      const res = await fetch('/api/admin/affiliates/config', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setMessage('Configuración de comisiones guardada');
      setConfig(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar config');
    } finally {
      setSavingConfig(false);
    }
  }

  async function openCommissionDetails(commission: Commission) {
    setDetailCommission(commission);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(`/api/admin/affiliate-commissions/${commission.id}/stripe-details`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar detalle');
      setDetailData({
        commission: data.commission,
        transfer: data.transfer,
        connectAccount: data.connectAccount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar detalle Stripe');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleRetryPayout(commissionId: string) {
    setRetryingCommissionId(commissionId);
    setRetrying(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/affiliate-commissions/${commissionId}/retry-payout`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo reintentar el pago');
      setMessage('Transferencia Stripe iniciada correctamente');
      await Promise.all([fetchCommissions(), fetchAffiliates()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reintentar pago');
    } finally {
      setRetrying(false);
      setRetryingCommissionId(null);
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setMessage('Copiado al portapapeles');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap justify-between items-start gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.push('/admin/referrals')}
            className="text-sm text-primary-600 hover:underline mb-2"
          >
            ← Volver a Referidos
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Afiliados externos</h1>
          <p className="text-gray-600 mt-1">
            Personas que refieren dealers y vendedores. Pagos automáticos vía Stripe Connect cada lunes.
            Estado completo en{' '}
            <button
              type="button"
              onClick={() => router.push('/admin/stripe')}
              className="text-primary-600 hover:underline"
            >
              Stripe → Infraestructura
            </button>
            .
          </p>
        </div>
        {tab === 'affiliates' && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Nuevo afiliado
          </button>
        )}
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

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['affiliates', 'commissions', 'config'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t === 'affiliates' ? 'Afiliados' : t === 'commissions' ? 'Comisiones' : 'Montos default'}
          </button>
        ))}
      </div>

      {tab === 'affiliates' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Afiliado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código / Link</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comisiones</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cobro</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Portal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {affiliates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No hay afiliados. Crea el primero para empezar a referir.
                  </td>
                </tr>
              ) : (
                affiliates.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{a.name}</div>
                      <div className="text-sm text-gray-500">{a.email}</div>
                      {a.selfRegistered && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Auto-registro
                        </span>
                      )}
                      {a.phone && <div className="text-xs text-gray-400">{a.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-sm">{a.referralCode}</div>
                      {a.referralLink && (
                        <button
                          type="button"
                          onClick={() => copyText(a.referralLink!)}
                          className="text-xs text-primary-600 hover:underline mt-1"
                        >
                          Copiar link
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>Vendedor: ${a.commissionSeller ?? config.seller}</div>
                      <div>Dealer básico: ${a.commissionDealerBasic ?? config.dealerBasic}</div>
                      <div>Dealer otros planes: ${a.commissionDealerOther ?? a.commissionDealer ?? config.dealerOther}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{a.stats?.totalReferred ?? 0} referidos</div>
                      <div className="text-yellow-700">${a.stats?.pendingPayout ?? 0} pendiente</div>
                      <div className="text-green-700">${a.stats?.totalPaid ?? 0} pagado</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px]">
                      <span
                        className={
                          a.stripeConnectPayoutsEnabled
                            ? 'text-green-700 font-medium'
                            : a.stripeConnectAccountId
                              ? 'text-amber-700'
                              : 'text-gray-500'
                        }
                      >
                        {affiliateConnectLabel(a)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.portalEnabled ? (
                        <span className="text-xs text-green-700 font-medium">Activo</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => provisionPortal(a)}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          Activar portal
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          a.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {a.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="text-sm text-primary-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAffiliateStatus(a)}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        {a.status === 'active' ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'commissions' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Pendientes (pago lunes)</div>
              <div className="text-2xl font-bold text-yellow-600">${commissionStats.pendingAmount}</div>
              <div className="text-xs text-gray-500">{commissionStats.approved} comisiones</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total pagado</div>
              <div className="text-2xl font-bold text-green-600">${commissionStats.paidAmount}</div>
              <div className="text-xs text-gray-500">{commissionStats.paid} comisiones</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-2">Filtro</div>
              <select
                value={commissionFilter}
                onChange={(e) => setCommissionFilter(e.target.value as typeof commissionFilter)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="approved">Pendientes de pago</option>
                <option value="paid">Pagadas</option>
                <option value="all">Todas</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Afiliado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado pago</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No hay comisiones con este filtro.
                    </td>
                  </tr>
                ) : (
                  commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.affiliateName}</div>
                        <div className="text-xs text-gray-500">{c.affiliateEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{c.referredEmail}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {c.userType === 'dealer'
                            ? c.dealerPlanTier === 'basic'
                              ? 'Dealer básico'
                              : 'Dealer otro plan'
                            : 'Vendedor'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ${c.amount} {c.currency}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${commissionPayoutClass(c)}`}
                        >
                          {commissionPayoutLabel(c)}
                        </span>
                        {c.paidAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(c.paidAt).toLocaleDateString()}
                          </div>
                        )}
                        {c.stripeTransferId && (
                          <div className="text-xs text-gray-400 mt-1 truncate max-w-[140px]" title={c.stripeTransferId}>
                            {c.stripeTransferId}
                          </div>
                        )}
                        {c.payoutError && (
                          <div className="text-xs text-red-600 mt-1 max-w-[180px]" title={c.payoutError}>
                            {c.payoutError}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openCommissionDetails(c)}
                          className="text-sm text-gray-600 hover:underline"
                        >
                          Detalle
                        </button>
                        {c.payoutStatus === 'failed' && c.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handleRetryPayout(c.id)}
                            disabled={retrying && retryingCommissionId === c.id}
                            className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-60"
                          >
                            {retrying && retryingCommissionId === c.id ? 'Reintentando…' : 'Reintentar payout'}
                          </button>
                        )}
                        {c.status === 'paid' && c.paymentReference && (
                          <div className="text-xs text-gray-500">Ref: {c.paymentReference}</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'config' && (
        <form onSubmit={handleSaveConfig} className="bg-white rounded-lg shadow p-6 max-w-md">
          <h2 className="text-lg font-semibold mb-4">Montos default por referido</h2>
          <p className="text-sm text-gray-600 mb-4">
            Se aplican cuando el afiliado no tiene montos personalizados.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comisión por vendedor ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={config.seller}
                onChange={(e) => setConfig({ ...config, seller: Number(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comisión por dealer plan básico ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={config.dealerBasic}
                onChange={(e) => setConfig({ ...config, dealerBasic: Number(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comisión por dealer otros planes ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={config.dealerOther}
                onChange={(e) => setConfig({ ...config, dealerOther: Number(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <input
                type="text"
                value={config.currency}
                onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={savingConfig}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60"
            >
              {savingConfig ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        </form>
      )}

      {createdCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2">Acceso al portal</h2>
            <p className="text-sm text-gray-600 mb-4">
              Comparte estas credenciales con el afiliado. La contraseña temporal solo se muestra una vez.
            </p>
            <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4 mb-4">
              <p>
                <span className="text-gray-500">URL:</span>{' '}
                <a href={createdCredentials.portalUrl} className="text-primary-600 break-all">
                  {createdCredentials.portalUrl}
                </a>
              </p>
              <p>
                <span className="text-gray-500">Email:</span> {createdCredentials.email}
              </p>
              {createdCredentials.temporaryPassword && (
                <p>
                  <span className="text-gray-500">Contraseña temporal:</span>{' '}
                  <code className="font-mono bg-white px-2 py-1 rounded border">
                    {createdCredentials.temporaryPassword}
                  </code>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCreatedCredentials(null)}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">Nuevo afiliado</h2>
            <form onSubmit={handleCreateAffiliate} className="space-y-3">
              <input
                required
                placeholder="Nombre *"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                required
                type="email"
                placeholder="Email *"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                placeholder="Teléfono"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500 mb-1">Código de referido (automático)</p>
                <p className="font-mono text-sm text-gray-900">
                  {createForm.name.trim()
                    ? previewAffiliateReferralCode(createForm.name)
                    : 'NOMBRE2026'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Se genera del nombre + año. Si ya existe, el sistema añade un número (ej. JUAN20262).
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder={`Vendedor (default $${config.seller})`}
                  value={createForm.commissionSeller}
                  onChange={(e) => setCreateForm({ ...createForm, commissionSeller: e.target.value })}
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  min="0"
                  placeholder={`Dealer básico ($${config.dealerBasic})`}
                  value={createForm.commissionDealerBasic}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, commissionDealerBasic: e.target.value })
                  }
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  min="0"
                  placeholder={`Dealer otros ($${config.dealerOther})`}
                  value={createForm.commissionDealerOther}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, commissionDealerOther: e.target.value })
                  }
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              <p className="text-xs text-gray-500">
                El afiliado conectará su cuenta bancaria vía Stripe Connect desde su portal.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                >
                  {creating ? 'Creando…' : 'Crear afiliado'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingAffiliate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">Editar afiliado</h2>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                required
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Teléfono"
              />
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500 mb-1">Código de referido</p>
                <p className="font-mono text-sm">{editingAffiliate.referralCode}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Comisión vendedor"
                  value={editForm.commissionSeller}
                  onChange={(e) => setEditForm({ ...editForm, commissionSeller: e.target.value })}
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Dealer básico"
                  value={editForm.commissionDealerBasic}
                  onChange={(e) =>
                    setEditForm({ ...editForm, commissionDealerBasic: e.target.value })
                  }
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Dealer otros planes"
                  value={editForm.commissionDealerOther}
                  onChange={(e) =>
                    setEditForm({ ...editForm, commissionDealerOther: e.target.value })
                  }
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              {editingAffiliate.stripeConnectPayoutsEnabled && (
                <div className="rounded-lg bg-green-50 border px-3 py-2 text-sm text-green-800">
                  Stripe Connect: conectado
                </div>
              )}
              {editingAffiliate.stripeConnectAccountId && !editingAffiliate.stripeConnectPayoutsEnabled && (
                <div className="rounded-lg bg-amber-50 border px-3 py-2 text-sm text-amber-900">
                  Stripe Connect: onboarding pendiente
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-60"
                >
                  {savingEdit ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAffiliate(null)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-2">Detalle de comisión</h2>
            <p className="text-sm text-gray-600 mb-4">
              ${detailCommission.amount} · {detailCommission.affiliateName} ·{' '}
              {detailCommission.referredEmail}
            </p>
            {detailLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="rounded-lg bg-gray-50 border px-4 py-3">
                  <p className="font-medium text-gray-800">Estado</p>
                  <p>{commissionPayoutLabel(detailCommission)}</p>
                  {detailCommission.payoutError && (
                    <p className="text-red-600 mt-1">{detailCommission.payoutError}</p>
                  )}
                  {detailCommission.eligibleAt && (
                    <p className="text-gray-500 mt-1">
                      Elegible: {new Date(detailCommission.eligibleAt).toLocaleString()}
                    </p>
                  )}
                </div>
                {detailData?.transfer ? (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                    <p className="font-medium text-green-900">Transferencia Stripe</p>
                    <p className="font-mono text-xs break-all">{String(detailData.transfer.id)}</p>
                    <p>
                      ${String(detailData.transfer.amount)} {String(detailData.transfer.currency)}
                    </p>
                    <p className="text-gray-600">
                      {detailData.transfer.created
                        ? new Date(String(detailData.transfer.created)).toLocaleString()
                        : ''}
                    </p>
                  </div>
                ) : detailCommission.stripeTransferId ? (
                  <div className="rounded-lg bg-gray-50 border px-4 py-3">
                    <p className="font-medium">Transfer ID</p>
                    <p className="font-mono text-xs break-all">{detailCommission.stripeTransferId}</p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900">
                    Sin transferencia Stripe aún (pendiente de lunes o Connect incompleto).
                  </div>
                )}
                {detailData?.connectAccount && (
                  <div className="rounded-lg bg-gray-50 border px-4 py-3">
                    <p className="font-medium">Cuenta Connect del afiliado</p>
                    <p className="font-mono text-xs break-all">{String(detailData.connectAccount.id)}</p>
                    <p>
                      Payouts:{' '}
                      {detailData.connectAccount.payoutsEnabled ? 'habilitados' : 'pendientes'}
                    </p>
                    {Array.isArray(detailData.connectAccount.requirementsDue) &&
                      detailData.connectAccount.requirementsDue.length > 0 && (
                        <p className="text-amber-700 mt-1">
                          Requisitos pendientes:{' '}
                          {(detailData.connectAccount.requirementsDue as string[]).join(', ')}
                        </p>
                      )}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setDetailCommission(null);
                setDetailData(null);
              }}
              className="mt-6 w-full px-4 py-2 border rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
