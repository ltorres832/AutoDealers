'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { DmsFeatureGate } from '@/components/DmsFeatureGate';
import { escapeHtml, printHtmlDocument } from '@/lib/print-document';
import { ENABLE_TIKTOK_YOUTUBE_PUBLISH } from '@autodealers/core/social-video-platforms';

type Tab = 'employees' | 'attendance' | 'leaves' | 'hiring' | 'payroll';
type SocialPublishPlatform = 'facebook' | 'instagram' | 'tiktok' | 'youtube';

const HIRING_SOCIAL_PLATFORMS: SocialPublishPlatform[] = ENABLE_TIKTOK_YOUTUBE_PUBLISH
  ? ['facebook', 'instagram', 'tiktok', 'youtube']
  : ['facebook', 'instagram'];

function HrPageInner() {
  const [tab, setTab] = useState<Tab>('employees');
  const [employees, setEmployees] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any | null>(null);
  const [openings, setOpenings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncUserId, setSyncUserId] = useState('');
  const [jobForm, setJobForm] = useState({
    title: '',
    department: '',
    description: '',
    location: '',
    employmentType: 'full_time' as string,
    salaryRange: '',
    requirements: '',
    benefits: '',
    applyEmail: '',
    applyPhone: '',
    applyUrl: '',
    slots: '1',
  });
  const [socialPlatforms, setSocialPlatforms] = useState<SocialPublishPlatform[]>([]);
  const [integrations, setIntegrations] = useState<{ type: string; status: string }[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [jobVideoUrl, setJobVideoUrl] = useState('');
  const [uploadingJobVideo, setUploadingJobVideo] = useState(false);
  const [appForm, setAppForm] = useState({
    openingId: '',
    candidateName: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [payForm, setPayForm] = useState({
    partner: 'adp',
    enabled: false,
    portalUrl: '',
    companyCode: '',
    notes: '',
  });
  const [attForm, setAttForm] = useState({
    userId: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'present',
    clockIn: '09:00',
    clockOut: '18:00',
  });
  const [leaveForm, setLeaveForm] = useState({
    userId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [onboarding, setOnboarding] = useState<any>(null);

  async function loadEmployees() {
    const res = await fetchWithAuth('/api/hr?view=employees', {});
    const data = await res.json();
    if (res.ok) setEmployees(data.employees || []);
  }
  async function loadUsers() {
    const res = await fetchWithAuth('/api/users', {});
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
    const sellers = await fetchWithAuth('/api/sellers', {});
    if (sellers.ok) {
      const data = await sellers.json();
      const list = data.sellers || [];
      setUsers((prev) => {
        const map = new Map(prev.map((u: any) => [u.id, u]));
        for (const s of list) map.set(s.id, { id: s.id, name: s.name, email: s.email });
        return Array.from(map.values());
      });
    }
  }

  useEffect(() => {
    void loadEmployees();
    void loadUsers();
  }, []);

  useEffect(() => {
    if (tab === 'attendance') {
      void (async () => {
        const res = await fetchWithAuth('/api/hr?view=attendance', {});
        const data = await res.json();
        if (res.ok) setRecords(data.records || []);
      })();
    }
    if (tab === 'leaves') {
      void (async () => {
        const res = await fetchWithAuth('/api/hr?view=leaves', {});
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Error cargando vacaciones');
          return;
        }
        setLeaves(data.requests || []);
      })();
    }
    if (tab === 'hiring') {
      void (async () => {
        const [o, a, integ] = await Promise.all([
          fetchWithAuth('/api/hr/partners?view=openings', {}),
          fetchWithAuth('/api/hr/partners?view=applications', {}),
          fetchWithAuth('/api/settings/integrations', {}),
        ]);
        const od = await o.json();
        const ad = await a.json();
        if (o.ok) setOpenings(od.openings || []);
        if (a.ok) setApplications(ad.applications || []);
        if (integ.ok) {
          const data = await integ.json();
          const active = (data.integrations || [])
            .filter(
              (i: any) =>
                i.status === 'active' && HIRING_SOCIAL_PLATFORMS.includes(i.type)
            )
            .map((i: any) => ({ type: i.type, status: i.status }));
          setIntegrations(active);
          const types = active.map((i: any) => i.type) as SocialPublishPlatform[];
          setSocialPlatforms((prev) => (prev.length ? prev : types));
        }
      })();
    }
    if (tab === 'payroll') {
      void (async () => {
        const res = await fetchWithAuth('/api/hr/partners?view=payroll', {});
        const data = await res.json();
        if (res.ok && data.config) {
          setPayroll(data.config);
          setPayForm({
            partner: data.config.partner || 'adp',
            enabled: data.config.enabled === true,
            portalUrl: data.config.portalUrl || '',
            companyCode: data.config.companyCode || '',
            notes: data.config.notes || '',
          });
        }
      })();
    }
  }, [tab]);

  async function syncUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetchWithAuth('/api/hr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync_user', userId: syncUserId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setSyncUserId('');
    await loadEmployees();
  }

  async function addAttendance(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetchWithAuth('/api/hr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'attendance', ...attForm }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    const list = await fetchWithAuth('/api/hr?view=attendance', {});
    const d = await list.json();
    if (list.ok) setRecords(d.records || []);
  }

  async function openOnboarding(userId: string) {
    const res = await fetchWithAuth(`/api/hr?view=onboarding&userId=${userId}`, {});
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error');
      return;
    }
    setOnboarding(data.checklist);
  }

  async function toggleItem(itemId: string, done: boolean) {
    if (!onboarding) return;
    const res = await fetchWithAuth('/api/hr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'onboarding_toggle',
        userId: onboarding.userId,
        itemId,
        done,
      }),
    });
    const data = await res.json();
    if (res.ok) setOnboarding(data.checklist);
  }

  async function loadLeaves() {
    const res = await fetchWithAuth('/api/hr?view=leaves', {});
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error cargando vacaciones');
      return;
    }
    setLeaves(data.requests || []);
  }

  async function loadLeaveBalance(userId: string) {
    if (!userId) {
      setLeaveBalance(null);
      return;
    }
    const res = await fetchWithAuth(
      `/api/hr?view=leave_balance&userId=${encodeURIComponent(userId)}`,
      {}
    );
    const data = await res.json();
    if (res.ok) setLeaveBalance(data.balance);
    else setLeaveBalance(null);
  }

  async function createLeave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const emp = employees.find((x) => x.userId === leaveForm.userId);
    const res = await fetchWithAuth('/api/hr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_leave',
        userId: leaveForm.userId,
        employeeName: emp?.displayName,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error al crear solicitud');
      return;
    }
    setLeaveForm({ userId: leaveForm.userId, startDate: '', endDate: '', reason: '' });
    await loadLeaves();
    await loadLeaveBalance(leaveForm.userId);
  }

  async function reviewLeave(id: string, status: 'approved' | 'rejected') {
    setError(null);
    const note =
      status === 'rejected' ? window.prompt('Motivo del rechazo (opcional):') || undefined : undefined;
    const res = await fetchWithAuth('/api/hr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review_leave', id, status, reviewerNote: note }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error al revisar');
      return;
    }
    await loadLeaves();
    if (leaveForm.userId) await loadLeaveBalance(leaveForm.userId);
  }

  function printEmployees() {
    const rows = employees
      .map(
        (e) =>
          `<tr><td>${escapeHtml(e.displayName)}</td><td>${escapeHtml(e.email || '—')}</td><td>${escapeHtml(e.jobTitle || '—')}</td><td>${escapeHtml(e.status || '—')}</td></tr>`
      )
      .join('');
    printHtmlDocument(
      `<h1>Expedientes RR.HH.</h1><p class="meta">${employees.length} empleados · ${new Date().toLocaleString('es-PR')}</p>
      <table><thead><tr><th>Nombre</th><th>Email</th><th>Puesto</th><th>Estado</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Sin empleados</td></tr>'}</tbody></table>`,
      'Expedientes RR.HH.'
    );
  }

  function printAttendance() {
    const rows = records
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.userId)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.clockIn || '—')}</td><td>${escapeHtml(r.clockOut || '—')}</td></tr>`
      )
      .join('');
    printHtmlDocument(
      `<h1>Asistencia</h1><p class="meta">${records.length} registros · ${new Date().toLocaleString('es-PR')}</p>
      <table><thead><tr><th>Fecha</th><th>Usuario</th><th>Estado</th><th>Entrada</th><th>Salida</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Sin registros</td></tr>'}</tbody></table>`,
      'Asistencia'
    );
  }

  function printLeaves() {
    const rows = leaves
      .map(
        (l) =>
          `<tr><td>${escapeHtml(l.sellerName || l.sellerId)}</td><td>${escapeHtml(l.startDate)}</td><td>${escapeHtml(l.endDate)}</td><td>${escapeHtml(l.days)}</td><td>${escapeHtml(l.status)}</td><td>${escapeHtml(l.reason || '—')}</td></tr>`
      )
      .join('');
    printHtmlDocument(
      `<h1>Vacaciones / Licencias</h1><p class="meta">${leaves.length} solicitudes · ${new Date().toLocaleString('es-PR')}</p>
      <table><thead><tr><th>Empleado</th><th>Desde</th><th>Hasta</th><th>Días</th><th>Estado</th><th>Motivo</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Sin solicitudes</td></tr>'}</tbody></table>`,
      'Vacaciones'
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">RR.HH.</h1>
        <p className="text-gray-600 mt-1">
          Expedientes, asistencia, hiring light y portal de nómina (partner). Compensación:{' '}
          <Link href="/settings/compensation" className="text-primary-600 underline">
            aquí
          </Link>
          .
        </p>
      </div>

      <div className="flex gap-2 border-b pb-2 flex-wrap">
        {(
          [
            ['employees', 'Expedientes'],
            ['attendance', 'Asistencia'],
            ['leaves', 'Vacaciones'],
            ['hiring', 'Hiring'],
            ['payroll', 'Nómina'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-md text-sm ${
              tab === id ? 'bg-primary-600 text-white' : 'bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {tab === 'employees' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => printEmployees()}
              className="text-sm px-3 py-1.5 border rounded-lg bg-white"
            >
              Imprimir expedientes
            </button>
          </div>
          <form onSubmit={syncUser} className="flex flex-wrap gap-2 items-end">
            <label className="text-sm">
              Crear expediente desde usuario
              <select
                required
                className="mt-1 block border rounded px-3 py-2 min-w-[220px]"
                value={syncUserId}
                onChange={(e) => setSyncUserId(e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email || u.id}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg">
              Vincular
            </button>
          </form>

          <div className="space-y-2">
            {employees.map((e) => (
              <div key={e.id} className="bg-white border rounded-lg px-4 py-3 flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-medium">{e.displayName}</div>
                  <div className="text-sm text-gray-500">
                    {e.email || '—'} · {e.departmentTemplate || 'sin depto'} · {e.status}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openOnboarding(e.userId)}
                  className="text-sm px-3 py-1.5 border rounded"
                >
                  Onboarding
                </button>
              </div>
            ))}
          </div>

          {onboarding && (
            <div className="bg-white border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Checklist onboarding</h3>
              {onboarding.items.map((it: any) => (
                <label key={it.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={it.done === true}
                    onChange={(e) => toggleItem(it.id, e.target.checked)}
                  />
                  {it.label}
                </label>
              ))}
              <button type="button" className="text-xs text-gray-500 underline" onClick={() => setOnboarding(null)}>
                Cerrar
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => printAttendance()}
              className="text-sm px-3 py-1.5 border rounded-lg bg-white"
            >
              Imprimir asistencia
            </button>
          </div>
          <form onSubmit={addAttendance} className="bg-white border rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <select
              required
              className="border rounded px-3 py-2"
              value={attForm.userId}
              onChange={(e) => setAttForm((f) => ({ ...f, userId: e.target.value }))}
            >
              <option value="">Empleado…</option>
              {employees.map((e) => (
                <option key={e.userId} value={e.userId}>
                  {e.displayName}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="border rounded px-3 py-2"
              value={attForm.date}
              onChange={(e) => setAttForm((f) => ({ ...f, date: e.target.value }))}
            />
            <select
              className="border rounded px-3 py-2"
              value={attForm.status}
              onChange={(e) => setAttForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="present">Presente</option>
              <option value="late">Tarde</option>
              <option value="absent">Ausente</option>
              <option value="remote">Remoto</option>
              <option value="leave">Licencia</option>
            </select>
            <input
              className="border rounded px-3 py-2"
              value={attForm.clockIn}
              onChange={(e) => setAttForm((f) => ({ ...f, clockIn: e.target.value }))}
              placeholder="Entrada"
            />
            <button type="submit" className="bg-primary-600 text-white rounded-lg px-4 py-2">
              Registrar
            </button>
          </form>
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="bg-white border rounded-lg px-4 py-2 text-sm">
                {r.date} · {r.userId.slice(0, 8)}… · {r.status} · {r.clockIn || '—'}–{r.clockOut || '—'}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'leaves' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              Solicita, aprueba o rechaza vacaciones aquí. El balance usa los días anuales de{' '}
              <Link href="/settings/compensation" className="text-primary-600 underline">
                Compensación
              </Link>{' '}
              (por defecto 15 días/año).
            </p>
            <button
              type="button"
              onClick={() => printLeaves()}
              className="text-sm px-3 py-1.5 border rounded-lg bg-white"
            >
              Imprimir listado
            </button>
          </div>

          <form
            onSubmit={createLeave}
            className="bg-white border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <select
              required
              className="border rounded px-3 py-2"
              value={leaveForm.userId}
              onChange={(e) => {
                const userId = e.target.value;
                setLeaveForm((f) => ({ ...f, userId }));
                void loadLeaveBalance(userId);
              }}
            >
              <option value="">Empleado…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.userId}>
                  {e.displayName}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-600 flex items-center">
              {leaveBalance ? (
                <span>
                  Balance {leaveBalance.year}: {leaveBalance.entitledDays} días · usados{' '}
                  {leaveBalance.usedDays} · pendientes {leaveBalance.pendingDays} · disponibles{' '}
                  <strong>
                    {Math.max(
                      0,
                      Number(leaveBalance.entitledDays) -
                        Number(leaveBalance.usedDays) -
                        Number(leaveBalance.pendingDays)
                    )}
                  </strong>
                </span>
              ) : (
                <span>Selecciona un empleado para ver su balance.</span>
              )}
            </div>
            <input
              required
              type="date"
              className="border rounded px-3 py-2"
              value={leaveForm.startDate}
              onChange={(e) => setLeaveForm((f) => ({ ...f, startDate: e.target.value }))}
            />
            <input
              required
              type="date"
              className="border rounded px-3 py-2"
              value={leaveForm.endDate}
              onChange={(e) => setLeaveForm((f) => ({ ...f, endDate: e.target.value }))}
            />
            <input
              placeholder="Motivo (opcional)"
              className="border rounded px-3 py-2 sm:col-span-2"
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
            />
            <button
              type="submit"
              className="bg-primary-600 text-white rounded-lg px-4 py-2 sm:col-span-2"
            >
              Solicitar vacaciones
            </button>
          </form>

          <div className="space-y-2">
            {leaves.length === 0 && (
              <p className="text-sm text-gray-500">Todavía no hay solicitudes de vacaciones.</p>
            )}
            {leaves.map((l) => (
              <div
                key={l.id}
                className="bg-white border rounded-lg px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium">
                    {l.sellerName || l.sellerId}: {l.startDate} → {l.endDate} ({l.days} días)
                  </div>
                  <div className="text-gray-600">
                    Estado: <strong>{l.status}</strong>
                    {l.reason ? ` · ${l.reason}` : ''}
                    {l.reviewerNote ? ` · Nota: ${l.reviewerNote}` : ''}
                  </div>
                </div>
                {l.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void reviewLeave(l.id, 'approved')}
                      className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => void reviewLeave(l.id, 'rejected')}
                      className="px-3 py-1.5 rounded border text-xs"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'hiring' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-4 text-sm text-gray-700">
            Crea vacantes con detalle (ubicación, tipo, salario, requisitos) y publícalas en Facebook /
            Instagram con un clic. Conecta tus redes en{' '}
            <Link href="/settings/integrations" className="text-primary-700 font-medium underline">
              Integraciones
            </Link>
            .
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              const res = await fetchWithAuth('/api/hr/partners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'create_opening',
                  ...jobForm,
                  slots: Number(jobForm.slots || 1),
                }),
              });
              const data = await res.json();
              if (!res.ok) {
                setError(data.error || 'Error');
                return;
              }
              setJobForm({
                title: '',
                department: '',
                description: '',
                location: '',
                employmentType: 'full_time',
                salaryRange: '',
                requirements: '',
                benefits: '',
                applyEmail: '',
                applyPhone: '',
                applyUrl: '',
                slots: '1',
              });
              const o = await fetchWithAuth('/api/hr/partners?view=openings', {});
              const od = await o.json();
              if (o.ok) setOpenings(od.openings || []);
            }}
            className="bg-white border rounded-lg p-5 grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <h2 className="sm:col-span-2 text-lg font-semibold text-gray-900">Nueva vacante</h2>
            <input
              required
              placeholder="Puesto *"
              className="border rounded px-3 py-2"
              value={jobForm.title}
              onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              placeholder="Departamento (Ventas, Taller, F&I…)"
              className="border rounded px-3 py-2"
              value={jobForm.department}
              onChange={(e) => setJobForm((f) => ({ ...f, department: e.target.value }))}
            />
            <input
              placeholder="Ubicación (San Juan, Guaynabo…)"
              className="border rounded px-3 py-2"
              value={jobForm.location}
              onChange={(e) => setJobForm((f) => ({ ...f, location: e.target.value }))}
            />
            <select
              className="border rounded px-3 py-2"
              value={jobForm.employmentType}
              onChange={(e) => setJobForm((f) => ({ ...f, employmentType: e.target.value }))}
            >
              <option value="full_time">Tiempo completo</option>
              <option value="part_time">Medio tiempo</option>
              <option value="contract">Contrato</option>
              <option value="temporary">Temporal</option>
              <option value="internship">Práctica / Internado</option>
            </select>
            <input
              placeholder="Rango salarial (ej. $2,500–$3,200/mes + comisión)"
              className="border rounded px-3 py-2"
              value={jobForm.salaryRange}
              onChange={(e) => setJobForm((f) => ({ ...f, salaryRange: e.target.value }))}
            />
            <input
              type="number"
              min="1"
              placeholder="Plazas"
              className="border rounded px-3 py-2"
              value={jobForm.slots}
              onChange={(e) => setJobForm((f) => ({ ...f, slots: e.target.value }))}
            />
            <textarea
              placeholder="Descripción del puesto"
              className="border rounded px-3 py-2 sm:col-span-2 min-h-[80px]"
              value={jobForm.description}
              onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))}
            />
            <textarea
              placeholder="Requisitos (experiencia, licencia, inglés…)"
              className="border rounded px-3 py-2 sm:col-span-2 min-h-[70px]"
              value={jobForm.requirements}
              onChange={(e) => setJobForm((f) => ({ ...f, requirements: e.target.value }))}
            />
            <textarea
              placeholder="Beneficios (seguro médico, plan 401k, descuentos…)"
              className="border rounded px-3 py-2 sm:col-span-2 min-h-[70px]"
              value={jobForm.benefits}
              onChange={(e) => setJobForm((f) => ({ ...f, benefits: e.target.value }))}
            />
            <input
              type="email"
              placeholder="Email para aplicar"
              className="border rounded px-3 py-2"
              value={jobForm.applyEmail}
              onChange={(e) => setJobForm((f) => ({ ...f, applyEmail: e.target.value }))}
            />
            <input
              placeholder="Teléfono para aplicar"
              className="border rounded px-3 py-2"
              value={jobForm.applyPhone}
              onChange={(e) => setJobForm((f) => ({ ...f, applyPhone: e.target.value }))}
            />
            <input
              placeholder="Link de aplicación (opcional)"
              className="border rounded px-3 py-2 sm:col-span-2"
              value={jobForm.applyUrl}
              onChange={(e) => setJobForm((f) => ({ ...f, applyUrl: e.target.value }))}
            />
            <button
              type="submit"
              className="bg-primary-600 text-white rounded-lg px-4 py-2.5 sm:col-span-2 font-medium"
            >
              Guardar vacante
            </button>
          </form>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Vacantes activas</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {HIRING_SOCIAL_PLATFORMS.map((p) => {
                  const connected = integrations.some((i) => i.type === p);
                  const labels: Record<SocialPublishPlatform, string> = {
                    facebook: 'Facebook',
                    instagram: 'Instagram',
                    tiktok: 'TikTok',
                    youtube: 'YouTube',
                  };
                  return (
                    <label
                      key={p}
                      className={`flex items-center gap-1.5 ${connected ? '' : 'opacity-50'}`}
                    >
                      <input
                        type="checkbox"
                        disabled={!connected}
                        checked={socialPlatforms.includes(p)}
                        onChange={() => {
                          setSocialPlatforms((prev) =>
                            prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                          );
                        }}
                      />
                      {labels[p]}
                      {!connected && <span className="text-xs text-gray-400">(no conectado)</span>}
                    </label>
                  );
                })}
              </div>
            </div>

            {ENABLE_TIKTOK_YOUTUBE_PUBLISH &&
              (socialPlatforms.includes('tiktok') || socialPlatforms.includes('youtube')) && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Video para TikTok / YouTube
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border bg-white cursor-pointer hover:bg-gray-50">
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/*"
                      className="hidden"
                      disabled={uploadingJobVideo}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        setError(null);
                        setUploadingJobVideo(true);
                        try {
                          const form = new FormData();
                          form.append('file', file);
                          form.append('type', 'hr_job_video');
                          form.append('folder', 'hr-job-videos');
                          const res = await fetchWithAuth('/api/upload', {
                            method: 'POST',
                            body: form,
                          });
                          const data = await res.json();
                          if (!res.ok || !data.url) {
                            setError(data.error || 'No se pudo subir el video');
                            return;
                          }
                          setJobVideoUrl(data.url);
                        } catch (err: any) {
                          setError(err?.message || 'Error al subir el video');
                        } finally {
                          setUploadingJobVideo(false);
                        }
                      }}
                    />
                    {uploadingJobVideo ? 'Subiendo…' : 'Subir desde el dispositivo'}
                  </label>
                  {jobVideoUrl && !uploadingJobVideo && (
                    <span className="text-xs text-emerald-700 truncate max-w-[280px]">
                      Listo · {jobVideoUrl.split('/').pop()}
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="O pega una URL pública (https://…/vacante.mp4)"
                  className="w-full border rounded px-3 py-2 text-sm bg-white"
                  value={jobVideoUrl}
                  onChange={(e) => setJobVideoUrl(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Elige un video del teléfono/PC (MP4, máx. 100 MB) o pega una URL. Ideal vertical para
                  Shorts / TikTok.
                </p>
              </div>
            )}

            {integrations.length === 0 && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No hay redes conectadas. Ve a{' '}
                <Link href="/settings/integrations" className="underline font-medium">
                  Configuración → Integraciones
                </Link>{' '}
                para vincular Facebook / Instagram
                {ENABLE_TIKTOK_YOUTUBE_PUBLISH ? ', TikTok o YouTube' : ''}.
              </p>
            )}

            {openings.length === 0 && (
              <p className="text-sm text-gray-500">Aún no hay vacantes. Crea la primera arriba.</p>
            )}

            {openings.map((o) => (
              <div key={o.id} className="bg-white border rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{o.title}</div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {[o.department, o.location, o.employmentType, o.status]
                        .filter(Boolean)
                        .join(' · ')}
                      {o.salaryRange ? ` · ${o.salaryRange}` : ''}
                      {o.slots ? ` · ${o.slots} plaza(s)` : ''}
                    </div>
                    {o.description && (
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap line-clamp-3">
                        {o.description}
                      </p>
                    )}
                    {o.lastPublishedAt && (
                      <p className="text-xs text-emerald-700 mt-1">
                        Publicada en redes:{' '}
                        {new Date(o.lastPublishedAt).toLocaleString('es-PR')}
                        {o.lastPublishedPlatforms?.length
                          ? ` (${o.lastPublishedPlatforms.join(', ')})`
                          : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-start">
                    {o.status !== 'closed' && (
                      <button
                        type="button"
                        disabled={publishingId === o.id || socialPlatforms.length === 0}
                        className="text-sm px-3 py-1.5 rounded-lg bg-primary-600 text-white disabled:opacity-50"
                        onClick={async () => {
                          setError(null);
                          const needsVideo =
                            socialPlatforms.includes('tiktok') ||
                            socialPlatforms.includes('youtube');
                          if (needsVideo && !jobVideoUrl.trim()) {
                            setError(
                              'Pega una URL pública del video (MP4) para publicar en TikTok o YouTube.'
                            );
                            return;
                          }
                          setPublishingId(o.id);
                          try {
                            const res = await fetchWithAuth('/api/hr/partners', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'publish_opening_social',
                                id: o.id,
                                platforms: socialPlatforms,
                                ...(jobVideoUrl.trim()
                                  ? { videoUrl: jobVideoUrl.trim() }
                                  : {}),
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok) {
                              setError(data.error || data.message || 'Error al publicar');
                              return;
                            }
                            alert(data.message || 'Vacante publicada en redes');
                            const r = await fetchWithAuth('/api/hr/partners?view=openings', {});
                            const d = await r.json();
                            if (r.ok) setOpenings(d.openings || []);
                          } finally {
                            setPublishingId(null);
                          }
                        }}
                      >
                        {publishingId === o.id ? 'Publicando…' : 'Publicar en redes'}
                      </button>
                    )}
                    {o.status === 'open' && (
                      <>
                        <button
                          type="button"
                          className="text-sm px-3 py-1.5 border rounded-lg"
                          onClick={async () => {
                            await fetchWithAuth('/api/hr/partners', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'opening_status',
                                id: o.id,
                                status: 'paused',
                              }),
                            });
                            const r = await fetchWithAuth('/api/hr/partners?view=openings', {});
                            const d = await r.json();
                            if (r.ok) setOpenings(d.openings || []);
                          }}
                        >
                          Pausar
                        </button>
                        <button
                          type="button"
                          className="text-sm px-3 py-1.5 border rounded-lg"
                          onClick={async () => {
                            await fetchWithAuth('/api/hr/partners', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'opening_status',
                                id: o.id,
                                status: 'closed',
                              }),
                            });
                            const r = await fetchWithAuth('/api/hr/partners?view=openings', {});
                            const d = await r.json();
                            if (r.ok) setOpenings(d.openings || []);
                          }}
                        >
                          Cerrar
                        </button>
                      </>
                    )}
                    {(o.status === 'paused' || o.status === 'closed') && (
                      <button
                        type="button"
                        className="text-sm px-3 py-1.5 border rounded-lg"
                        onClick={async () => {
                          await fetchWithAuth('/api/hr/partners', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'opening_status',
                              id: o.id,
                              status: 'open',
                            }),
                          });
                          const r = await fetchWithAuth('/api/hr/partners?view=openings', {});
                          const d = await r.json();
                          if (r.ok) setOpenings(d.openings || []);
                        }}
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>
                {(o.requirements || o.benefits || o.applyEmail || o.applyPhone) && (
                  <div className="text-xs text-gray-600 grid sm:grid-cols-2 gap-2 border-t pt-2">
                    {o.requirements && (
                      <div>
                        <strong>Requisitos:</strong> {o.requirements}
                      </div>
                    )}
                    {o.benefits && (
                      <div>
                        <strong>Beneficios:</strong> {o.benefits}
                      </div>
                    )}
                    {(o.applyEmail || o.applyPhone || o.applyUrl) && (
                      <div className="sm:col-span-2">
                        <strong>Aplicar:</strong>{' '}
                        {[o.applyEmail, o.applyPhone, o.applyUrl].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetchWithAuth('/api/hr/partners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create_application', ...appForm }),
              });
              const data = await res.json();
              if (!res.ok) {
                setError(data.error || 'Error');
                return;
              }
              setAppForm({ openingId: '', candidateName: '', email: '', phone: '', notes: '' });
              const a = await fetchWithAuth('/api/hr/partners?view=applications', {});
              const ad = await a.json();
              if (a.ok) setApplications(ad.applications || []);
            }}
            className="bg-white border rounded-lg p-4 grid grid-cols-2 gap-3"
          >
            <h2 className="col-span-2 text-lg font-semibold">Registrar candidato</h2>
            <select
              required
              className="border rounded px-3 py-2"
              value={appForm.openingId}
              onChange={(e) => setAppForm((f) => ({ ...f, openingId: e.target.value }))}
            >
              <option value="">Vacante…</option>
              {openings
                .filter((o) => o.status === 'open' || o.status === 'paused')
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
            </select>
            <input
              required
              placeholder="Candidato"
              className="border rounded px-3 py-2"
              value={appForm.candidateName}
              onChange={(e) => setAppForm((f) => ({ ...f, candidateName: e.target.value }))}
            />
            <input
              placeholder="Email"
              className="border rounded px-3 py-2"
              value={appForm.email}
              onChange={(e) => setAppForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              placeholder="Teléfono"
              className="border rounded px-3 py-2"
              value={appForm.phone}
              onChange={(e) => setAppForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              placeholder="Notas / CV resumen"
              className="border rounded px-3 py-2 col-span-2"
              value={appForm.notes}
              onChange={(e) => setAppForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <button type="submit" className="bg-primary-600 text-white rounded-lg px-4 py-2 col-span-2">
              Registrar candidato
            </button>
          </form>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Candidatos</h2>
            {applications.length === 0 && (
              <p className="text-sm text-gray-500">Sin candidatos registrados.</p>
            )}
            {applications.map((a) => (
              <div
                key={a.id}
                className="bg-white border rounded-lg px-4 py-3 text-sm flex justify-between gap-2"
              >
                <div>
                  <div className="font-medium">{a.candidateName}</div>
                  <div className="text-gray-500">
                    {[a.email, a.phone].filter(Boolean).join(' · ') || 'Sin contacto'}
                    {a.notes ? ` · ${a.notes}` : ''}
                  </div>
                </div>
                <select
                  className="border rounded px-2 py-1"
                  value={a.status}
                  onChange={async (e) => {
                    await fetchWithAuth('/api/hr/partners', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'application_status',
                        id: a.id,
                        status: e.target.value,
                      }),
                    });
                    const r = await fetchWithAuth('/api/hr/partners?view=applications', {});
                    const d = await r.json();
                    if (r.ok) setApplications(d.applications || []);
                  }}
                >
                  {[
                    ['new', 'Nuevo'],
                    ['reviewing', 'En revisión'],
                    ['interview', 'Entrevista'],
                    ['hired', 'Contratado'],
                    ['rejected', 'Rechazado'],
                  ].map(([s, label]) => (
                    <option key={s} value={s}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'payroll' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            AutoDealers no procesa nómina: conecta el portal de tu partner (ADP, Paychex, Gusto u otro
            en PR) desde el mismo flujo de pagos/RR.HH.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetchWithAuth('/api/hr/partners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_payroll', ...payForm }),
              });
              const data = await res.json();
              if (!res.ok) {
                setError(data.error || 'Error');
                return;
              }
              setPayroll(data.config);
            }}
            className="bg-white border rounded-lg p-4 space-y-3 max-w-lg"
          >
            <label className="block text-sm">
              Partner
              <select
                className="mt-1 w-full border rounded px-3 py-2"
                value={payForm.partner}
                onChange={(e) => setPayForm((f) => ({ ...f, partner: e.target.value }))}
              >
                <option value="adp">ADP</option>
                <option value="paychex">Paychex</option>
                <option value="gusto">Gusto</option>
                <option value="pr_local">Proveedor local PR</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={payForm.enabled}
                onChange={(e) => setPayForm((f) => ({ ...f, enabled: e.target.checked }))}
              />
              Habilitado
            </label>
            <input
              placeholder="URL del portal de nómina"
              className="w-full border rounded px-3 py-2"
              value={payForm.portalUrl}
              onChange={(e) => setPayForm((f) => ({ ...f, portalUrl: e.target.value }))}
            />
            <input
              placeholder="Código de compañía"
              className="w-full border rounded px-3 py-2"
              value={payForm.companyCode}
              onChange={(e) => setPayForm((f) => ({ ...f, companyCode: e.target.value }))}
            />
            <textarea
              placeholder="Notas"
              className="w-full border rounded px-3 py-2"
              rows={2}
              value={payForm.notes}
              onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <button type="submit" className="bg-primary-600 text-white rounded-lg px-4 py-2">
              Guardar nómina
            </button>
            {payroll?.portalUrl && payroll.enabled && (
              <a
                href={payroll.portalUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-primary-600 underline"
              >
                Abrir portal de nómina
              </a>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

export default function HrPage() {
  return (
    <DmsFeatureGate featureKey="dms_hr">
      <HrPageInner />
    </DmsFeatureGate>
  );
}
