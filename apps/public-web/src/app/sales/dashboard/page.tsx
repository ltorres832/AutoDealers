'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SalesConfigAccessPanel } from './SalesConfigAccessPanel';
import {
  useRealtimeSalesDashboard,
  type SalesRealtimeSlice,
} from '@/hooks/useRealtimeSalesDashboard';

type Role = 'dealer' | 'seller' | 'business';
type Relation = 'current' | 'former';
type Tab = 'membresias' | 'pagos' | 'visitas' | 'citas' | 'reportes';

function roleLabel(role: string) {
  if (role === 'dealer') return 'dealer';
  if (role === 'seller') return 'vendedor';
  if (role === 'business') return 'negocio';
  return role;
}

function prospectLabel(role?: string, relation?: string) {
  if (!role) return 'Sin tipo';
  return relation === 'former' ? `Fue ${roleLabel(role)}` : `Es ${roleLabel(role)}`;
}

function accountOptionLabel(item: { name: string; companyName?: string; email?: string; role: string }) {
  const who =
    item.companyName && item.companyName !== item.name
      ? `${item.companyName} · ${item.name}`
      : item.companyName || item.name || item.email || 'Sin nombre';
  return `${who} (${roleLabel(item.role)})`;
}

interface DashboardData {
  employee: {
    id: string;
    name: string;
    email: string;
    commissionRulesAccepted?: boolean;
    stats?: { totalAccounts: number; pendingPayout: number; totalPaid: number; totalVoided: number };
  };
  stripeConnect: {
    accountId: string | null;
    onboardingComplete: boolean;
    payoutsEnabled: boolean;
    requiresAction: boolean;
  };
  accounts: Array<{
    id: string;
    role: Role;
    tenantId: string;
    userId: string;
    email: string;
    name: string;
    companyName?: string;
    membershipId?: string;
    loginUrl: string;
    createdAt: string | null;
  }>;
  commissions: Array<{
    id: string;
    type: string;
    status: string;
    amount: number;
    adKind?: string;
    eligibleAt: string | null;
    paidAt: string | null;
    payoutError?: string;
    createdAt: string | null;
  }>;
  visits: Array<{
    id: string;
    notes: string;
    visitedAt: string | null;
    tenantId: string | null;
    accountId: string | null;
    contactName?: string;
    contactPhone?: string | null;
    contactEmail?: string | null;
    companyName?: string | null;
    prospectRole?: string;
    prospectRelation?: string;
    membershipSold?: boolean;
  }>;
  appointments: Array<{
    id: string;
    kind: string;
    scheduledAt: string | null;
    notes: string;
    requestedBy: string;
    status: string;
    contactName?: string;
    contactPhone?: string | null;
    companyName?: string | null;
    prospectRole?: string;
    prospectRelation?: string;
  }>;
  notifications: Array<{ id: string; title: string; message: string; read: boolean; createdAt: string | null }>;
  paymentLinks: Array<{ id: string; checkoutUrl?: string; status?: string; createdAt?: string | null }>;
  nextPayout: { amount: number; type: string; status: string; eligibleAt: string | null; isDue: boolean } | null;
  rules: { membership: string; ads: string };
}

function money(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending_hold: 'En espera (14 días / 6 meses)',
    payable: 'Lista para pagar',
    paid: 'Pagada',
    void_cancelled: 'Anulada (canceló)',
    blocked_inactive: 'Bloqueada',
  };
  return map[status] || status;
}

function whoLabel(who: string) {
  if (who === 'admin') return 'Admin';
  if (who === 'employee') return 'Ventas';
  return 'Dueño de la membresía';
}

function SalesDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('membresias');
  const [form, setForm] = useState({
    role: 'dealer' as Role,
    name: '',
    email: '',
    phone: '',
    companyName: '',
    categorySlug: '',
    visitNotes: '',
    visitedAt: '',
  });
  const [memberships, setMemberships] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [categories, setCategories] = useState<Array<{ slug: string; name: string }>>([]);
  const [linkAccountId, setLinkAccountId] = useState('');
  const [linkMembershipId, setLinkMembershipId] = useState('');
  const [linkPlansError, setLinkPlansError] = useState('');
  const [linkPlansLoading, setLinkPlansLoading] = useState(false);
  const [visitForm, setVisitForm] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    companyName: '',
    prospectRole: 'dealer' as Role,
    visitedAt: '',
    notes: '',
    accountId: '',
  });
  const [orientation, setOrientation] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    companyName: '',
    prospectRole: 'dealer' as Role,
    prospectRelation: 'current' as Relation,
    scheduledAt: '',
    notes: '',
    visitId: '',
    accountId: '',
  });
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const res = await fetch('/api/sales/dashboard', { credentials: 'include' });
      if (res.status === 401) {
        router.replace('/sales/login');
        return;
      }
      const json = await res.json();
      if (!json.error) {
        setData((prev) => {
          if (opts?.silent && prev) {
            return {
              ...prev,
              stripeConnect: json.stripeConnect,
              employee: json.employee,
              rules: json.rules,
            };
          }
          return json;
        });
      }
    } catch {
      // Keep existing dashboard data on background refresh failures.
    }
  }, [router]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const applyRealtimeSlice = useCallback((slice: SalesRealtimeSlice) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      if (slice.accounts) next.accounts = slice.accounts as DashboardData['accounts'];
      if (slice.commissions) next.commissions = slice.commissions as DashboardData['commissions'];
      if (slice.visits) next.visits = slice.visits as DashboardData['visits'];
      if (slice.appointments) next.appointments = slice.appointments as DashboardData['appointments'];
      if (slice.notifications) {
        next.notifications = slice.notifications as DashboardData['notifications'];
      }
      if (slice.paymentLinks) {
        next.paymentLinks = slice.paymentLinks as DashboardData['paymentLinks'];
      }
      if (slice.nextPayout !== undefined) next.nextPayout = slice.nextPayout;
      if (slice.employeePatch) {
        next.employee = {
          ...next.employee,
          commissionRulesAccepted:
            slice.employeePatch.commissionRulesAccepted ?? next.employee.commissionRulesAccepted,
          stats: (slice.employeePatch.stats as DashboardData['employee']['stats']) || next.employee.stats,
        };
        if (slice.employeePatch.stripeConnectPayoutsEnabled != null) {
          next.stripeConnect = {
            ...next.stripeConnect,
            accountId:
              slice.employeePatch.stripeConnectAccountId ?? next.stripeConnect.accountId,
            onboardingComplete:
              slice.employeePatch.stripeConnectOnboardingComplete ??
              next.stripeConnect.onboardingComplete,
            payoutsEnabled: slice.employeePatch.stripeConnectPayoutsEnabled,
            requiresAction: !slice.employeePatch.stripeConnectPayoutsEnabled,
          };
        }
      }
      return next;
    });
  }, []);

  const { realtimeReady } = useRealtimeSalesDashboard(data?.employee?.id, applyRealtimeSlice);

  // Stripe Connect still needs API (external). Soft refresh on focus only — no 15s poll.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void load({ silent: true });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  useEffect(() => {
    fetch(`/api/sales/accounts?type=${form.role}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        setCategories(json.categories || []);
      })
      .catch(() => undefined);
  }, [form.role]);

  const selectedLinkAccount = useMemo(
    () => data?.accounts.find((item) => item.id === linkAccountId) || null,
    [data, linkAccountId]
  );

  useEffect(() => {
    if (!data?.accounts.length) return;
    if (linkAccountId && data.accounts.some((item) => item.id === linkAccountId)) return;
    setLinkAccountId(data.accounts[0].id);
  }, [data, linkAccountId]);

  useEffect(() => {
    const role = selectedLinkAccount?.role;
    if (!linkAccountId || !role) {
      setMemberships([]);
      setLinkPlansError('');
      setLinkPlansLoading(false);
      return;
    }

    let cancelled = false;
    setLinkPlansLoading(true);
    setLinkPlansError('');
    fetch(`/api/sales/accounts?type=${role}`, { credentials: 'include' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No se pudieron cargar los planes');
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        const plans = Array.isArray(json.memberships) ? json.memberships : [];
        setMemberships(plans);
        if (!plans.length) {
          setLinkPlansError('No hay planes activos para este tipo de cuenta.');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setMemberships([]);
        setLinkPlansError(err instanceof Error ? err.message : 'No se pudieron cargar los planes');
      })
      .finally(() => {
        if (!cancelled) setLinkPlansLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [linkAccountId, selectedLinkAccount?.role]);

  useEffect(() => {
    if (searchParams.get('connect') === 'return' || searchParams.get('paid') === '1') {
      load();
    }
  }, [searchParams, load]);

  const createdAccount = useMemo(() => data?.accounts[0], [data]);
  const report = useMemo(() => {
    if (!data) return null;
    const membershipsCount = data.accounts.length;
    const membershipCommissions = data.commissions.filter((item) => item.type !== 'ad');
    const adCommissions = data.commissions.filter((item) => item.type === 'ad');
    const paid = data.commissions.filter((item) => item.status === 'paid');
    const pending = data.commissions.filter((item) => item.status === 'pending_hold' || item.status === 'payable');
    const voided = data.commissions.filter((item) => item.status === 'void_cancelled' || item.status === 'blocked_inactive');
    const orientationCount = data.appointments.filter((item) => item.kind !== 'setup').length;
    const setupCount = data.appointments.filter((item) => item.kind === 'setup').length;
    const paidLinks = data.paymentLinks.filter((item) => item.status === 'paid').length;
    const openLinks = data.paymentLinks.filter((item) => item.status === 'open').length;
    const byRole = {
      dealer: data.accounts.filter((item) => item.role === 'dealer').length,
      seller: data.accounts.filter((item) => item.role === 'seller').length,
      business: data.accounts.filter((item) => item.role === 'business').length,
    };
    const visitsSold = data.visits.filter((item) => item.membershipSold).length;
    return {
      membershipsCount,
      byRole,
      visitsSold,
      visitsNoSale: data.visits.length - visitsSold,
      membershipAmount: membershipCommissions.reduce((sum, item) => sum + item.amount, 0),
      adAmount: adCommissions.reduce((sum, item) => sum + item.amount, 0),
      paidAmount: paid.reduce((sum, item) => sum + item.amount, 0),
      pendingAmount: pending.reduce((sum, item) => sum + item.amount, 0),
      voidedAmount: voided.reduce((sum, item) => sum + item.amount, 0),
      visits: data.visits.length,
      orientationCount,
      setupCount,
      paidLinks,
      openLinks,
    };
  }, [data]);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    if (form.role === 'business' && !form.categorySlug.trim()) {
      setError('Selecciona una categoría para el negocio');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/sales/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setMessage(
        `Membresía / cuenta lista. Email: ${json.email}. Clave temporal (única): ${json.password}. El cliente debe cambiarla al entrar. Portal: ${json.loginUrl}`
      );
      setForm({
        role: form.role,
        name: '',
        email: '',
        phone: '',
        companyName: '',
        categorySlug: '',
        visitNotes: '',
        visitedAt: '',
      });
      if (json.accountId) {
        setLinkAccountId(json.accountId);
        setLinkMembershipId('');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkAccountId || !linkMembershipId) {
      setError('Selecciona la cuenta y el plan para generar el link.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/sales/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accountId: linkAccountId, membershipId: linkMembershipId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setMessage(`Link de membresía: ${json.checkoutUrl}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function saveVisit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const account = data?.accounts.find((item) => item.id === visitForm.accountId);
      const res = await fetch('/api/sales/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...visitForm,
          tenantId: account?.tenantId || '',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setVisitForm({
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        companyName: '',
        prospectRole: visitForm.prospectRole,
        visitedAt: '',
        notes: '',
        accountId: '',
      });
      setMessage('Visita registrada.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function createOrientation(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const account = data?.accounts.find((item) => item.id === orientation.accountId);
      const visit = data?.visits.find((item) => item.id === orientation.visitId);
      const res = await fetch('/api/sales/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...orientation,
          tenantId: account?.tenantId || visit?.tenantId || '',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setMessage(
        `Cita de orientación creada. Si el admin aún no te dio acceso, la fecha de la cita quedó como solicitud.`
      );
      setOrientation({
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        companyName: '',
        prospectRole: orientation.prospectRole,
        prospectRelation: 'current',
        scheduledAt: '',
        notes: '',
        visitId: '',
        accountId: '',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function acceptRules(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedRules) {
      setError('Debes aceptar las reglas de comisión.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/sales/commission-rules/accept', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function connectStripe() {
    setBusy(true);
    try {
      const res = await fetch('/api/sales/stripe-connect/onboard', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/sales/logout', { method: 'POST', credentials: 'include' });
    router.replace('/sales/login');
  }

  async function markRead() {
    await fetch('/api/sales/notifications/read', { method: 'POST', credentials: 'include' });
    await load();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-slate-700">No se pudo cargar el dashboard de ventas.</p>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => {
            setLoading(true);
            void load().finally(() => setLoading(false));
          }}
        >
          Reintentar
        </button>
        <a href="/sales/login" className="text-sm text-blue-700 underline">
          Ir a login
        </a>
      </div>
    );
  }

  const tabLabel: Record<Tab, string> = {
    membresias: 'Membresías',
    pagos: 'Pagos',
    visitas: 'Visitas',
    citas: 'Citas',
    reportes: 'Reportes',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between gap-3 min-h-[56px]">
        <div className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/autodealers-online-logo.png"
            alt="AutoDealersOnline"
            width={102}
            height={36}
            className="h-9 w-[102px] object-contain shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{data.employee.name}</p>
            <p className="text-xs text-slate-500 truncate">{data.employee.email}</p>
          </div>
        </div>
        <button onClick={logout} className="text-sm text-slate-700 shrink-0">
          Salir
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div>
            <h2 className="font-semibold text-slate-900">Configurar cuentas</h2>
            <p className="text-sm text-slate-500">
              Entra al panel del cliente solo mientras tengas acceso activo.
            </p>
          </div>
          <SalesConfigAccessPanel
            accounts={data.accounts || []}
            employeeId={data.employee?.id}
          />
        </section>

        {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 break-all">
            {message}
          </div>
        )}

        <section className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold mb-2">Stripe Connect</h2>
          {data.stripeConnect?.payoutsEnabled ? (
            <p className="text-sm text-green-700">Listo para recibir transferencias.</p>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-sm text-amber-950 font-medium">Completa Connect</p>
              <p className="text-sm text-amber-900">
                Termina el onboarding de Stripe Express para habilitar payouts. Las comisiones
                quedan pendientes hasta que Stripe marque payouts como habilitados. No se puede
                completar por otra persona.
              </p>
              <button
                onClick={connectStripe}
                disabled={busy}
                className="bg-slate-900 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-60"
              >
                Completa Connect
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Las comisiones de membresía se crean cuando el cliente paga (primera factura / Checkout).
            El 50% inicial queda en espera 14 días; el otro 50% a los 6 meses. Durante trial sin pago
            aún no se genera comisión.
          </p>
          {realtimeReady ? (
            <p className="text-[11px] text-slate-400 mt-1">Cuentas y comisiones en tiempo real.</p>
          ) : null}
        </section>

        {(data.notifications || []).some((item) => !item.read) && (
          <section className="bg-white rounded-xl border p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold">Avisos</h2>
              <button onClick={markRead} className="text-sm text-slate-600">
                Marcar leídos
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              {(data.notifications || []).slice(0, 6).map((item) => (
                <li key={item.id} className={item.read ? 'text-slate-500' : 'text-slate-900'}>
                  <strong>{item.title}.</strong> {item.message}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex gap-2 flex-wrap">
          {(Object.keys(tabLabel) as Tab[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                tab === key ? 'bg-slate-900 text-white' : 'bg-white border'
              }`}
            >
              {tabLabel[key]}
            </button>
          ))}
        </div>

        {tab === 'membresias' && (
          <div className="grid md:grid-cols-2 gap-4">
            <form onSubmit={createAccount} className="bg-white rounded-xl border p-4 space-y-3">
              <h2 className="font-semibold">Registrar membresía / crear cuenta</h2>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="dealer">Dealer</option>
                <option value="seller">Vendedor</option>
                <option value="business">Negocio / taller</option>
              </select>
              <input
                required
                placeholder="Nombre del cliente"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                required
                type="email"
                placeholder="Email que elija el cliente"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                required
                type="tel"
                placeholder="Teléfono"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              {(form.role === 'dealer' || form.role === 'business') && (
                <input
                  placeholder="Nombre de la compañía"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              )}
              {form.role === 'business' && (
                <select
                  required
                  value={form.categorySlug}
                  onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Categoría del negocio (requerida)</option>
                  {categories.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-sm font-medium text-slate-800">Visita (obligatoria)</p>
              <input
                required
                type="datetime-local"
                value={form.visitedAt}
                onChange={(e) => setForm({ ...form, visitedAt: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <textarea
                required
                minLength={3}
                value={form.visitNotes}
                onChange={(e) => setForm({ ...form, visitNotes: e.target.value })}
                placeholder="Notas de la visita"
                className="w-full border rounded-lg px-3 py-2 min-h-[80px]"
              />
              <p className="text-xs text-slate-500">
                Se genera una clave temporal única. Entrégasela al cliente; deberá cambiarla en su portal.
              </p>
              <button disabled={busy} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">
                Crear cuenta
              </button>
            </form>

            <form onSubmit={createLink} className="bg-white rounded-xl border p-4 space-y-3">
              <h2 className="font-semibold">Link de pago de membresía</h2>
              {data.accounts.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Primero crea la cuenta del cliente en &quot;Registrar membresía / crear cuenta&quot;.
                  Después podrás generar el link de pago aquí.
                </p>
              ) : (
                <>
                  <select
                    required
                    value={linkAccountId}
                    onChange={(e) => {
                      setLinkAccountId(e.target.value);
                      setLinkMembershipId('');
                      setLinkPlansError('');
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Selecciona la cuenta</option>
                    {data.accounts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {accountOptionLabel(item)}
                      </option>
                    ))}
                  </select>
                  {!linkAccountId ? (
                    <p className="text-sm text-slate-600">Selecciona una cuenta para ver los planes.</p>
                  ) : linkPlansLoading ? (
                    <p className="text-sm text-slate-600">Cargando planes…</p>
                  ) : linkPlansError && memberships.length === 0 ? (
                    <p className="text-sm text-red-700">{linkPlansError}</p>
                  ) : (
                    <select
                      required
                      value={linkMembershipId}
                      onChange={(e) => setLinkMembershipId(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Selecciona el plan</option>
                      {memberships.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — {money(item.price)}
                        </option>
                      ))}
                    </select>
                  )}
                  {linkPlansError && memberships.length > 0 ? (
                    <p className="text-sm text-red-700">{linkPlansError}</p>
                  ) : null}
                  <button
                    disabled={busy || !linkAccountId || !linkMembershipId || linkPlansLoading}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
                  >
                    Generar link Stripe
                  </button>
                </>
              )}
              {createdAccount && (
                <p className="text-xs text-slate-500">
                  Última cuenta: {createdAccount.email} · {createdAccount.loginUrl}
                </p>
              )}
              {data.paymentLinks[0]?.checkoutUrl && (
                <p className="text-xs break-all text-slate-600">Último link: {String(data.paymentLinks[0].checkoutUrl)}</p>
              )}
            </form>

            <div className="md:col-span-2 bg-white rounded-xl border p-4 overflow-x-auto">
              <h2 className="font-semibold mb-3">Membresías / cuentas creadas</h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2">Cliente</th>
                    <th>Tipo</th>
                    <th>Email</th>
                    <th>Portal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="py-2">{item.companyName || item.name}</td>
                      <td>{item.role}</td>
                      <td>{item.email}</td>
                      <td>
                        <a className="text-blue-700 underline" href={item.loginUrl} target="_blank" rel="noreferrer">
                          Abrir
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'pagos' && (
          <div className="space-y-4">
            {!data.employee.commissionRulesAccepted && (
              <form onSubmit={acceptRules} className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                <p className="text-sm text-amber-950">{data.rules.membership}</p>
                <p className="text-sm text-amber-950">{data.rules.ads}</p>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptedRules}
                    onChange={(e) => setAcceptedRules(e.target.checked)}
                    className="mt-1"
                  />
                  Acepto estas reglas de comisión. No volver a mostrarlas.
                </label>
                <button disabled={busy} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">
                  Aceptar
                </button>
              </form>
            )}
            <div className="bg-white rounded-xl border p-4 overflow-x-auto">
              <h2 className="font-semibold mb-3">Historial de comisiones</h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2">Tipo</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Elegible</th>
                  </tr>
                </thead>
                <tbody>
                  {data.commissions.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="py-2">
                        {item.type === 'ad' ? `Anuncio ${item.adKind || ''}` : item.type.replace('membership_', 'Membresía ')}
                      </td>
                      <td>{money(item.amount)}</td>
                      <td>
                        {statusLabel(item.status)}
                        {item.payoutError ? ` — ${item.payoutError}` : ''}
                      </td>
                      <td>{item.eligibleAt ? new Date(item.eligibleAt).toLocaleDateString('es-PR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'visitas' && (
          <div className="grid md:grid-cols-2 gap-4">
            <form onSubmit={saveVisit} className="bg-white rounded-xl border p-4 space-y-3">
              <h2 className="font-semibold">Registrar visita</h2>
              <p className="text-xs text-slate-500">
                Obligatorio: nombre, teléfono, fecha y nota. No hace falta vender la membresía para registrar la visita.
              </p>
              <input
                required
                placeholder="Nombre de la persona"
                value={visitForm.contactName}
                onChange={(e) => setVisitForm({ ...visitForm, contactName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                required
                type="tel"
                placeholder="Teléfono"
                value={visitForm.contactPhone}
                onChange={(e) => setVisitForm({ ...visitForm, contactPhone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                placeholder="Compañía (opcional)"
                value={visitForm.companyName}
                onChange={(e) => setVisitForm({ ...visitForm, companyName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                type="email"
                placeholder="Email (opcional)"
                value={visitForm.contactEmail}
                onChange={(e) => setVisitForm({ ...visitForm, contactEmail: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <select
                required
                value={visitForm.prospectRole}
                onChange={(e) => setVisitForm({ ...visitForm, prospectRole: e.target.value as Role })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="dealer">Dealer</option>
                <option value="seller">Vendedor</option>
                <option value="business">Negocio / taller</option>
              </select>
              <input
                required
                type="datetime-local"
                value={visitForm.visitedAt}
                onChange={(e) => setVisitForm({ ...visitForm, visitedAt: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <textarea
                required
                minLength={3}
                value={visitForm.notes}
                onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
                placeholder="Notas de la visita"
                className="w-full border rounded-lg px-3 py-2 min-h-[100px]"
              />
              <select
                value={visitForm.accountId}
                onChange={(e) => {
                  const accountId = e.target.value;
                  const account = data.accounts.find((item) => item.id === accountId);
                  setVisitForm({
                    ...visitForm,
                    accountId,
                    contactName: account?.name || visitForm.contactName,
                    contactEmail: account?.email || visitForm.contactEmail,
                    companyName: account?.companyName || visitForm.companyName,
                    prospectRole: account?.role || visitForm.prospectRole,
                  });
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Vincular cuenta (opcional)</option>
                {data.accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {accountOptionLabel(item)}
                  </option>
                ))}
              </select>
              <button disabled={busy} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">
                Guardar visita
              </button>
            </form>
            <div className="bg-white rounded-xl border p-4 space-y-2 text-sm">
              {data.visits.length === 0 ? (
                <p className="text-slate-500">Aún no hay visitas.</p>
              ) : (
                data.visits.map((item) => (
                  <div key={item.id} className="border-b pb-2">
                    <p className="font-medium">{item.contactName || 'Sin nombre'}</p>
                    <p className="text-slate-500 text-xs">
                      {item.visitedAt ? new Date(item.visitedAt).toLocaleString('es-PR') : ''}
                      {item.contactPhone ? ` · ${item.contactPhone}` : ''}
                      {item.membershipSold ? ' · Vendió membresía' : ' · Sin venta'}
                    </p>
                    <p>{item.notes}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'citas' && (
          <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <form onSubmit={createOrientation} className="bg-white rounded-xl border p-4 space-y-3">
              <h2 className="font-semibold">Crear cita de orientación</h2>
              <p className="text-xs text-slate-500">
                Solo pones la <strong>fecha</strong>. Para pedir acceso, <strong>vincula la cuenta</strong>{' '}
                (membresía) abajo. El admin define la duración para esa cuenta. La de configuración la
                pide el dueño desde su panel.
              </p>
              <input
                required
                placeholder="Nombre de la persona"
                value={orientation.contactName}
                onChange={(e) => setOrientation({ ...orientation, contactName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                required
                type="tel"
                placeholder="Teléfono"
                value={orientation.contactPhone}
                onChange={(e) => setOrientation({ ...orientation, contactPhone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                type="email"
                placeholder="Email (opcional)"
                value={orientation.contactEmail}
                onChange={(e) => setOrientation({ ...orientation, contactEmail: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                placeholder="Compañía (opcional)"
                value={orientation.companyName}
                onChange={(e) => setOrientation({ ...orientation, companyName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <select
                required
                value={orientation.prospectRole}
                onChange={(e) => setOrientation({ ...orientation, prospectRole: e.target.value as Role })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="dealer">Dealer</option>
                <option value="seller">Vendedor</option>
                <option value="business">Negocio / taller</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="appt-relation"
                    checked={orientation.prospectRelation === 'current'}
                    onChange={() => setOrientation({ ...orientation, prospectRelation: 'current' })}
                  />
                  Es {roleLabel(orientation.prospectRole)}
                </label>
                <label className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="appt-relation"
                    checked={orientation.prospectRelation === 'former'}
                    onChange={() => setOrientation({ ...orientation, prospectRelation: 'former' })}
                  />
                  Fue {roleLabel(orientation.prospectRole)}
                </label>
              </div>
              <input
                required
                type="datetime-local"
                value={orientation.scheduledAt}
                onChange={(e) => setOrientation({ ...orientation, scheduledAt: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <textarea
                value={orientation.notes}
                onChange={(e) => setOrientation({ ...orientation, notes: e.target.value })}
                placeholder="Notas (opcional)"
                className="w-full border rounded-lg px-3 py-2"
              />
              <select
                value={orientation.visitId}
                onChange={(e) => {
                  const visitId = e.target.value;
                  const visit = data.visits.find((item) => item.id === visitId);
                  setOrientation({
                    ...orientation,
                    visitId,
                    contactName: visit?.contactName || orientation.contactName,
                    contactPhone: visit?.contactPhone || orientation.contactPhone,
                    contactEmail: visit?.contactEmail || orientation.contactEmail,
                    companyName: visit?.companyName || orientation.companyName,
                    prospectRole: (visit?.prospectRole as Role) || orientation.prospectRole,
                    prospectRelation: (visit?.prospectRelation as Relation) || orientation.prospectRelation,
                    accountId: visit?.accountId || orientation.accountId,
                  });
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Vincular visita (opcional)</option>
                {data.visits.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.contactName || 'Sin nombre'}
                    {item.contactPhone ? ` · ${item.contactPhone}` : ''}
                    {item.visitedAt ? ` · ${new Date(item.visitedAt).toLocaleDateString('es-PR')}` : ''}
                  </option>
                ))}
              </select>
              <select
                value={orientation.accountId}
                onChange={(e) => {
                  const accountId = e.target.value;
                  const account = data.accounts.find((item) => item.id === accountId);
                  setOrientation({
                    ...orientation,
                    accountId,
                    contactName: account?.name || orientation.contactName,
                    contactEmail: account?.email || orientation.contactEmail,
                    companyName: account?.companyName || orientation.companyName,
                    prospectRole: account?.role || orientation.prospectRole,
                  });
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Vincular cuenta (para solicitar acceso a esa cuenta)</option>
                {data.accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {accountOptionLabel(item)}
                  </option>
                ))}
              </select>
              <button disabled={busy} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">
                Crear orientación
              </button>
            </form>
            <div className="bg-white rounded-xl border p-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2">Con quién</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.appointments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-slate-500">
                        Aún no hay citas.
                      </td>
                    </tr>
                  ) : (
                    data.appointments.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="py-2">
                          <p className="font-medium">{item.contactName || 'Sin nombre'}</p>
                          <p className="text-xs text-slate-500">
                            {prospectLabel(item.prospectRole, item.prospectRelation)}
                            {item.contactPhone ? ` · ${item.contactPhone}` : ''}
                            {item.companyName ? ` · ${item.companyName}` : ''}
                          </p>
                        </td>
                        <td>{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString('es-PR') : '—'}</td>
                        <td>
                          {item.kind === 'setup' ? 'Configuración' : 'Orientación'}
                          <p className="text-xs text-slate-400">{whoLabel(item.requestedBy)}</p>
                        </td>
                        <td>{item.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}

        {tab === 'reportes' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Membresías" value={String(data.employee.stats?.totalAccounts || 0)} />
              <Stat label="Pendiente" value={money(data.employee.stats?.pendingPayout || 0)} />
              <Stat label="Pagado" value={money(data.employee.stats?.totalPaid || 0)} />
              <Stat
                label="Próximo pago"
                value={data.nextPayout ? money(data.nextPayout.amount) : '—'}
                hint={data.nextPayout?.eligibleAt ? new Date(data.nextPayout.eligibleAt).toLocaleDateString('es-PR') : ''}
              />
            </div>
            {report ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="Membresías creadas" value={String(report.membershipsCount)} />
                  <Stat label="Dealers" value={String(report.byRole.dealer)} />
                  <Stat label="Vendedores" value={String(report.byRole.seller)} />
                  <Stat label="Negocios" value={String(report.byRole.business)} />
                  <Stat label="Comisión membresías" value={money(report.membershipAmount)} />
                  <Stat label="Comisión anuncios" value={money(report.adAmount)} />
                  <Stat label="Pagado" value={money(report.paidAmount)} />
                  <Stat label="Pendiente" value={money(report.pendingAmount)} />
                  <Stat label="Anulado" value={money(report.voidedAmount)} />
                  <Stat label="Visitas" value={String(report.visits)} />
                  <Stat label="Visitas con venta" value={String(report.visitsSold)} />
                  <Stat label="Visitas sin venta" value={String(report.visitsNoSale)} />
                  <Stat label="Citas orientación" value={String(report.orientationCount)} />
                  <Stat label="Citas configuración" value={String(report.setupCount)} />
                  <Stat label="Links pagados" value={String(report.paidLinks)} />
                  <Stat label="Links abiertos" value={String(report.openLinks)} />
                </div>
                <div className="bg-white rounded-xl border p-4 overflow-x-auto">
                  <h2 className="font-semibold mb-3">Detalle de comisiones</h2>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-2">Fecha</th>
                        <th>Tipo</th>
                        <th>Monto</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.commissions.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="py-2">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-PR') : '—'}
                          </td>
                          <td>{item.type === 'ad' ? 'Anuncio' : 'Membresía'}</td>
                          <td>{money(item.amount)}</td>
                          <td>{statusLabel(item.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-xl border p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export default function SalesDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800" />
        </div>
      }
    >
      <SalesDashboardInner />
    </Suspense>
  );
}
