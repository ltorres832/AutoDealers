'use client';

import { FormEvent, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { SpecializationMultiSelect } from '@/components/SpecializationMultiSelect';

export default function BusinessProfilePage() {
  const [form, setForm] = useState({
    name: '',
    description: '',
    municipality: '',
    address: '',
    phone: '',
    hours: '',
    published: false,
    mobileService: false,
    logoUrl: '',
    specialtySlugs: [] as string[],
    vehicleScopeSlugs: [] as string[],
  });
  const [taxonomy, setTaxonomy] = useState<{ specialties: Array<{ slug: string; label: string }>; vehicleScopes: Array<{ slug: string; label: string }> }>({
    specialties: [],
    vehicleScopes: [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/business/me')
      .then((r) => r.json())
      .then((d) => {
        const b = d.business || {};
        setForm({
          name: b.name || '',
          description: b.description || '',
          municipality: b.municipality || '',
          address: b.address || '',
          phone: b.phone || '',
          hours: b.hours || '',
          published: b.published === true,
          mobileService: b.mobileService === true,
          logoUrl: b.logoUrl || '',
          specialtySlugs: Array.isArray(b.specialtySlugs) ? b.specialtySlugs : [],
          vehicleScopeSlugs: Array.isArray(b.vehicleScopeSlugs) ? b.vehicleScopeSlugs : [],
        });
      });
    fetch('/api/business/specializations')
      .then((r) => r.json())
      .then((d) => {
        setTaxonomy({
          specialties: d.specialties || [],
          vehicleScopes: d.vehicleScopes || [],
        });
      });
  }, []);

  async function uploadPhoto(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append('photo', file);
      const res = await fetch('/api/business/profile/photo', { method: 'POST', body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo subir la imagen');
      setForm((prev) => ({ ...prev, logoUrl: json.logoUrl || json.business?.logoUrl || '' }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/business/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar');
      alert('Perfil guardado. La foto aparece en tu ficha pública de /servicios.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-black mb-2">Perfil público</h1>
      <p className="text-slate-600 mb-6">La foto de aquí es la que ven los clientes. Sin imagen, solo aparece la inicial.</p>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 grid gap-4 max-w-xl">
        <div>
          <p className="text-sm font-semibold text-slate-800 mb-1">Foto visible del negocio</p>
          <p className="text-xs text-slate-500 mb-3">
            Obligatoria para que el cliente te identifique. Se muestra en este panel y en tu ficha.
          </p>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 rounded-2xl bg-slate-100 overflow-hidden border-2 border-primary-200 flex items-center justify-center">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt={form.name || 'Foto del negocio'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-slate-400">{(form.name || 'N').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <label className="text-sm font-semibold text-primary-700 cursor-pointer">
              {uploading ? 'Subiendo…' : form.logoUrl ? 'Cambiar foto' : 'Subir foto'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => void uploadPhoto(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>
        <input className="border rounded-xl px-4 py-3" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <textarea className="border rounded-xl px-4 py-3" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="border rounded-xl px-4 py-3" placeholder="Municipio" value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
        <input className="border rounded-xl px-4 py-3" placeholder="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className="border rounded-xl px-4 py-3" placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="border rounded-xl px-4 py-3" placeholder="Horario" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={form.mobileService} onChange={(e) => setForm({ ...form, mobileService: e.target.checked })} />
          Servicio a domicilio
        </label>
        <SpecializationMultiSelect
          label="Qué trabajos hacen"
          hint="Obligatorio para publicar. Vacío no significa que haces de todo."
          required
          options={taxonomy.specialties}
          value={form.specialtySlugs}
          onChange={(specialtySlugs) => setForm({ ...form, specialtySlugs })}
        />
        <SpecializationMultiSelect
          label="En qué vehículos trabajan"
          hint="Marcas, orígenes o tipos. El cliente solo te verá si encaja con su carro."
          required
          options={taxonomy.vehicleScopes}
          value={form.vehicleScopeSlugs}
          onChange={(vehicleScopeSlugs) => setForm({ ...form, vehicleScopeSlugs })}
        />
        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          Publicar en el directorio
        </label>
        <button disabled={saving} className="bg-primary-600 text-white rounded-xl py-3 font-bold disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </DashboardLayout>
  );
}
