'use client';

import StarRating from './StarRating';

export interface PublicReviewItem {
  id: string;
  customerName: string;
  rating: number;
  title?: string;
  comment: string;
  photos?: string[];
  createdAt?: string;
  response?: {
    text: string;
    respondedBy?: string;
    respondedAt?: string;
  };
}

interface PublicReviewsListProps {
  reviews: PublicReviewItem[];
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export default function PublicReviewsList({
  reviews,
  title = 'Opiniones de clientes',
  emptyMessage = 'Aún no hay reseñas publicadas.',
  className = '',
}: PublicReviewsListProps) {
  if (!reviews?.length) {
    return (
      <section className={`bg-white rounded-xl border border-gray-200 p-8 text-center ${className}`}>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className={className}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-gray-900">{review.customerName}</p>
                {review.createdAt ? (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(review.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                ) : null}
              </div>
              <StarRating rating={review.rating} size="sm" showCount={false} />
            </div>
            {review.title ? (
              <p className="text-sm font-medium text-gray-800 mb-1">{review.title}</p>
            ) : null}
            <p className="text-gray-600 text-sm leading-relaxed">&ldquo;{review.comment}&rdquo;</p>
            {review.photos && review.photos.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {review.photos.slice(0, 4).map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg border border-gray-100"
                  />
                ))}
              </div>
            ) : null}
            {review.response?.text ? (
              <div className="mt-4 pt-3 border-t border-gray-100 bg-blue-50/80 rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-blue-700 mb-1">Respuesta</p>
                <p className="text-sm text-blue-900">{review.response.text}</p>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
