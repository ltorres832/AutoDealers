/* Página mínima para evitar el error de parser de Next.js al dejar el archivo vacío.
   Muestra los testimonios existentes y permite cargar los valores por defecto. */
'use client';

import { useEffect, useState } from 'react';

type Testimonial = {
  id: string;
  name: string;
  role: string;
  text: string;
  image?: string;
  rating?: number;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadTestimonials();
  }, []);

  async function loadTestimonials() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/testimonials');
      const body = await safeJson(res);
      if (!res.ok) {
        throw new Error(body?.error || `Error ${res.status}`);
      }
      setTestimonials(body?.testimonials ?? []);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar testimonios');
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  }

  async function seedDefaults() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/testimonials/create-default', {
        method: 'POST',
      });
      const body = await safeJson(res);
      if (!res.ok || body?.error) {
        throw new Error(body?.error || `Error ${res.status}`);
      }
      setMessage(body?.message || 'Testimonios creados/actualizados');
      await loadTestimonials();
    } catch (err: any) {
      setError(err?.message || 'No se pudieron crear los testimonios por defecto');
    } finally {
      setLoading(false);
    }
  }

  function renderRating(rating?: number) {
    if (rating == null) return null;

    return (
      <div className="flex items-center gap-1 text-yellow-500">
        {Array.from({ length: 5 }).map((_, idx) => (
          <span key={idx}>{idx < rating ? '★' : '☆'}</span>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Testimonios</h1>
          <p className="text-gray-600">
            Vista rápida para revisar testimonios mientras se construye el módulo completo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={seedDefaults}
            disabled={loading}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            Cargar por defecto
          </button>
          <button
            onClick={loadTestimonials}
            disabled={loading}
            className="bg-white border border-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Refrescar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 text-red-800 px-4 py-3">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded border border-green-200 bg-green-50 text-green-800 px-4 py-3">
          {message}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-700">
          Cargando testimonios...
        </div>
      ) : testimonials.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-700">Sin testimonios aún.</p>
          <p className="text-sm text-gray-500 mt-2">
            Usa "Cargar por defecto" para crear ejemplos rápidos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-gray-900">{t.name}</div>
                <span className="text-2xl">{t.image || '💬'}</span>
              </div>
              <div className="text-sm text-gray-500 mb-2">{t.role}</div>
              {renderRating(t.rating)}
              <p className="text-gray-700 mt-3 whitespace-pre-line">{t.text}</p>
              {t.isActive === false && (
                <span className="inline-block mt-3 px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                  Inactivo
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

