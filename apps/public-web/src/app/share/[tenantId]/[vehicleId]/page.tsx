'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { buildQrImageUrl } from '@autodealers/inventory/client';
import VehicleImageFrame from '@/components/VehicleImageFrame';
import { buildTelHref, buildWhatsAppHref } from '@/lib/contact-links';
import { buildPublicVehicleDetailHref } from '@/lib/public-vehicle-detail-href';
import { handleImageError } from '@/lib/vehicle-image';

type SharePayload = {
  vehicle: {
    id: string;
    tenantId: string;
    make: string;
    model: string;
    year: number;
    price: number;
    currency: string;
    mileage?: number;
    condition?: string;
    description?: string;
    photos: string[];
    videos: string[];
    publishedOnPublicPage?: boolean;
  };
  dealer: {
    id: string;
    name: string;
    phone: string;
    whatsapp: string;
    email: string;
    logoUrl: string;
    address: string;
  };
  sharePath: string;
  qrImageUrl: string;
};

function formatPrice(price: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('es-PR', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(price || 0);
  } catch {
    return `$${Number(price || 0).toLocaleString('es-PR')}`;
  }
}

function formatMileage(mileage?: number) {
  if (mileage == null || !Number.isFinite(mileage)) return null;
  return `${Number(mileage).toLocaleString('es-PR')} mi`;
}

function conditionLabel(condition?: string) {
  if (!condition) return null;
  const map: Record<string, string> = {
    new: 'Nuevo',
    used: 'Usado',
    certified: 'Certificado',
    nuevo: 'Nuevo',
    usado: 'Usado',
  };
  return map[condition.toLowerCase()] || condition;
}

