'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Tab = 'empleados' | 'membresias' | 'comisiones' | 'citas' | 'visitas';

interface Overview {
  employees: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    portalUrl?: string;
    stats?: { totalAccounts: number; pendingPayout: number; totalPaid: number };
    stripeConnectPayoutsEnabled?: boolean;
  }>;
  accounts: Array<{
    id: string;
    employeeId: string;
    role: string;
    tenantId: string;
    userId: string;
    email: string;
    name: string;
    companyName?: string;
  }>;
  commissions: Array<{
    id: string;
    employeeId: string;
    type: string;
    status: string;
    amount: number;
    tenantId?: string;
    eligibleAt: string | null;
    payoutError?: string;
  }>;
  appointments: Array<{
    id: string;
    employeeId: string;
    kind: string;
    scheduledAt: string | null;
    requestedBy: string;
    notes: string;
    contactName?: string;
    contactPhone?: string | null;
    companyName?: string | null;
    prospectRole?: string;
    prospectRelation?: string;
  }>;
  visits: Array<{
    id: string;
    employeeId: string;
    notes: string;
    visitedAt: string | null;
    tenantId?: string | null;
    contactName?: string;
    contactPhone?: string | null;
    contactEmail?: string | null;
    companyName?: string | null;
    prospectRole?: string;
    prospectRelation?: string;
    membershipSold?: boolean;
  }>;
}

function roleLabel(role?: string) {
  if (role === 'dealer') return 'dealer';
  if (role === 'seller') return 'vendedor';
  if (role === 'business') return 'negocio';
  return role || '';
}

function prospectLabel(role?: string, relation?: string) {
  if (!role) return 'Sin tipo';
  return relation === 'former' ? `Fue ${roleLabel(role)}` : `Es ${roleLabel(role)}`;
}

