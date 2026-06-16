'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOrCreateFreeListingVisitorId } from '@/lib/free-listing-visitor';
import { saveFreeListingToDevice } from '@/lib/free-listing-storage';
import ShareListingPanel from '@/components/ShareListingPanel';

interface FreeListingsCfg {
  enabled: boolean;
  maxActiveFreeVehiclesPerSeller: number;
  durationDays: number;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonLabel: string;
  quickListingPath: string;
  registerPath: string;
  registerCtaLabel: string;
  successHeadline: string;
  successSubtitle: string;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function PublicarGratisPage() {
  const router = useRouter();
  const [cfg, setCfg] = useState<FreeListingsCfg | null>(null);
  const [loadingCfg, setLoadingCfg] = useState(true);

  const [form, setForm] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    city: '',
    make: '',
    model: '',
    year: CURRENT_YEAR,
    mileage: '',
    price: '',
    currency: 'USD',
    condition: 'used',
    transmission: '',
    fuelType: '',
    color: '',
    bodyType: '',
    description: '',
    acceptTerms: false,
  });

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    id: string;
    expiresAt: string | null;
    durationDays: number;
    managementToken?: string | null;
    make: string;
    model: string;
    year: number;
  } | null>(null);
  const [visitorId, setVisitorId] = useState('');
  const [eligibility, setEligibility] = useState<{
    allowed: boolean;
    reason?: string;
    registerPath?: string;
    maxFreeListings?: number;
    durationDays?: number;
  } | null>(null);

  useEffect(() => {
    const vid = getOrCreateFreeListingVisitorId();
    setVisitorId(vid);
  }, []);

  useEffect(() => {
    if (!visitorId) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ visitorId });
        if (form.contactPhone.trim()) params.set('contactPhone', form.contactPhone.trim());
        if (form.contactEmail.trim()) params.set('contactEmail', form.contactEmail.trim());
        const r = await fetch(`/api/public/quick-listings/eligibility?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setEligibility(j);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visitorId, form.contactPhone, form.contactEmail]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/public/free-listings-config', { cache: 'no-store' });
        if (!r.ok) return;
        const j = (await r.json()) as FreeListingsCfg;
        if (!cancelled) setCfg(j);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingCfg(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featureEnabled = useMemo(() => {
    return Boolean(cfg && cfg.enabled && cfg.maxActiveFreeVehiclesPerSeller > 0);
  }, [cfg]);

  const blockedByEligibility = eligibility?.allowed === false;

  const handleField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value as never }));
  };

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    if (photos.length + files.length > 6) {
      setError('Solo puedes subir hasta 6 fotos.');
      e.target.value = '';
      return;
    }
    setUploadingPhoto(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/public/quick-listings/upload', { method: 'POST', body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.url) {
          throw new Error(j.error || 'No se pudo subir la imagen');
        }
        uploaded.push(j.url as string);
      }
      setPhotos((p) => [...p, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imágenes');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  }

  function removePhoto(i: number) {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.contactEmail.trim()) {
      setError('El correo electrónico es obligatorio.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (!form.acceptTerms) {
      setError('Debes aceptar que se mostrarán tu nombre, teléfono y la información del vehículo.');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch('/api/public/quick-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: Number(form.year),
          price: form.price ? Number(form.price) : null,
          mileage: form.mileage ? Number(form.mileage) : null,
          photos,
          visitorId,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) {
        setError(j.error || 'No se pudo publicar el anuncio.');
        return;
      }
      setSuccess({
        id: j.id,
        expiresAt: j.expiresAt,
        durationDays: j.durationDays,
        managementToken: j.managementToken,
        make: form.make,
        model: form.model,
        year: Number(form.year),
      });
      if (j.id && j.managementToken) {
        saveFreeListingToDevice({
          id: j.id,
          managementToken: j.managementToken,
          make: form.make,
          model: form.model,
          year: Number(form.year),
        });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCfg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Cargando…</div>
      </div>
    );
  }

  if (cfg && !featureEnabled) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Publicaciones gratis no disponibles</h1>
          <p className="text-slate-600">
            En este momento la opción de publicar gratis está desactivada. Crea una cuenta de vendedor para seguir publicando.
          </p>
          <Link
            href={cfg.registerPath || '/register?type=seller'}
            className="inline-block mt-6 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    );
  }

  if (cfg && blockedByEligibility) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Regístrate para seguir publicando</h1>
          <p className="text-slate-600 mb-4">
            {eligibility?.reason ||
              'Ya usaste tus publicaciones gratuitas sin cuenta. Crea tu perfil de vendedor para continuar.'}
          </p>
          <p className="text-sm text-slate-500 mb-6">
            El sistema detecta tu dispositivo, teléfono y correo para evitar publicaciones ilimitadas sin registro. Con una
            cuenta tendrás panel, más anuncios, mensajería y financiamiento.
          </p>
          <Link
            href={eligibility?.registerPath || cfg.registerPath || '/register?type=seller'}
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700"
          >
            Crear cuenta de vendedor
          </Link>
          <Link href="/" className="block mt-4 text-sm text-slate-500 hover:text-primary-600">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (success && cfg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 py-16 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-lg p-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 text-center mb-3">
            {cfg.successHeadline || '¡Tu anuncio está publicado!'}
          </h1>
          <p className="text-center text-slate-600 mb-2">
            Tu anuncio estará activo durante <strong>{success.durationDays || cfg.durationDays} días</strong>. Después se
            eliminará automáticamente.
          </p>
          <p className="text-center text-slate-500 text-sm mb-2">
            En público se muestran tu <strong>nombre</strong>, <strong>teléfono</strong> y los <strong>datos del vehículo</strong>.
          </p>

          {success.managementToken ? (
            <ShareListingPanel
              listingId={success.id}
              managementToken={success.managementToken}
              vehicleLabel={`${success.year} ${success.make} ${success.model}`}
              registerPath={cfg.registerPath || '/register?type=seller'}
            />
          ) : null}

          <p className="text-center text-slate-500 text-sm mb-6">
            <Link href={`/anuncio/${success.id}`} className="text-primary-600 font-semibold hover:underline">
              Ver tu anuncio completo
            </Link>
            {' · '}
            <Link href="/mis-anuncios" className="text-primary-600 font-semibold hover:underline">
              Mis anuncios y estadísticas
            </Link>
          </p>

          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-6 mb-6">
            <h2 className="font-bold text-slate-900 mb-2">¿Quieres conseguir muchos más clientes?</h2>
            <p className="text-sm text-slate-700 mb-4">
              {cfg.successSubtitle ||
                'Regístrate gratis como vendedor y obtén panel propio, cotizaciones, financiamiento, mensajería y más.'}
            </p>
            <Link
              href={cfg.registerPath || '/register?type=seller'}
              className="inline-block px-5 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700"
            >
              {cfg.registerCtaLabel || 'Crear cuenta de vendedor'}
            </Link>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSuccess(null);
                setForm({
                  contactName: '',
                  contactPhone: '',
                  contactEmail: '',
                  city: '',
                  make: '',
                  model: '',
                  year: CURRENT_YEAR,
                  mileage: '',
                  price: '',
                  currency: 'USD',
                  condition: 'used',
                  transmission: '',
                  fuelType: '',
                  color: '',
                  bodyType: '',
                  description: '',
                  acceptTerms: false,
                });
                setPhotos([]);
              }}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50"
            >
              Publicar otro
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
            {cfg?.ctaTitle || 'Publica tu auto gratis'}
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            {cfg?.ctaSubtitle || 'Llega a miles de compradores hoy mismo'}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-800 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Hasta {cfg?.maxActiveFreeVehiclesPerSeller ?? 2} anuncios gratis por persona ·{' '}
              {cfg?.durationDays ?? 14} días cada uno · solo se muestra tu teléfono y los datos del auto.
            </span>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-8">
          {/* Vehicle data */}
          <section>
            <h2 className="font-bold text-lg text-slate-900 mb-4">Información del vehículo</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Marca *">
                <input required value={form.make} onChange={handleField('make')} className={inputClass} placeholder="Toyota" />
              </Field>
              <Field label="Modelo *">
                <input required value={form.model} onChange={handleField('model')} className={inputClass} placeholder="Corolla" />
              </Field>
              <Field label="Año *">
                <input
                  required
                  type="number"
                  min={1900}
                  max={CURRENT_YEAR + 1}
                  value={form.year}
                  onChange={handleField('year')}
                  className={inputClass}
                />
              </Field>
              <Field label="Precio *">
                <div className="flex gap-2">
                  <input
                    required
                    type="number"
                    min={1}
                    value={form.price}
                    onChange={handleField('price')}
                    className={inputClass}
                    placeholder="15000"
                  />
                  <select value={form.currency} onChange={handleField('currency')} className={selectClass} style={{ width: 90 }}>
                    <option value="USD">USD</option>
                    <option value="DOP">DOP</option>
                  </select>
                </div>
              </Field>
              <Field label="Condición">
                <select value={form.condition} onChange={handleField('condition')} className={selectClass}>
                  <option value="used">Usado</option>
                  <option value="new">Nuevo</option>
                  <option value="certified">Certificado</option>
                </select>
              </Field>
              <Field label="Millaje (millas)">
                <input
                  type="number"
                  min={0}
                  value={form.mileage}
                  onChange={handleField('mileage')}
                  className={inputClass}
                  placeholder="Ej. 45000"
                />
              </Field>
              <Field label="Transmisión">
                <select value={form.transmission} onChange={handleField('transmission')} className={selectClass}>
                  <option value="">—</option>
                  <option value="automatic">Automática</option>
                  <option value="manual">Manual</option>
                </select>
              </Field>
              <Field label="Combustible">
                <select value={form.fuelType} onChange={handleField('fuelType')} className={selectClass}>
                  <option value="">—</option>
                  <option value="gasoline">Gasolina</option>
                  <option value="diesel">Diésel</option>
                  <option value="hybrid">Híbrido</option>
                  <option value="electric">Eléctrico</option>
                </select>
              </Field>
              <Field label="Color">
                <input value={form.color} onChange={handleField('color')} className={inputClass} />
              </Field>
              <Field label="Tipo de carrocería">
                <input value={form.bodyType} onChange={handleField('bodyType')} className={inputClass} placeholder="Sedán, SUV, Pickup..." />
              </Field>
              <Field label="Ciudad" className="md:col-span-2">
                <input value={form.city} onChange={handleField('city')} className={inputClass} placeholder="San Juan, Bayamón…" />
              </Field>
              <Field label="Descripción" className="md:col-span-2">
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={handleField('description')}
                  className={inputClass}
                  placeholder="Detalles, equipamiento, estado, condiciones de venta…"
                  maxLength={4000}
                />
              </Field>
            </div>
          </section>

          {/* Photos */}
          <section>
            <h2 className="font-bold text-lg text-slate-900 mb-4">Fotos (hasta 6)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((p, i) => (
                <div key={p} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt={`foto-${i + 1}`} className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-7 h-7 bg-black/60 text-white rounded-full text-xs"
                    aria-label="Eliminar"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <label className="aspect-[4/3] flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:bg-slate-50 cursor-pointer text-sm">
                  {uploadingPhoto ? 'Subiendo…' : '+ Agregar foto'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              JPG, PNG o WebP (hasta 12 MB cada una antes de optimizar). Se corrige la orientación y, si la imagen es muy
              grande, se reduce hasta 1920 px por lado con buena calidad. Vista previa sin recortes.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="font-bold text-lg text-slate-900 mb-1">Datos de contacto</h2>
            <p className="text-xs text-slate-500 mb-4">
              Solo tu <strong>teléfono</strong> y <strong>nombre</strong> aparecen en el anuncio público. El email es
              obligatorio, queda privado y lo usamos para invitarte a registrarte como vendedor.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Tu nombre *">
                <input required value={form.contactName} onChange={handleField('contactName')} className={inputClass} />
              </Field>
              <Field label="Teléfono *">
                <input
                  required
                  type="tel"
                  value={form.contactPhone}
                  onChange={handleField('contactPhone')}
                  className={inputClass}
                  placeholder="+1 809 000 0000"
                />
              </Field>
              <Field label="Email (privado) *" className="md:col-span-2">
                <input
                  required
                  type="email"
                  value={form.contactEmail}
                  onChange={handleField('contactEmail')}
                  className={inputClass}
                  placeholder="tu@correo.com"
                />
              </Field>
            </div>
          </section>

          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={handleField('acceptTerms')}
              className="mt-1"
            />
            <span>
              Acepto que mi anuncio se publique durante {cfg?.durationDays ?? 14} días, que se muestren mi nombre,
              teléfono y datos del vehículo, y que el sistema lo elimine automáticamente al vencer.
            </span>
          </label>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={submitting || uploadingPhoto}
              className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-60"
            >
              {submitting ? 'Publicando…' : 'Publicar anuncio gratis'}
            </button>
            <Link
              href={cfg?.registerPath || '/register?type=seller'}
              className="flex-1 py-3 text-center border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
            >
              {cfg?.registerCtaLabel || 'Mejor crear cuenta de vendedor'}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const selectClass =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
