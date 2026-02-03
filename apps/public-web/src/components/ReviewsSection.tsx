'use client';

import StarRating from './StarRating';
import { useRealtimeReviews } from '../hooks/useRealtimeReviews';

export default function ReviewsSection() {
  const { reviews, loading } = useRealtimeReviews(6);

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    // Mostrar placeholder si no hay reseñas
    return (
      <section className="py-16 bg-gradient-to-br from-gray-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-4">
              <span className="text-purple-600 font-semibold text-sm">⭐ RESEÑAS</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Lo Que Dicen Nuestros Clientes
            </h2>
            <p className="text-xl text-gray-600">
              Experiencias reales de compradores satisfechos
            </p>
          </div>
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-2">Aún no hay reseñas disponibles</p>
            <p className="text-sm text-gray-500">Las reseñas de nuestros clientes aparecerán aquí cuando estén disponibles</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-4">
            <span className="text-purple-600 font-semibold text-sm">⭐ RESEÑAS</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Lo Que Dicen Nuestros Clientes
          </h2>
          <p className="text-xl text-gray-600">
            Experiencias reales de compradores satisfechos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all p-6 border border-gray-100"
            >
              {/* Header del Review */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {review.customerPhoto ? (
                    <img
                      src={review.customerPhoto}
                      alt={review.customerName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    review.customerName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-900 truncate">
                      {review.customerName}
                    </h4>
                    {review.verified && (
                      <span className="text-blue-500" title="Verificado">
                        ✓
                      </span>
                    )}
                  </div>
                  <StarRating rating={review.rating} size="sm" showCount={false} />
                  {review.vehicleName && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {review.vehicleName}
                    </p>
                  )}
                </div>
              </div>

              {/* Comentario */}
              <p className="text-gray-700 mb-4 line-clamp-4">
                "{review.comment}"
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                <span>
                  {review.dealerName && `Dealer: ${review.dealerName}`}
                  {review.sellerName && `Vendedor: ${review.sellerName}`}
                </span>
                <span>
                  {new Date(review.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 space-x-4">
          <a
            href="/reviews"
            className="inline-block bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            Ver Todas las Reseñas →
          </a>
          <a
            href="/review/submit"
            className="inline-block bg-white border-2 border-purple-600 text-purple-600 px-8 py-3 rounded-lg hover:bg-purple-50 font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            Dejar una Reseña
          </a>
        </div>
      </div>
    </section>
  );
}

