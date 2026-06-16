'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import StarRating from '@/components/StarRating';

export default function EvaluarSatisfaccionPage() {
  const params = useParams();
  const token = String(params?.token || '');

  const [loading, setLoading] = useState(true);
  const [providerName, setProviderName] = useState('');
  const [customerNameHint, setCustomerNameHint] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [used, setUsed] = useState(false);

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    rating: 5,
    title: '',
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/public/review-invite/${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        const j = await r.json().catch(() => ({}));
        if (r.status === 409) {
          setUsed(true);
          return;
        }
        if (!r.ok) {
          setLoadError(j.error || 'Enlace no válido o expirado.');
          return;
        }
        setProviderName(j.providerName || 'Tu vendedor');
        if (j.customerNameHint) {
          setCustomerNameHint(j.customerNameHint);
          setForm((f) => ({ ...f, customerName: j.customerNameHint }));
        }
      } catch {
        setLoadError('No se pudo cargar el formulario.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!form.customerName.trim() || !form.comment.trim()) {
      setSubmitError('Nombre y comentario son obligatorios.');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/public/review-invite/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setSubmitError(j.error || 'No se pudo enviar.');
        return;
      }
      setSuccess(true);
    } catch {
      setSubmitError('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Cargando…</p>
      </div>
    );
  }

  if (used) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Evaluación ya enviada</h1>
          <p className="text-slate-600">Este enlace ya fue utilizado. Gracias por tu tiempo.</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Enlace no disponible</h1>
          <p className="text-slate-600">{loadError}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center text-green-600 text-3xl mb-4">
            ✓
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">¡Gracias por tu evaluación!</h1>
          <p className="text-slate-600">
            Tu opinión fue enviada a <strong>{providerName}</strong> para su revisión. Cuando la apruebe, podrá
            aparecer en la página pública.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm text-slate-500 mb-1">Evaluación de satisfacción</p>
          <h1 className="text-2xl font-extrabold text-slate-900">{providerName}</h1>
          <p className="text-slate-600 mt-2 text-sm">
            Cuéntanos cómo fue tu experiencia. Tu reseña será revisada antes de publicarse.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tu nombre <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5"
              placeholder="Ej: Juan Del Pueblo"
            />
            {customerNameHint ? (
              <p className="text-xs text-slate-400 mt-1">Sugerido por tu vendedor</p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Calificación <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <StarRating rating={form.rating} size="md" showCount={false} />
              <select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} estrella{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título (opcional)</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5"
              placeholder="Ej: Excelente servicio y orientación"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Comentario <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 h-28"
              placeholder="Describe tu experiencia…"
            />
          </div>

          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enviando…' : 'Enviar evaluación'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          <Link href="/" className="hover:text-primary-600">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