function money(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

export default function EmpleadosVentasPage() {
  const [tab, setTab] = useState<Tab>('empleados');
  const tabLabel: Record<Tab, string> = {
    empleados: 'Empleados',
    membresias: 'Membresías',
    comisiones: 'Comisiones',
    citas: 'Citas',
    visitas: 'Visitas',
  };
  const [data, setData] = useState<Overview | null>(null);
  const [portalUrl, setPortalUrl] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [appt, setAppt] = useState({
    employeeId: '',
    accountId: '',
    visitId: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    companyName: '',
    prospectRole: 'dealer',
    prospectRelation: 'current',
    kind: 'orientation',
    scheduledAt: '',
    notes: '',
    grantAccess: true,
    grantAccessDurationMinutes: 120,
  });
  const [accessRequests, setAccessRequests] = useState<
    Array<{
      id: string;
      employeeName: string;
      employeeEmail: string;
      preferredStartAt?: string;
      requestedMinutes: number;
      reason: string;
      status: string;
      targetTenantId?: string;
      targetAccountId?: string;
      targetAccountLabel?: string;
    }>
  >([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [listRes, overviewRes, accessRes] = await Promise.all([
      fetch('/api/admin/empleados-ventas'),
      fetch('/api/admin/empleados-ventas/overview'),
      fetch('/api/admin/staff-access'),
    ]);
    const list = await listRes.json();
    const overview = await overviewRes.json();
    if (list.portalUrl) setPortalUrl(list.portalUrl);
    if (!overview.error) setData(overview);
    if (accessRes.ok) {
      const access = await accessRes.json();
      setAccessRequests((access.requests || []).filter((r: { status: string }) => r.status === 'pending'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const tick = () => {
      void load();
    };
    const interval = window.setInterval(tick, 15000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/empleados-ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setMessage(
        `Empleado creado. Entrada: ${json.portalUrl}${
          json.temporaryPassword ? ` · Clave temporal: ${json.temporaryPassword}` : ''
        }`
      );
      setForm({ name: '', email: '', phone: '', password: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function payCommissionNow(id: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/empleados-ventas/commissions/${id}/pay`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo pagar');
      setMessage('Transferencia enviada (o ya estaba pagada).');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(id: string, status: string) {
    await fetch(`/api/admin/empleados-ventas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status === 'active' ? 'inactive' : 'active' }),
    });
    await load();
  }

    async function createAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (appt.grantAccess && !appt.accountId) {
      setError('Para otorgar acceso debes vincular una cuenta (membresía) en la cita');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const account = data?.accounts.find((item) => item.id === appt.accountId);
      const visit = data?.visits.find((item) => item.id === appt.visitId);
      const res = await fetch('/api/admin/empleados-ventas/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...appt,
          tenantId: account?.tenantId || visit?.tenantId || '',
          grantAccess: appt.grantAccess,
          grantAccessDurationMinutes: appt.grantAccessDurationMinutes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setMessage(
        appt.grantAccess
          ? 'Cita asignada y acceso temporal otorgado al empleado.'
          : 'Cita asignada'
      );
      setAppt({
        employeeId: appt.employeeId,
        accountId: '',
        visitId: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        companyName: '',
        prospectRole: appt.prospectRole,
        prospectRelation: 'current',
        kind: 'orientation',
        scheduledAt: '',
        notes: '',
        grantAccess: true,
        grantAccessDurationMinutes: 120,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  const employeeName = (id: string) => data?.employees.find((item) => item.id === id)?.name || id;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Empleados de ventas</h1>
        <p className="text-sm text-gray-600">
          Módulo interno, separado de Afiliados. Portal (solo por link):{' '}
          <code className="bg-gray-100 px-1">{portalUrl || 'https://www.autodealers-online.com/sales'}</code>
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 break-all">
          {message}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(['empleados', 'membresias', 'comisiones', 'citas', 'visitas'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-sm ${tab === key ? 'bg-slate-900 text-white' : 'bg-white border'}`}
          >
            {tabLabel[key]}
          </button>
        ))}
      </div>

      {tab === 'empleados' && (
        <div className="grid md:grid-cols-2 gap-4">
          <form onSubmit={createEmployee} className="bg-white rounded-xl border p-4 space-y-3">
            <h2 className="font-semibold">Alta de empleado</h2>
            <input
              required
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              placeholder="Teléfono"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              placeholder="Contraseña (opcional)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <button disabled={busy} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">
              Crear empleado
            </button>
          </form>
          <div className="bg-white rounded-xl border p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">Nombre</th>
                  <th>Email</th>
                  <th>Pendiente</th>
                  <th>Stripe</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data?.employees || []).map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="py-2">{item.name}</td>
                    <td>{item.email}</td>
                    <td>{money(item.stats?.pendingPayout || 0)}</td>
                    <td>{item.stripeConnectPayoutsEnabled ? 'Listo' : 'Pendiente'}</td>
                    <td>
                      <button className="text-blue-700 underline" onClick={() => toggleStatus(item.id, item.status)}>
                        {item.status === 'active' ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'membresias' && (
        <div className="bg-white rounded-xl border p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Cliente</th>
                <th>Tipo</th>
                <th>Email</th>
                <th>Empleado</th>
                <th>Tenant</th>
              </tr>
            </thead>
            <tbody>
              {(data?.accounts || []).map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="py-2">{item.companyName || item.name}</td>
                  <td>{item.role}</td>
                  <td>{item.email}</td>
                  <td>{employeeName(item.employeeId)}</td>
                  <td>
                    <Link className="text-blue-700 underline" href={`/admin/tenants/${item.tenantId}`}>
                      Ver tenant
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'comisiones' && (
        <div className="bg-white rounded-xl border p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Empleado</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Elegible</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {(data?.commissions || []).map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="py-2">{employeeName(item.employeeId)}</td>
                  <td>{item.type}</td>
                  <td>{money(item.amount)}</td>
                  <td>
                    {item.status}
                    {item.payoutError ? ` · ${item.payoutError}` : ''}
                  </td>
                  <td>{item.eligibleAt ? new Date(item.eligibleAt).toLocaleDateString('es-PR') : '—'}</td>
                  <td>
                    {item.status === 'payable' ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => payCommissionNow(item.id)}
                        className="text-sm text-blue-700 underline disabled:opacity-50"
                      >
                        Pagar ahora
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'citas' && (
        <div className="grid md:grid-cols-2 gap-4">
          <form onSubmit={createAppointment} className="bg-white rounded-xl border p-4 space-y-3">
            <h2 className="font-semibold">Asignar cita + acceso</h2>

            <select
              required
              value={appt.employeeId}
              onChange={(e) => setAppt({ ...appt, employeeId: e.target.value, accountId: '' })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">1. Empleado</option>
              {(data?.employees || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3 space-y-2">
              <p className="text-sm font-bold text-amber-950">2. Cuenta a la que das acceso</p>
              <select
                required={appt.grantAccess}
                value={appt.accountId}
                onChange={(e) => {
                  const accountId = e.target.value;
                  const account = data?.accounts.find((item) => item.id === accountId);
                  setAppt({
                    ...appt,
                    accountId,
                    employeeId: account?.employeeId || appt.employeeId,
                    contactName: account?.name || appt.contactName,
                    contactEmail: account?.email || appt.contactEmail,
                    companyName: account?.companyName || appt.companyName,
                    prospectRole: account?.role || appt.prospectRole,
                  });
                }}
                className="w-full border-2 border-amber-500 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Seleccionar cuenta / membresía…</option>
                {(data?.accounts || [])
                  .filter((item) => !appt.employeeId || item.employeeId === appt.employeeId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {(item.companyName || item.name) +
                        ` (${item.role}) · ${item.email} · ${item.tenantId.slice(0, 8)}…`}
                    </option>
                  ))}
              </select>
              {(data?.accounts || []).filter(
                (item) => !appt.employeeId || item.employeeId === appt.employeeId
              ).length === 0 ? (
                <p className="text-xs text-red-700">
                  Este empleado no tiene cuentas aún. Crea la membresía desde el portal /sales o
                  elige otro empleado.
                </p>
              ) : (
                <p className="text-xs text-amber-900">
                  Sin esta cuenta el empleado no podrá entrar al panel del cliente.
                </p>
              )}
              <label className="flex items-center gap-2 text-sm font-medium text-amber-950">
                <input
                  type="checkbox"
                  checked={appt.grantAccess}
                  onChange={(e) => setAppt({ ...appt, grantAccess: e.target.checked })}
                />
                Otorgar acceso temporal a esta cuenta
              </label>
              {appt.grantAccess ? (
                <select
                  value={appt.grantAccessDurationMinutes}
                  onChange={(e) =>
                    setAppt({ ...appt, grantAccessDurationMinutes: Number(e.target.value) })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={120}>2 horas</option>
                  <option value={240}>4 horas</option>
                  <option value={480}>8 horas</option>
                </select>
              ) : null}
            </div>

            <p className="text-xs text-gray-500">3. Datos de la cita</p>
            <input
              required
              placeholder="Nombre de la persona"
              value={appt.contactName}
              onChange={(e) => setAppt({ ...appt, contactName: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              required
              type="tel"
              placeholder="Teléfono"
              value={appt.contactPhone}
              onChange={(e) => setAppt({ ...appt, contactPhone: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              type="email"
              placeholder="Email (opcional)"
              value={appt.contactEmail}
              onChange={(e) => setAppt({ ...appt, contactEmail: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              placeholder="Compañía (opcional)"
              value={appt.companyName}
              onChange={(e) => setAppt({ ...appt, companyName: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <select
              required
              value={appt.prospectRole}
              onChange={(e) => setAppt({ ...appt, prospectRole: e.target.value })}
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
                  name="admin-appt-relation"
                  checked={appt.prospectRelation === 'current'}
                  onChange={() => setAppt({ ...appt, prospectRelation: 'current' })}
                />
                Es {roleLabel(appt.prospectRole)}
              </label>
              <label className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="admin-appt-relation"
                  checked={appt.prospectRelation === 'former'}
                  onChange={() => setAppt({ ...appt, prospectRelation: 'former' })}
                />
                Fue {roleLabel(appt.prospectRole)}
              </label>
            </div>
            <select
              value={appt.kind}
              onChange={(e) => setAppt({ ...appt, kind: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="orientation">Orientación</option>
              <option value="setup">Configuración</option>
            </select>
            <input
              required
              type="datetime-local"
              value={appt.scheduledAt}
              onChange={(e) => setAppt({ ...appt, scheduledAt: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <textarea
              value={appt.notes}
              onChange={(e) => setAppt({ ...appt, notes: e.target.value })}
              placeholder="Notas (opcional)"
              className="w-full border rounded-lg px-3 py-2"
            />
            <select
              value={appt.visitId}
              onChange={(e) => {
                const visitId = e.target.value;
                const visit = data?.visits.find((item) => item.id === visitId);
                setAppt({
                  ...appt,
                  visitId,
                  employeeId: visit?.employeeId || appt.employeeId,
                  contactName: visit?.contactName || appt.contactName,
                  contactPhone: visit?.contactPhone || appt.contactPhone,
                  contactEmail: visit?.contactEmail || appt.contactEmail,
                  companyName: visit?.companyName || appt.companyName,
                  prospectRole: visit?.prospectRole || appt.prospectRole,
                  prospectRelation: visit?.prospectRelation || appt.prospectRelation,
                });
              }}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Vincular visita (opcional)</option>
              {(data?.visits || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.contactName || 'Sin nombre'}
                  {item.contactPhone ? ` · ${item.contactPhone}` : ''}
                </option>
              ))}
            </select>
            <button disabled={busy} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">
              Crear y asignar
            </button>
          </form>
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-4 space-y-2 text-sm">
              <h3 className="font-semibold text-base">Solicitudes de acceso (por cita del empleado)</h3>
              <p className="text-xs text-gray-500">
                El empleado solo pone la fecha al crear la cita. Tú apruebas y defines la duración.
              </p>
              {accessRequests.length === 0 ? (
                <p className="text-gray-500">No hay solicitudes pendientes.</p>
              ) : (
                accessRequests.map((r) => (
                  <div key={r.id} className="border rounded-lg p-3 space-y-2">
                    <p className="font-medium">
                      {r.employeeName}{' '}
                      <span className="text-xs font-normal text-gray-500">({r.employeeEmail})</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Cuenta:{' '}
                      <strong>{r.targetAccountLabel || r.targetTenantId || 'Sin cuenta'}</strong>
                      {r.targetTenantId ? (
                        <span className="text-gray-400"> · {r.targetTenantId}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-gray-600">
                      Fecha pedida:{' '}
                      {r.preferredStartAt
                        ? new Date(r.preferredStartAt).toLocaleString('es-PR')
                        : '—'}
                    </p>
                    <p className="text-xs text-gray-500">{r.reason}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || !r.targetTenantId}
                        className="text-sm bg-green-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                        onClick={async () => {
                          if (!r.targetTenantId) {
                            setError('La solicitud no tiene cuenta vinculada');
                            return;
                          }
                          setBusy(true);
                          try {
                            const res = await fetch(`/api/admin/staff-access/${r.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'approve',
                                startsAt: r.preferredStartAt || new Date().toISOString(),
                                durationMinutes: 120,
                                targetTenantId: r.targetTenantId,
                                targetAccountId: r.targetAccountId,
                                targetAccountLabel: r.targetAccountLabel,
                              }),
                            });
                            const json = await res.json();
                            if (!res.ok) throw new Error(json.error || 'Error');
                            setMessage(
                              `Acceso aprobado (2 h) a «${r.targetAccountLabel || r.targetTenantId}».`
                            );
                            await load();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Error');
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Aprobar 2 h a esta cuenta
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-sm text-red-700 underline disabled:opacity-50"
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await fetch(`/api/admin/staff-access/${r.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'deny' }),
                            });
                            await load();
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Denegar
                      </button>
                    </div>
                  </div>
                ))
              )}
              <p className="text-xs text-gray-400">
                Más opciones: <Link href="/admin/staff-access" className="text-blue-700 underline">Acceso temporal</Link>
              </p>
            </div>
            <div className="bg-white rounded-xl border p-4 space-y-2 text-sm">
              <h3 className="font-semibold text-base">Citas</h3>
            {(data?.appointments || []).length === 0 ? (
              <p className="text-gray-500">Aún no hay citas.</p>
            ) : (
              (data?.appointments || []).map((item) => (
                <div key={item.id} className="border-b pb-2">
                  <p className="font-medium">
                    {item.contactName || 'Sin nombre'} · {prospectLabel(item.prospectRole, item.prospectRelation)}
                  </p>
                  <p className="text-gray-500">
                    {employeeName(item.employeeId)} · {item.kind === 'setup' ? 'Configuración' : 'Orientación'} ·{' '}
                    {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString('es-PR') : ''}
                    {item.contactPhone ? ` · ${item.contactPhone}` : ''}
                    {item.companyName ? ` · ${item.companyName}` : ''}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.requestedBy === 'admin' ? 'Admin' : item.requestedBy === 'employee' ? 'Empleado' : 'Dueño'}
                  </p>
                  <p>{item.notes}</p>
                </div>
              ))
            )}
            </div>
          </div>
        </div>
      )}

      {tab === 'visitas' && (
        <div className="bg-white rounded-xl border p-4 space-y-2 text-sm">
          {(data?.visits || []).length === 0 ? (
            <p className="text-gray-500">Aún no hay visitas.</p>
          ) : (
            (data?.visits || []).map((item) => (
              <div key={item.id} className="border-b pb-2">
                <p className="font-medium">{item.contactName || 'Sin nombre'}</p>
                <p className="text-gray-500">
                  {employeeName(item.employeeId)} ·{' '}
                  {item.visitedAt ? new Date(item.visitedAt).toLocaleString('es-PR') : ''}
                  {item.contactPhone ? ` · ${item.contactPhone}` : ''}
                  {item.membershipSold ? ' · Vendió membresía' : ' · Sin venta'}
                  {item.companyName ? ` · ${item.companyName}` : ''}
                </p>
                <p>{item.notes}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
