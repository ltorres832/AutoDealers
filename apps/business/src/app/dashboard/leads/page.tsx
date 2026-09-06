'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

const STATUSES = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'qualified', label: 'Calificado' },
  { value: 'appointment', label: 'Cita' },
  { value: 'negotiation', label: 'Negociación' },
  { value: 'closed', label: 'Cerrado' },
  { value: 'lost', label: 'Perdido' },
];

type Lead = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photo?: string;
  status: string;
  source?: string;
  notes?: string;
  vehicleInterest?: string;
};

export default function BusinessLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', vehicleInterest: '', notes: '' });

  async function load() {
    const res = await fetch('/api/business/leads');
    const data = await res.json();
    setLeads(data.leads || []);
  }
  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/business/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el lead');
      setForm({ name: '', phone: '', email: '', vehicleInterest: '', notes: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/business/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
      <h1 className="text-3xl font-black mb-2">CRM / Leads</h1>
      <p className="text-slate-600 mb-6">
        Prospectos del negocio: los que llegan desde tu ficha pública y los que registras aquí.
      </p>
      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

      <form onSubmit={handleCreate} className="bg-white rounded-2xl border p-5 mb-6 grid md:grid-cols-2 gap-3">
        <input required className="border rounded-xl px-3 py-2" placeholder="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required className="border rounded-xl px-3 py-2" placeholder="Teléfono *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="border rounded-xl px-3 py-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="border rounded-xl px-3 py-2" placeholder="Vehículo / interés" value={form.vehicleInterest} onChange={(e) => setForm({ ...form, vehicleInterest: e.target.value })} />
        <textarea className="border rounded-xl px-3 py-2 md:col-span-2" placeholder="Notas" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button disabled={saving} className="bg-primary-600 text-white rounded-xl py-2 font-bold md:col-span-2 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Registrar lead'}
        </button>
      </form>

      {leads.length === 0 ? (
        <p className="text-slate-500">No hay leads. Registra el primero o espera solicitudes de tu ficha pública.</p>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-2xl border p-4">
              <div className="flex flex-wrap gap-3 items-start justify-between">
                <div className="flex gap-3 items-start">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border flex items-center justify-center shrink-0">
                    {lead.photo ? (
                      <img src={lead.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-slate-500">{String(lead.name || 'C').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold">{lead.name}</div>
                    <div className="text-sm text-slate-500">
                      {lead.phone}
                      {lead.email ? ` · ${lead.email}` : ''}
                    </div>
                    {lead.vehicleInterest ? <div className="text-sm mt-1">{lead.vehicleInterest}</div> : null}
                    {lead.notes ? <p className="text-sm mt-2 text-slate-600">{lead.notes}</p> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={lead.status}
                    onChange={(e) => void patch(lead.id, { status: e.target.value })}
                    className="border rounded-xl px-3 py-2 text-sm"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="px-3 py-2 text-sm rounded-xl bg-primary-600 text-white font-semibold"
                    onClick={() => {
                      const q = new URLSearchParams({
                        name: lead.name || '',
                        phone: lead.phone || '',
                        email: lead.email || '',
                        leadId: lead.id,
                      });
                      router.push(`/dashboard/appointments?${q.toString()}`);
                    }}
                  >
                    Crear cita
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
