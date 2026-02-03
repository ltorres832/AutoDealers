'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StarRating from '../../../../components/StarRating';

interface RatingData {
  id: string;
  tenantId: string;
  saleId: string;
  vehicleId: string;
  sellerId: string;
  dealerId?: string;
  customerName: string;
  customerEmail: string;
  status: 'pending' | 'completed' | 'expired';
  expiresAt: Date;
}

export default function RatingPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [ratingData, setRatingData] = useState<RatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    sellerRating: 5,
    dealerRating: 5,
    sellerComment: '',
    dealerComment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchRatingData();
  }, [token]);

  async function fetchRatingData() {
    try {
      const response = await fetch(`/api/public/ratings/${token}`);
      if (response.ok) {
        const data = await response.json();
        setRatingData(data.rating);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar la encuesta');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar la encuesta');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/public/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          customerName: ratingData?.customerName,
          customerEmail: ratingData?.customerEmail,
          rating: formData.sellerRating,
          comment: formData.sellerComment,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Error al enviar la calificación');
      }
    } catch (err: any) {
      setError(err.message || 'Error al enviar la calificación');
    } finally {
      setSubmitting(false);
    }
  }

  function renderStars(rating: number, onChange: (rating: number) => void) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-4xl transition-transform hover:scale-110 ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando encuesta...</p>
        </div>
      </div>
    );
  }

  if (error && !ratingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias por tu Calificación!</h1>
          <p className="text-gray-600 mb-6">
            Tu opinión es muy valiosa para nosotros. Tu reseña será revisada y publicada pronto.
          </p>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  if (ratingData?.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ya Completaste esta Encuesta</h1>
          <p className="text-gray-600 mb-6">
            Gracias por tu participación. Ya has enviado tu calificación anteriormente.
          </p>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Califica tu Experiencia</h1>
            <p className="text-gray-600">
              Hola {ratingData?.customerName}, queremos conocer tu opinión sobre tu compra reciente.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Calificación del Vendedor */}
            <div className="border-t pt-6">
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                ¿Cómo calificarías al vendedor? *
              </label>
              {renderStars(formData.sellerRating, (rating) =>
                setFormData({ ...formData, sellerRating: rating })
              )}
              <p className="text-sm text-gray-500 mt-2">
                Seleccionaste {formData.sellerRating} de 5 estrellas
              </p>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentario sobre el vendedor (Opcional)
                </label>
                <textarea
                  value={formData.sellerComment}
                  onChange={(e) => setFormData({ ...formData, sellerComment: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Comparte tu experiencia con el vendedor..."
                />
              </div>
            </div>

            {/* Calificación del Dealer (si aplica) */}
            {ratingData?.dealerId && (
              <div className="border-t pt-6">
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  ¿Cómo calificarías al concesionario? *
                </label>
                {renderStars(formData.dealerRating, (rating) =>
                  setFormData({ ...formData, dealerRating: rating })
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Seleccionaste {formData.dealerRating} de 5 estrellas
                </p>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentario sobre el concesionario (Opcional)
                  </label>
                  <textarea
                    value={formData.dealerComment}
                    onChange={(e) => setFormData({ ...formData, dealerComment: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Comparte tu experiencia con el concesionario..."
                  />
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-4 pt-4 border-t">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Enviando...' : 'Enviar Calificación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

