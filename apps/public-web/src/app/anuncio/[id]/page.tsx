import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getQuickListingById } from '@autodealers/core';

export const dynamic = 'force-dynamic';

function formatPrice(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString('en-US')}`;
  }
}

function mileageLabel(n: number): string {
  const s = n.toLocaleString('es-PR');
  if (n === 1) return `${s} milla`;
  return `${s} millas`;
}

function digitsOnly(s: string): string {
  return s.replace(/\D+/g, '');
}

function conditionEs(c: string): string {
  const key = String(c || '').toLowerCase();
  const m: Record<string, string> = {
    used: 'Usado',
    new: 'Nuevo',
    certified: 'Certificado',
  };
  return m[key] || c;
}

function transmissionEs(t: string | null): string {
  if (!t) return '';
  const key = t.toLowerCase();
  const m: Record<string, string> = { automatic: 'Automática', manual: 'Manual' };
  return m[key] || t;
}

function fuelEs(f: string | null): string {
  if (!f) return '';
  const key = f.toLowerCase();
  const m: Record<string, string> = {
    gasoline: 'Gasolina',
    diesel: 'Diésel',
    hybrid: 'Híbrido',
    electric: 'Eléctrico',
  };
  return m[key] || f;
}

export default async function AnuncioParticularPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 80) notFound();

  const item = await getQuickListingById(id);
  if (!item) notFound();

  const phoneDigits = digitsOnly(item.contactPhone);
  const waHref =
    phoneDigits.length > 0
      ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
          `Hola ${item.contactName}, vi tu anuncio del ${item.year} ${item.make} ${item.model}.`
        )}`
      : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Volver al inicio
        </Link>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-6">
        <header className="mb-6">
          <p className="text-sm text-slate-500 mb-1">Vendedor: {item.contactName}</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            {item.year} {item.make} {item.model}
          </h1>
          <p className="text-2xl font-extrabold text-blue-700 mt-2">{formatPrice(item.price, item.currency)}</p>
        </header>

        {item.photos.length > 0 ? (
          <div className="space-y-4 mb-8">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.photos[0]}
                alt={`${item.make} ${item.model}`}
                className="w-full max-h-[min(70vh,520px)] object-contain bg-slate-100"
              />
            </div>
            {item.photos.length > 1 && (
              <div>
                <h2 className="text-sm font-bold text-slate-700 mb-2">Más fotos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {item.photos.slice(1).map((src, i) => (
                    <div
                      key={`${src}-${i}`}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden aspect-[4/3]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Foto ${i + 2}`} className="w-full h-full object-contain bg-slate-100" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 mb-8">
            Este anuncio no tiene fotos.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-900">Detalles</h2>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {item.mileage != null && (
              <>
                <dt className="text-slate-500">Odómetro</dt>
                <dd className="text-slate-900 font-medium">{mileageLabel(item.mileage)}</dd>
              </>
            )}
            <dt className="text-slate-500">Condición</dt>
            <dd className="text-slate-900 font-medium capitalize">{conditionEs(item.condition)}</dd>
            {item.color && (
              <>
                <dt className="text-slate-500">Color</dt>
                <dd className="text-slate-900 font-medium capitalize">{item.color}</dd>
              </>
            )}
            {item.bodyType && (
              <>
                <dt className="text-slate-500">Carrocería</dt>
                <dd className="text-slate-900 font-medium capitalize">{item.bodyType}</dd>
              </>
            )}
            {item.transmission && (
              <>
                <dt className="text-slate-500">Transmisión</dt>
                <dd className="text-slate-900 font-medium">{transmissionEs(item.transmission)}</dd>
              </>
            )}
            {item.fuelType && (
              <>
                <dt className="text-slate-500">Combustible</dt>
                <dd className="text-slate-900 font-medium">{fuelEs(item.fuelType)}</dd>
              </>
            )}
            {item.city && (
              <>
                <dt className="text-slate-500">Ubicación</dt>
                <dd className="text-slate-900 font-medium">{item.city}</dd>
              </>
            )}
          </dl>

          {item.description && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-700 mb-2">Descripción</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.description}</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            {phoneDigits ? (
              <a
                href={`tel:+${phoneDigits}`}
                className="flex-1 py-3 bg-blue-600 text-white text-center font-bold rounded-xl hover:bg-blue-700"
              >
                Llamar a {item.contactName}
              </a>
            ) : null}
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 bg-emerald-600 text-white text-center font-bold rounded-xl hover:bg-emerald-700"
              >
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
