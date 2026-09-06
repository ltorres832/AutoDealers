'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

const STATUSES = [
  { value: 'scheduled', label: 'Agendada' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'no_show', label: 'No se presentó' },
];

const TYPES = [
  { value: 'service', label: 'Servicio' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'inspection', label: 'Inspección' },
  { value: 'consultation', label: 'Consulta' },
  { value: 'other', label: 'Otro' },
];

function AppointmentsInner() {
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: searchParams.get('name') || '',
    customerPhone: searchParams.get('phone') || '',
    customerEmail: searchParams.get('email') || '',
    leadId: searchParams.get('leadId') || '',
    scheduledAt: '',
    duration: '60',
    type: 'service',
    serviceType: '',
    notes: '',
  });

  async function load() {
    const res = await fetch('/api/business/appointments');
    const data = await res.json();
    setAppointments(data.appointments || []);
  }
  useEffect(() => {
    void load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/business/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          duration: Number(form.duration),
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la cita');
      setForm({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        leadId: '',
        scheduledAt: '',
        duration: '60',
        type: 'service',
        serviceType: '',
        notes: '',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch('/api/business/appointments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No se pudo actualizar');
      return;
    }
    await load();
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-black mb-2">Citas</h1>
      <p className="text-slate-600 mb-6">Agenda del taller: crea, confirma y cierra citas de servicio.</p>
      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-5 mb-6 grid md:grid-cols-3 gap-3">
        <input required className="border rounded-xl px-3 py-2" placeholder="Cliente *" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
        <input required className="border rounded-xl px-3 py-2" placeholder="Teléfono *" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
        <input className="border rounded-xl px-3 py-2" placeholder="Email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
        <input required type="datetime-local" className="border rounded-xl px-3 py-2" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
        <input type="number" min={15} step={15} className="border rounded-xl px-3 py-2" placeholder="Duración min" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
        <select className="border rounded-xl px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input className="border rounded-xl px-3 py-2 md:col-span-2" placeholder="Tipo de servicio (alineación, gomas…)" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} />
        <textarea className="border rounded-xl px-3 py-2 md:col-span-3" placeholder="Notas" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button disabled={saving} className="bg-primary-600 text-white rounded-xl py-2 font-bold md:col-span-3 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Agendar cita'}
        </button>
      </form>

      {appointments.length === 0 ? (
        <p className="text-slate-500">No hay citas. Agenda la primera o espera solicitudes de clientes.</p>
      ) : (
        <div className="space-y-3">
          {appointments.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border p-4 flex flex-wrap justify-between gap-3">
              <div>
                <div className="font-bold">{item.customerName || 'Cliente'} · {TYPES.find((t) => t.value === item.type)?.label || item.type}</div>
                <div className="text-sm text-slate-500">
                  {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString('es-PR') : ''}
                  {item.duration ? ` · ${item.duration} min` : ''}
                  {item.customerPhone ? ` · ${item.customerPhone}` : ''}
                </div>
                {item.serviceType ? <div className="text-sm mt-1">{item.serviceType}</div> : null}
                {item.notes ? <p className="text-sm text-slate-600 mt-1">{item.notes}</p> : null}
              </div>
              <select value={item.status} onChange={(e) => void setStatus(item.id, e.target.value)} className="border rounded-xl px-3 py-2 text-sm h-fit">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

export default function BusinessAppointmentsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <p className="text-slate-500">Cargando citas…</p>
        </DashboardLayout>
      }
    >
      <AppointmentsInner />
    </Suspense>
  );
}
