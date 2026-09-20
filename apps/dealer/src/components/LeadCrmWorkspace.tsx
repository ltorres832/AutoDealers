'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Lead } from '@autodealers/crm';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

const SOURCES = [
  { value: 'manual', label: 'Manual' },
  { value: 'web', label: 'Web' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
];

function toLocalInput(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LeadCrmWorkspace({ lead, showService = true }: { lead: Lead; showService?: boolean }) {
  const [saving, setSaving] = useState(false);
  const [activityType, setActivityType] = useState<'note' | 'call' | 'email' | 'message'>('note');
  const [activityContent, setActivityContent] = useState('');
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);
  const [photo, setPhoto] = useState(lead.contact?.photo || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    name: lead.contact?.name || '',
    phone: lead.contact?.phone || '',
    email: lead.contact?.email || '',
    city: lead.contact?.city || '',
    preferredChannel: lead.contact?.preferredChannel || 'phone',
    source: String(lead.source || 'manual'),
    vehicleInterest: lead.vehicleInterest || '',
    budget: lead.budget != null ? String(lead.budget) : '',
    assignedTo: lead.assignedTo || '',
    nextFollowUpDate: toLocalInput(lead.nextFollowUpDate),
    notes: lead.notes || '',
  });

  useEffect(() => {
    fetchWithAuth('/api/sellers', {})
      .then((r) => (r.ok ? r.json() : { sellers: [] }))
      .then((d) => setSellers(d.sellers || d.users || []))
      .catch(() => {});
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: {
            name: form.name,
            phone: form.phone,
            email: form.email,
            city: form.city,
            preferredChannel: form.preferredChannel,
            photo,
          },
          source: form.source,
          vehicleInterest: form.vehicleInterest,
          budget: form.budget,
          assignedTo: form.assignedTo || undefined,
          nextFollowUpDate: form.nextFollowUpDate || null,
          notes: form.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo guardar');
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function addActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activityContent.trim()) return;
    const res = await fetchWithAuth(`/api/leads/${lead.id}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activityType, content: activityContent }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'No se pudo registrar la actividad');
      return;
    }
    setActivityContent('');
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Acciones CRM</h2>
        <div className="flex flex-wrap gap-2">
          <Link href={`/appointments?leadId=${lead.id}`} className="px-3 py-2 rounded bg-primary-600 text-white text-sm">
            Convertir a cita
          </Link>
          {showService ? (
            <Link href={`/service?leadId=${lead.id}&customer=${encodeURIComponent(lead.contact?.name || '')}`} className="px-3 py-2 rounded border text-sm">
              Crear orden de trabajo
            </Link>
          ) : null}
          <Link href={`/deals?leadId=${lead.id}`} className="px-3 py-2 rounded border text-sm">
            Convertir a venta / deal
          </Link>
          <Link href="/messages" className="px-3 py-2 rounded border text-sm">
            Mensajes
          </Link>
        </div>
      </section>

      <form onSubmit={saveProfile} className="bg-white rounded-xl border p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <h2 className="text-lg font-semibold sm:col-span-2">Editar ficha</h2>
        <div className="sm:col-span-2 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border flex items-center justify-center">
            {photo ? (
              <img src={photo} alt={form.name || 'Cliente'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-slate-500">{(form.name || 'C').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <label className="text-sm font-medium text-primary-700 cursor-pointer">
            {uploadingPhoto ? 'Subiendo…' : photo ? 'Cambiar foto del cliente' : 'Subir foto del cliente'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingPhoto}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingPhoto(true);
                try {
                  const data = new FormData();
                  data.append('file', file);
                  data.append('type', 'lead_photo');
                  data.append('folder', 'lead-photos');
                  const res = await fetchWithAuth('/api/upload', { method: 'POST', body: data });
                  const json = await res.json();
                  if (!res.ok || !json.url) throw new Error(json.error || 'No se pudo subir');
                  setPhoto(json.url);
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Error al subir');
                } finally {
                  setUploadingPhoto(false);
                }
              }}
            />
          </label>
        </div>
        <label className="text-sm">
          Nombre
          <input className="mt-1 w-full border rounded px-3 py-2" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </label>
        <label className="text-sm">
          Teléfono
          <input className="mt-1 w-full border rounded px-3 py-2" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </label>
        <label className="text-sm">
          Email
          <input className="mt-1 w-full border rounded px-3 py-2" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </label>
        <label className="text-sm">
          Ciudad
          <input className="mt-1 w-full border rounded px-3 py-2" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </label>
        <label className="text-sm">
          Canal preferido
          <select className="mt-1 w-full border rounded px-3 py-2" value={form.preferredChannel} onChange={(e) => setForm((f) => ({ ...f, preferredChannel: e.target.value }))}>
            <option value="phone">Teléfono</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </label>
        <label className="text-sm">
          Fuente
          <select className="mt-1 w-full border rounded px-3 py-2" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Interés de vehículo
          <input className="mt-1 w-full border rounded px-3 py-2" value={form.vehicleInterest} onChange={(e) => setForm((f) => ({ ...f, vehicleInterest: e.target.value }))} placeholder="Ej. Toyota Corolla 2022" />
        </label>
        <label className="text-sm">
          Presupuesto
          <input className="mt-1 w-full border rounded px-3 py-2" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
        </label>
        <label className="text-sm">
          Asignado a
          <select className="mt-1 w-full border rounded px-3 py-2" value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}>
            <option value="">Sin asignar</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Seguimiento
          <input type="datetime-local" className="mt-1 w-full border rounded px-3 py-2" value={form.nextFollowUpDate} onChange={(e) => setForm((f) => ({ ...f, nextFollowUpDate: e.target.value }))} />
        </label>
        <label className="text-sm sm:col-span-2">
          Notas
          <textarea className="mt-1 w-full border rounded px-3 py-2" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-gray-900 text-white text-sm disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar ficha'}
          </button>
        </div>
      </form>

      <section className="bg-white rounded-xl border p-5 space-y-3">
        <h2 className="text-lg font-semibold">Actividades / línea de tiempo</h2>
        <form onSubmit={addActivity} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <select className="border rounded px-3 py-2 text-sm" value={activityType} onChange={(e) => setActivityType(e.target.value as typeof activityType)}>
            <option value="note">Nota</option>
            <option value="call">Llamada</option>
            <option value="email">Email</option>
            <option value="message">Mensaje</option>
          </select>
          <input className="sm:col-span-2 border rounded px-3 py-2 text-sm" placeholder="Qué ocurrió…" value={activityContent} onChange={(e) => setActivityContent(e.target.value)} />
          <button type="submit" className="px-3 py-2 rounded bg-primary-600 text-white text-sm">Registrar</button>
        </form>
        {(lead.interactions || []).length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay actividades. Registra una llamada, nota o mensaje.</p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {[...lead.interactions]
              .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
              .map((it, i) => (
                <li key={it.id || i} className="text-sm border rounded p-3 bg-gray-50">
                  <span className="font-medium capitalize">{it.type}</span>
                  <p className="whitespace-pre-wrap">{it.content}</p>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
