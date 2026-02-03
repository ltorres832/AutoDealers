'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface RatingData {
  id: string;
  tenantId: string;
  saleId: string;
  vehicleId: string;
  sellerId: string;
  dealerId?: string;
  customerEmail: string;
  customerName: string;
  status: 'pending' | 'completed' | 'expired';
  expiresAt: string;
}

export default function SurveyPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [rating, setRating] = useState<RatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [sellerRating, setSellerRating] = useState(0);
  const [dealerRating, setDealerRating] = useState(0);
  const [sellerComment, setSellerComment] = useState('');
  const [dealerComment, setDealerComment] = useState('');

  useEffect(() => {
    if (token) {
      fetchRating();
    }
  }, [token]);

  async function fetchRating() {
    try {
      const response = await fetch(`/api/public/survey/${token}`);
      if (response.ok) {
        const data = await response.json();
        setRating(data.rating);
        
        // Si ya está completada, mostrar mensaje
        if (data.rating?.status === 'completed') {
          setSubmitted(true);
        }
      } else {
        alert('Encuesta no encontrada o expirada');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar la encuesta');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (sellerRating === 0) {
      alert('Por favor califica al vendedor');
      return;
    }

    if (rating?.dealerId && dealerRating === 0) {
      alert('Por favor califica al dealer');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/survey/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerRating,
          dealerRating: rating?.dealerId ? dealerRating : undefined,
          sellerComment: sellerComment || undefined,
          dealerComment: rating?.dealerId && dealerComment ? dealerComment : undefined,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const error = await response.json();
        alert(error.error || 'Error al enviar la encuesta');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al enviar la encuesta');
    } finally {
      setSubmitting(false);
    }
  }

  function StarRating({ 
    rating, 
    onRatingChange, 
    label 
  }: { 
    rating: number; 
    onRatingChange: (rating: number) => void;
    label: string;
  }) {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">{label}</label>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(star)}
              className={`text-4xl transition-transform hover:scale-110 ${
                star <= rating ? 'text-yellow-400' : 'text-gray-300'
              }`}
            >
              ★
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-sm text-gray-600 mt-2">
            {rating === 1 && 'Muy malo'}
            {rating === 2 && 'Malo'}
            {rating === 3 && 'Regular'}
            {rating === 4 && 'Bueno'}
            {rating === 5 && 'Excelente'}
          </p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!rating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Encuesta no encontrada</h1>
          <p className="text-gray-600">
            Esta encuesta no existe o ha expirado.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-4">¡Gracias por tu opinión!</h1>
          <p className="text-gray-600">
            Tu calificación ha sido registrada exitosamente. Tu opinión nos ayuda a mejorar nuestro servicio.
          </p>
        </div>
      </div>
    );
  }

  if (rating.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Encuesta Expirada</h1>
          <p className="text-gray-600">
            Esta encuesta ha expirado. Si deseas calificar tu experiencia, por favor contacta directamente con el vendedor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Califica tu Experiencia</h1>
          <p className="text-gray-600">
            Hola {rating.customerName}, tu opinión es muy importante para nosotros.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Por favor, califica tu experiencia con nuestro servicio
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Calificación del Vendedor */}
          <div className="mb-8 pb-8 border-b">
            <StarRating
              rating={sellerRating}
              onRatingChange={setSellerRating}
              label="Calificación del Vendedor"
            />
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Comentarios sobre el vendedor (opcional)
              </label>
              <textarea
                value={sellerComment}
                onChange={(e) => setSellerComment(e.target.value)}
                rows={3}
                className="w-full border rounded px-3 py-2"
                placeholder="Comparte tu experiencia con el vendedor..."
              />
            </div>
          </div>

          {/* Calificación del Dealer (si aplica) */}
          {rating.dealerId && (
            <div className="mb-8 pb-8 border-b">
              <StarRating
                rating={dealerRating}
                onRatingChange={setDealerRating}
                label="Calificación del Dealer"
              />
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">
                  Comentarios sobre el dealer (opcional)
                </label>
                <textarea
                  value={dealerComment}
                  onChange={(e) => setDealerComment(e.target.value)}
                  rows={3}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Comparte tu experiencia con el dealer..."
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-end">
            <button
              type="submit"
              disabled={submitting || sellerRating === 0 || (!!rating.dealerId && dealerRating === 0)}
              className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'Enviando...' : 'Enviar Calificación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


