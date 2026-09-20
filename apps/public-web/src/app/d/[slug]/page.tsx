'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { DealerSiteConfig } from '@autodealers/inventory/client';
import VehicleImageFrame from '@/components/VehicleImageFrame';
import { buildTelHref, buildWhatsAppHref } from '@/lib/contact-links';
import { getFirstPhoto, handleImageError } from '@/lib/vehicle-image';

type SiteVehicle = {
  id: string;
  make?: string;
  model?: string;
  year?: number;
  price?: number;
  currency?: string;
  mileage?: number;
  photos?: string[];
  condition?: string;
};

type DealerSitePayload = {
  tenantId: string;
  site: DealerSiteConfig;
  dealerName: string;
  vehicles: SiteVehicle[];
};

function formatPrice(price?: number, currency = 'USD') {
  if (price == null || !Number.isFinite(price)) return 'Consultar';
  try {
    return new Intl.NumberFormat('es-PR', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `$${Number(price).toLocaleString('es-PR')}`;
  }
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export default function DealerSitePublicPage() {
  const params = useParams();
  const slug = String(params.slug || '');

  const [data, setData] = useState<DealerSitePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/public/dealer-site/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Sitio no encontrado');
        }
        const payload = (await res.json()) as DealerSitePayload;
        if (!cancelled) setData(payload);
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
  }, [slug]);

  const primary = data?.site.primaryColor || '#0f172a';
  const template = data?.site.templateId || 'starter';
  const showExtras = template === 'growth' || template === 'premium';
  const isPremium = template === 'premium';

  const phone = data?.site.phone || '';
  const whatsapp = data?.site.whatsapp || phone;
  const telHref = buildTelHref(phone || whatsapp);
  const waHref = buildWhatsAppHref(
    whatsapp,
    `Hola, vi su sitio web de ${data?.dealerName || 'su concesionario'} y me gustaría más información.`
  );

  const headerStyle = useMemo(() => {
    if (data?.site.heroImageUrl) {
      return {
        backgroundImage: `linear-gradient(160deg, ${primary}cc 0%, ${primary}99 40%, #0f172acc 100%), url(${data.site.heroImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } as const;
    }
    return {
      background: `linear-gradient(160deg, ${primary} 0%, ${primary}dd 55%, #0f172a 100%)`,
    } as const;
  }, [primary, data?.site.heroImageUrl]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300"
          style={{ borderTopColor: primary }}
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Sitio no disponible</h1>
        <p className="text-slate-600 text-sm max-w-sm">
          {error || 'Este concesionario aún no tiene un sitio publicado.'}
        </p>
      </div>
    );
  }

  const { site, dealerName, tenantId, vehicles } = data;
  const headline = site.headline || dealerName;
  const tagline = site.tagline || 'Inventario seleccionado para ti';
  const services = Array.isArray(site.services) ? site.services : [];
  const ctaHref = site.ctaUrl || waHref || telHref || '#contacto';
  const radiusClass = isPremium ? 'rounded-3xl' : 'rounded-2xl';
  const heroPad = isPremium ? 'py-14 sm:py-20' : 'py-10 sm:py-14';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="text-white" style={headerStyle}>
        <div className={`mx-auto max-w-5xl px-4 ${heroPad}`}>
          {site.logoUrl ? (
            <img
              src={site.logoUrl}
              alt={dealerName}
              className={`mb-5 object-contain ${isPremium ? 'h-16' : 'h-12'} w-auto max-w-[220px] rounded-lg bg-white/10 p-1.5`}
            />
          ) : (
            <p className="text-sm font-medium uppercase tracking-wide text-white/80">{dealerName}</p>
          )}
          <h1 className={`mt-2 font-bold tracking-tight ${isPremium ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}`}>
            {headline}
          </h1>
          {tagline && <p className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg">{tagline}</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            {site.ctaLabel && ctaHref ? (
              <a
                href={ctaHref}
                target={site.ctaUrl?.startsWith('http') ? '_blank' : undefined}
                rel={site.ctaUrl?.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold shadow"
                style={{ color: primary }}
              >
                {site.ctaLabel}
              </a>
            ) : null}
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow"
              >
                WhatsApp
              </a>
            )}
            {telHref && (
              <a
                href={telHref}
                className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/40 backdrop-blur"
              >
                Llamar
              </a>
            )}
            <Link
              href={`/${encodeURIComponent(tenantId)}/vender`}
              className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow"
            >
              Vender tu auto
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-10">
        {site.aboutHtml ? (
          <section className={`${radiusClass} border border-slate-200 bg-white p-6 shadow-sm`}>
            <h2 className="text-xl font-bold">Sobre nosotros</h2>
            {looksLikeHtml(site.aboutHtml) ? (
              <div
                className="mt-3 prose prose-sm max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: site.aboutHtml }}
              />
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{site.aboutHtml}</p>
            )}
          </section>
        ) : null}

        {services.length > 0 ? (
          <section>
            <h2 className="text-xl font-bold mb-4">Servicios</h2>
            <ul className="flex flex-wrap gap-2">
              {services.map((svc) => (
                <li
                  key={svc}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-white"
                  style={{ backgroundColor: primary }}
                >
                  {svc}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Inventario</h2>
              <p className="text-sm text-slate-600">
                {vehicles.length} vehículo{vehicles.length === 1 ? '' : 's'} disponibles
              </p>
            </div>
          </div>

          {vehicles.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
              No hay vehículos publicados por el momento.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((v) => {
                const photo = getFirstPhoto(v);
                const label = `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim() || 'Vehículo';
                return (
                  <Link
                    key={v.id}
                    href={`/share/${encodeURIComponent(tenantId)}/${encodeURIComponent(v.id)}`}
                    className={`group overflow-hidden border border-slate-200 bg-white shadow-sm transition hover:shadow-md ${radiusClass}`}
                  >
                    <div className="aspect-[4/3] bg-slate-100">
                      {photo ? (
                        <VehicleImageFrame
                          src={photo}
                          alt={label}
                          className="h-full w-full"
                          onError={handleImageError}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                          Sin foto
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-4">
                      <h3 className="font-semibold leading-snug group-hover:underline">{label}</h3>
                      <p className="font-medium" style={{ color: primary }}>
                        {formatPrice(v.price, v.currency)}
                      </p>
                      {v.mileage != null && (
                        <p className="text-xs text-slate-500">
                          {Number(v.mileage).toLocaleString('es-PR')} mi
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {showExtras && (site.mapUrl || site.hours) && (
          <section className="grid gap-4 md:grid-cols-2">
            {site.hours && (
              <div className={`${radiusClass} border border-slate-200 bg-white p-5 shadow-sm`}>
                <h2 className="text-lg font-semibold">Horario</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{site.hours}</p>
              </div>
            )}
            {site.mapUrl && (
              <div className={`${radiusClass} border border-slate-200 bg-white p-5 shadow-sm`}>
                <h2 className="text-lg font-semibold">Ubicación</h2>
                <a
                  href={site.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-sm font-medium underline underline-offset-2"
                  style={{ color: primary }}
                >
                  Ver en el mapa
                </a>
                {site.address && (
                  <p className="mt-2 text-sm text-slate-600">{site.address}</p>
                )}
              </div>
            )}
          </section>
        )}

        {showExtras && (site.showFinancing || site.showJobs) && (
          <section className="grid gap-4 md:grid-cols-2">
            {site.showFinancing && (
              <div className={`${radiusClass} border border-slate-200 bg-white p-5 shadow-sm`}>
                <h2 className="text-lg font-semibold">Financiamiento</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Pregunta por opciones de financiamiento y preaprobación. Te ayudamos a encontrar
                  un plan que se ajuste a tu presupuesto.
                </p>
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: primary }}
                  >
                    Consultar financiamiento
                  </a>
                )}
              </div>
            )}
            {site.showJobs && (
              <div className={`${radiusClass} border border-slate-200 bg-white p-5 shadow-sm`}>
                <h2 className="text-lg font-semibold">Empleo</h2>
                <p className="mt-2 text-sm text-slate-600">
                  ¿Quieres unirte a nuestro equipo? Contáctanos y cuéntanos tu experiencia.
                </p>
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: primary }}
                  >
                    Enviar interés
                  </a>
                )}
              </div>
            )}
          </section>
        )}

        <section
          id="contacto"
          className={`${radiusClass} border border-slate-200 bg-white p-6 shadow-sm`}
        >
          <h2 className="text-xl font-bold">Contacto</h2>
          <p className="mt-1 text-sm text-slate-600">
            Habla directamente con {dealerName}.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {phone && <li>Teléfono: {phone}</li>}
            {whatsapp && whatsapp !== phone && <li>WhatsApp: {whatsapp}</li>}
            {site.email && <li>Correo: {site.email}</li>}
            {site.address && <li>Dirección: {site.address}</li>}
            {!showExtras && site.hours && <li>Horario: {site.hours}</li>}
          </ul>
          {(site.facebookUrl || site.instagramUrl || site.youtubeUrl) && (
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
              {site.facebookUrl ? (
                <a href={site.facebookUrl} target="_blank" rel="noopener noreferrer" style={{ color: primary }}>
                  Facebook
                </a>
              ) : null}
              {site.instagramUrl ? (
                <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer" style={{ color: primary }}>
                  Instagram
                </a>
              ) : null}
              {site.youtubeUrl ? (
                <a href={site.youtubeUrl} target="_blank" rel="noopener noreferrer" style={{ color: primary }}>
                  YouTube
                </a>
              ) : null}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                WhatsApp
              </a>
            )}
            {telHref && (
              <a
                href={telHref}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                Llamar
              </a>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        {dealerName} · Sitio público
      </footer>
    </div>
  );
}
