'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PublicBackButton from '@/components/PublicBackButton';

const currentYear = new Date().getFullYear();

export default function VenderTuAutoPage() {
  const params = useParams();
  const router = useRouter();
  const subdomain = String(params.subdomain || '');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    make: '',
    model: '',
    year: String(currentYear - 5),
    mileage: '',
    color: '',
    vin: '',
    condition: 'good',
    notes: '',
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tenantId, setTenantId] = useState('');

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear + 1; y >= 1980; y--) years.push(y);
    return years;
  }, []);

  async function ensureTenantId(): Promise<string> {
    if (tenantId) return tenantId;
    const res = await fetch(`/api/tenant/${encodeURIComponent(subdomain)}`);
    if (!res.ok) throw new Error('No se pudo resolver el concesionario');
    const data = await res.json();
    const id = String(data.tenant?.id || data.id || '');
    if (!id) throw new Error('Concesionario no encontrado');
    setTenantId(id);
    return id;
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    setUploading(true);
    try {
      const tid = await ensureTenantId();
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 20 - photos.length)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('tenantId', tid);
        const res = await fetch('/api/public/sell-to-dealer/upload', {
          method: 'POST',
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al subir foto');
        uploaded.push(data.url);
      }
      setPhotos((prev) => [...prev, ...uploaded].slice(0, 20));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (photos.length < 1) {
      setError('Sube al menos una foto del vehículo.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/sell-to-dealer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain,
          name: form.name,
          phone: form.phone,
          email: form.email,
          make: form.make,
          model: form.model,
          year: Number(form.year),
          mileage: Number(form.mileage),
          color: form.color,
          vin: form.vin || undefined,
          condition: form.condition,
          notes: form.notes || undefined,
          photos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar');
      router.push(
        `/${subdomain}/vender/seguimiento?token=${encodeURIComponent(data.publicToken)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
          <PublicBackButton className="text-primary-600 hover:underline font-medium">
            ← Volver
          </PublicBackButton>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-bold text-slate-900">Vender tu auto al dealer</h1>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
          Esto <strong>no es un trade-in</strong>: solo vendes tu auto al concesionario, sin comprar
          otro vehículo.
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <section>
            <h2 className="font-bold text-slate-900 mb-3">Tus datos de contacto</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Nombre completo *</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full border rounded-xl px-3 py-2.5"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Teléfono *</span>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full border rounded-xl px-3 py-2.5"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Email *</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full border rounded-xl px-3 py-2.5"
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 mb-3">Información del vehículo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Marca *</span>
                <input
                  required
                  value={form.make}
                  onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
                  className="mt-1 w-full border rounded-xl px-3 py-2.5"
                  placeholder="Toyota"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Modelo *</span>
                <input
                  required
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                  className="mt-1 w-full border rounded-xl px-3 py-2.5"
                  placeholder="Corolla"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Año *</span>
                <select
                  required
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                  className="mt-1 w-full border rounded-xl px-3 py-2.5"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Millaje *</span>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.mileage}
                  onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))}
                  className="mt-1 w-full border rounded-xl px-3 py-2.5"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Color *</span>
                <input
                  required
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="mt-1 w-full border rounded-xl px-3 py-2.5"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Condición *</span>
                <select
                  required
                  value={form.condition}
                  onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                  className="mt-1 w-full border rounded-xl px-3 py-2.5"
                >
                  <option value="excellent">Excelente</option>
                  <option value="good">Buena</option>
                  <option value="fair">Regular</option>
                  <option value="poor">Necesita reparación</option>
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">VIN (opcional)</span>
                <input
                  value={form.vin}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      vin: e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17),
                    }))
                  }
                  maxLength={17}
                  className="mt-1 w-full border rounded-xl px-3 py-2.5 font-mono"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Notas (opcional)</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full border rounded-xl px-3 py-2.5"
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 mb-2">Fotos *</h2>
            <p className="text-sm text-slate-500 mb-3">Mínimo 1, máximo 20. Exterior, interior y daños si aplica.</p>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading || photos.length >= 20}
              onChange={(e) => void onFilesSelected(e.target.files)}
              className="block w-full text-sm"
            />
            {uploading ? <p className="text-sm text-slate-500 mt-2">Subiendo…</p> : null}
            {photos.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((url) => (
                  <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((p) => p !== url))}
                      className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full h-12 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold disabled:opacity-50"
          >
            {submitting ? 'Enviando…' : 'Enviar al dealer'}
          </button>

          <p className="text-xs text-slate-500 text-center">
            Al enviar, el dealer recibe tu solicitud en tiempo real y podrá contactarte y hacerte una
            oferta desde la plataforma.{' '}
            <Link href={`/${subdomain}`} className="text-primary-600 hover:underline">
              Volver al sitio
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