export default function ShareLandingPage() {
  const params = useParams();
  const tenantId = String(params.tenantId || '');
  const vehicleId = String(params.vehicleId || '');

  const [data, setData] = useState<SharePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [leadStatus, setLeadStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', email: '', message: '' });

  useEffect(() => {
    if (!tenantId || !vehicleId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/public/share/${encodeURIComponent(tenantId)}/${encodeURIComponent(vehicleId)}`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Vehículo no encontrado');
        }
        const payload = (await res.json()) as SharePayload;
        if (!cancelled) {
          setData(payload);
          setPhotoIndex(0);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error al cargar');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId, vehicleId]);

  const absoluteShareUrl = useMemo(() => {
    if (!data?.sharePath) return '';
    if (typeof window === 'undefined') return data.sharePath;
    return `${window.location.origin}${data.sharePath}`;
  }, [data?.sharePath]);

  const qrSrc = useMemo(() => {
    if (!absoluteShareUrl) return data?.qrImageUrl || '';
    return buildQrImageUrl(absoluteShareUrl, 220);
  }, [absoluteShareUrl, data?.qrImageUrl]);

  const photos = data?.vehicle.photos?.filter(Boolean) || [];
  const videos = (data?.vehicle.videos || []).filter(
    (u): u is string => typeof u === 'string' && u.trim() !== ''
  );
  const title = data
    ? `${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}`.trim()
    : '';

  const waHref = data
    ? buildWhatsAppHref(
        data.dealer.whatsapp || data.dealer.phone,
        `Hola, me interesa el ${title} que vi en su enlace.`
      )
    : null;
  const telHref = data ? buildTelHref(data.dealer.phone || data.dealer.whatsapp) : null;

  const marketplaceHref =
    data?.vehicle.publishedOnPublicPage === true
      ? buildPublicVehicleDetailHref({
          vehicleId: data.vehicle.id,
          tenantId: data.vehicle.tenantId,
          source: 'dealer',
        })
      : null;

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setLeadStatus('sending');
    try {
      const res = await fetch('/api/leads/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: data.vehicle.tenantId,
          source: 'web',
          contact: {
            name: leadForm.name,
            phone: leadForm.phone,
            email: leadForm.email || undefined,
            message: leadForm.message || undefined,
          },
          notes: leadForm.message || `Interés desde enlace compartido: ${title}`,
          vehicleInterest: `${title} (${data.vehicle.id})`,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudo enviar');
      }
      setLeadStatus('ok');
      setLeadForm({ name: '', phone: '', email: '', message: '' });
    } catch {
      setLeadStatus('error');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Vehículo no disponible</h1>
        <p className="text-slate-600 text-sm max-w-sm">
          {error || 'Este enlace ya no está activo o el vehículo fue retirado.'}
        </p>
      </div>
    );
  }

  const { vehicle, dealer } = data;
  const currentPhoto = photos[photoIndex] || photos[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {dealer.logoUrl ? (
            <img
              src={dealer.logoUrl}
              alt={dealer.name}
              className="h-10 w-10 rounded-full object-contain bg-slate-100"
              onError={handleImageError}
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
              {dealer.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{dealer.name}</p>
            <p className="text-xs text-slate-500">Inventario compartido</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 pb-28 space-y-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="aspect-[4/3] bg-slate-100">
            {currentPhoto ? (
              <VehicleImageFrame
                src={currentPhoto}
                alt={title}
                className="h-full w-full"
                loading="eager"
                onError={handleImageError}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                Sin fotos
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {photos.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setPhotoIndex(i)}
                  className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === photoIndex ? 'border-slate-900' : 'border-transparent'
                  }`}
                  aria-label={`Foto ${i + 1}`}
                >
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-contain bg-slate-50"
                    onError={handleImageError}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-2xl font-semibold text-emerald-700">
            {formatPrice(vehicle.price, vehicle.currency)}
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {formatMileage(vehicle.mileage) && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                {formatMileage(vehicle.mileage)}
              </span>
            )}
            {conditionLabel(vehicle.condition) && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                {conditionLabel(vehicle.condition)}
              </span>
            )}
          </div>
          {vehicle.description?.trim() && (
            <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
              {vehicle.description.trim()}
            </p>
          )}
          {marketplaceHref && (
            <Link
              href={marketplaceHref}
              className="inline-flex text-sm font-medium text-slate-800 underline underline-offset-2"
            >
              Ver ficha completa en el mercado
            </Link>
          )}
        </section>

        {videos.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold">Videos</h2>
            {videos.map((src, i) => (
              <div key={`${src}-${i}`} className="aspect-video overflow-hidden rounded-xl bg-black">
                <video src={src} controls className="h-full w-full object-contain" playsInline>
                  Tu navegador no soporta videos.
                </video>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Código QR</h2>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            {qrSrc && (
              <img
                src={qrSrc}
                alt="Código QR del vehículo"
                className="h-40 w-40 rounded-lg border border-slate-200 bg-white object-contain p-2"
              />
            )}
            <p className="text-sm text-slate-600 text-center sm:text-left">
              Escanea para abrir este vehículo en el teléfono. También puedes compartir el enlace
              directamente.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">¿Te interesa este vehículo?</h2>
          <p className="text-sm text-slate-600">
            Déjanos tus datos y {dealer.name} te contactará.
          </p>
          {leadStatus === 'ok' ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              ¡Gracias! Recibimos tu mensaje.
            </p>
          ) : (
            <form onSubmit={submitLead} className="space-y-3">
              <input
                required
                name="name"
                placeholder="Nombre"
                value={leadForm.name}
                onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-800"
              />
              <input
                required
                name="phone"
                type="tel"
                placeholder="Teléfono / WhatsApp"
                value={leadForm.phone}
                onChange={(e) => setLeadForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-800"
              />
              <input
                name="email"
                type="email"
                placeholder="Correo (opcional)"
                value={leadForm.email}
                onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-800"
              />
              <textarea
                name="message"
                rows={3}
                placeholder="Mensaje (opcional)"
                value={leadForm.message}
                onChange={(e) => setLeadForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-800"
              />
              {leadStatus === 'error' && (
                <p className="text-sm text-red-600">No se pudo enviar. Intenta de nuevo o usa WhatsApp.</p>
              )}
              <button
                type="submit"
                disabled={leadStatus === 'sending'}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {leadStatus === 'sending' ? 'Enviando…' : 'Enviar consulta'}
              </button>
            </form>
          )}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 px-4 py-3">
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              WhatsApp
            </a>
          )}
          {telHref && (
            <a
              href={telHref}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Llamar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
