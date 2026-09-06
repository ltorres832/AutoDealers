'use client';

import { FormEvent, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { SpecializationMultiSelect } from '@/components/SpecializationMultiSelect';

type Service = {
  id: string;
  name: string;
  description?: string;
  priceCents?: number | null;
  durationMinutes?: number | null;
  isActive?: boolean;
  photoUrls?: string[];
  videoUrls?: string[];
  specialtySlugs?: string[];
  vehicleScopeSlugs?: string[];
};

const emptyForm = {
  id: '',
  name: '',
  description: '',
  price: '',
  durationMinutes: '60',
  isActive: true,
  photoUrls: [] as string[],
  videoUrls: [] as string[],
  specialtySlugs: [] as string[],
  vehicleScopeSlugs: [] as string[],
};

export default function BusinessServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [taxonomy, setTaxonomy] = useState<{
    specialties: Array<{ slug: string; label: string }>;
    vehicleScopes: Array<{ slug: string; label: string }>;
  }>({ specialties: [], vehicleScopes: [] });
  const [allowedSpecialties, setAllowedSpecialties] = useState<string[]>([]);
  const [allowedScopes, setAllowedScopes] = useState<string[]>([]);

  async function load() {
    const res = await fetch('/api/business/services');
    const data = await res.json();
    setServices(data.services || []);
  }
  useEffect(() => {
    void load();
    Promise.all([fetch('/api/business/specializations'), fetch('/api/business/me')])
      .then(async ([taxRes, meRes]) => {
        const tax = await taxRes.json();
        const me = await meRes.json();
        setTaxonomy({
          specialties: tax.specialties || [],
          vehicleScopes: tax.vehicleScopes || [],
        });
        setAllowedSpecialties(me.business?.specialtySlugs || []);
        setAllowedScopes(me.business?.vehicleScopeSlugs || []);
      })
      .catch(() => undefined);
  }, []);

  async function uploadMedia(file: File | null, kind: 'image' | 'video') {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('folder', 'services');
      const res = await fetch('/api/business/upload', { method: 'POST', body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo subir el archivo');
      setForm((prev) =>
        kind === 'video'
          ? { ...prev, videoUrls: [...prev.videoUrls, json.url] }
          : { ...prev, photoUrls: [...prev.photoUrls, json.url] }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/business/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id || undefined,
          name: form.name,
          description: form.description,
          priceCents: form.price ? Math.round(Number(form.price) * 100) : null,
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
          isActive: form.isActive,
          photoUrls: form.photoUrls,
          videoUrls: form.videoUrls,
          specialtySlugs: form.specialtySlugs,
          vehicleScopeSlugs: form.vehicleScopeSlugs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este servicio?')) return;
    const res = await fetch(`/api/business/services?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No se pudo eliminar');
      return;
    }
    if (form.id === id) setForm(emptyForm);
    await load();
  }

  function edit(svc: Service) {
    setForm({
      id: svc.id,
      name: svc.name || '',
      description: svc.description || '',
      price: svc.priceCents != null ? String(svc.priceCents / 100) : '',
      durationMinutes: svc.durationMinutes != null ? String(svc.durationMinutes) : '60',
      isActive: svc.isActive !== false,
      photoUrls: svc.photoUrls || [],
      videoUrls: svc.videoUrls || [],
      specialtySlugs: svc.specialtySlugs || [],
      vehicleScopeSlugs: svc.vehicleScopeSlugs || [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-black mb-2">Servicios</h1>
      <p className="text-slate-600 mb-6">Catálogo del negocio con fotos y videos. Esto es lo que ofreces en el taller.</p>
      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-5 mb-6 grid gap-3">
        <div className="grid md:grid-cols-2 gap-3">
          <input required className="border rounded-xl px-3 py-2" placeholder="Nombre del servicio *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="border rounded-xl px-3 py-2" placeholder="Precio USD (vacío = cotizar)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input type="number" min={15} className="border rounded-xl px-3 py-2" placeholder="Duración min" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Activo
          </label>
        </div>
        <textarea className="border rounded-xl px-3 py-2" placeholder="Descripción" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <SpecializationMultiSelect
          label="Qué cubre este servicio"
          hint="Solo un subconjunto de lo que declaraste en el perfil."
          options={taxonomy.specialties.filter((opt) => !allowedSpecialties.length || allowedSpecialties.includes(opt.slug))}
          value={form.specialtySlugs}
          onChange={(specialtySlugs) => setForm({ ...form, specialtySlugs })}
        />
        <SpecializationMultiSelect
          label="Para qué vehículos es este servicio"
          options={taxonomy.vehicleScopes.filter((opt) => !allowedScopes.length || allowedScopes.includes(opt.slug))}
          value={form.vehicleScopeSlugs}
          onChange={(vehicleScopeSlugs) => setForm({ ...form, vehicleScopeSlugs })}
        />

        <div>
          <p className="text-sm font-semibold mb-2">Fotos</p>
          <div className="flex flex-wrap gap-3 mb-2">
            {form.photoUrls.map((url) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="w-24 h-24 object-cover rounded-xl border" />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 bg-white border rounded-full w-6 h-6 text-xs"
                  onClick={() => setForm({ ...form, photoUrls: form.photoUrls.filter((u) => u !== url) })}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <label className="text-sm font-semibold text-primary-700 cursor-pointer">
            {uploading ? 'Subiendo…' : 'Subir foto'}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => void uploadMedia(e.target.files?.[0] || null, 'image')} />
          </label>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Videos</p>
          <div className="flex flex-wrap gap-3 mb-2">
            {form.videoUrls.map((url) => (
              <div key={url} className="relative">
                <video src={url} className="w-40 h-24 rounded-xl border bg-black" controls />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 bg-white border rounded-full w-6 h-6 text-xs"
                  onClick={() => setForm({ ...form, videoUrls: form.videoUrls.filter((u) => u !== url) })}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <label className="text-sm font-semibold text-primary-700 cursor-pointer">
            {uploading ? 'Subiendo…' : 'Subir video'}
            <input type="file" accept="video/*" className="hidden" disabled={uploading} onChange={(e) => void uploadMedia(e.target.files?.[0] || null, 'video')} />
          </label>
        </div>

        <div className="flex gap-3">
          <button disabled={saving} className="bg-primary-600 text-white rounded-xl px-5 py-2 font-bold disabled:opacity-50">
            {saving ? 'Guardando…' : form.id ? 'Actualizar servicio' : 'Agregar servicio'}
          </button>
          {form.id ? (
            <button type="button" className="border rounded-xl px-5 py-2" onClick={() => setForm(emptyForm)}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      {services.length === 0 ? (
        <p className="text-slate-500">Todavía no hay servicios. Agrégalos con foto o video.</p>
      ) : (
        <ul className="space-y-3">
          {services.map((svc) => (
            <li key={svc.id} className="bg-white rounded-2xl border p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border shrink-0">
                    {svc.photoUrls?.[0] ? (
                      <img src={svc.photoUrls[0]} alt={svc.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">🧰</div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold">{svc.name}{svc.isActive === false ? ' · inactivo' : ''}</div>
                    <div className="text-sm text-slate-500">
                      {svc.priceCents != null ? `$${(svc.priceCents / 100).toFixed(2)}` : 'Cotizar'}
                      {svc.durationMinutes ? ` · ${svc.durationMinutes} min` : ''}
                    </div>
                    {svc.description ? <p className="text-sm mt-1 text-slate-600">{svc.description}</p> : null}
                    {(svc.videoUrls?.length || 0) > 0 ? <p className="text-xs text-slate-500 mt-1">{svc.videoUrls?.length} video(s)</p> : null}
                  </div>
                </div>
                <div className="flex gap-2 h-fit">
                  <button type="button" className="px-3 py-2 text-sm border rounded-xl" onClick={() => edit(svc)}>Editar</button>
                  <button type="button" className="px-3 py-2 text-sm border rounded-xl text-red-600" onClick={() => void remove(svc.id)}>Eliminar</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  );
}
