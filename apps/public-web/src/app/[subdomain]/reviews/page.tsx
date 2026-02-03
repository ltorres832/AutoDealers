'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Review {
  id: string;
  customerName: string;
  rating: number;
  title?: string;
  comment: string;
  photos?: string[];
  videos?: string[];
  featured: boolean;
  response?: {
    text: string;
    respondedBy: string;
    respondedAt: string;
  };
  createdAt: string;
}

export default function PublicReviewsPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [subdomain]);

  async function fetchReviews() {
    try {
      setLoading(true);
      const response = await fetch(`/api/reviews/${subdomain}`);
      if (response.ok) {
        const data = await response.json();
        const approvedReviews = (data.reviews || []).filter((r: any) => r.status === 'approved');
        setReviews(approvedReviews);
        setTotalReviews(approvedReviews.length);
        
        if (approvedReviews.length > 0) {
          const avg = approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / approvedReviews.length;
          setAverageRating(avg);
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderStars(rating: number) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'text-yellow-400 text-lg' : 'text-gray-300 text-lg'}>
            ★
          </span>
        ))}
      </div>
    );
  }

  // Ordenar: destacadas primero, luego por fecha
  const sortedReviews = [...reviews].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/${subdomain}`} className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
                ← Volver al inicio
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Reseñas de Clientes</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      {!loading && averageRating > 0 && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary-600 mb-2">{averageRating.toFixed(1)}</div>
                <div className="mb-2">{renderStars(Math.round(averageRating))}</div>
                <div className="text-gray-600">Basado en {totalReviews} reseñas</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Cargando reseñas...</p>
          </div>
        ) : sortedReviews.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">⭐</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aún no hay reseñas</h3>
            <p className="text-gray-600">Las reseñas de nuestros clientes aparecerán aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedReviews.map((review) => (
              <div
                key={review.id}
                className={`bg-white rounded-lg shadow p-6 ${
                  review.featured ? 'border-2 border-yellow-400' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-gray-900">{review.customerName}</div>
                  {review.featured && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      ⭐ Destacada
                    </span>
                  )}
                </div>
                {review.title && (
                  <h4 className="font-medium text-gray-800 mb-2">{review.title}</h4>
                )}
                <div className="mb-3">{renderStars(review.rating)}</div>
                <p className="text-gray-700 mb-3">{review.comment}</p>
                
                {/* Fotos */}
                {review.photos && review.photos.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {review.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Foto ${index + 1}`}
                          className="w-32 h-32 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Videos */}
                {review.videos && review.videos.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {review.videos.map((video, index) => (
                        <video
                          key={index}
                          src={video}
                          className="w-full max-w-md h-48 object-cover rounded"
                          controls
                        />
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-400 mb-4">
                  {new Date(review.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {review.response && (
                  <div className="mt-4 pt-4 border-t border-gray-200 bg-blue-50 rounded p-3">
                    <p className="text-xs text-blue-600 mb-1 font-medium">Respuesta del concesionario:</p>
                    <p className="text-sm text-blue-800">{review.response.text}</p>
                    <p className="text-xs text-blue-600 mt-2">
                      Por {review.response.respondedBy} el{' '}
                      {new Date(review.response.respondedAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

