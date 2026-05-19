'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import StarRating from './StarRating';

export interface PublicReviewItem {
  id: string;
  customerName: string;
  rating: number;
  title?: string;
  comment: string;
  photos?: string[];
  createdAt?: string;
  customerEmail?: string;
  saleId?: string;
  vehicleId?: string;
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

function formatReviewDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ReviewCard({ review }: { review: PublicReviewItem }) {
  return (
    <article className="flex-shrink-0 w-[min(100%,280px)] snap-start bg-white rounded-lg border border-gray-100 shadow-sm p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="font-semibold text-gray-900 truncate text-sm">{review.customerName}</p>
        <StarRating rating={review.rating} size="sm" showCount={false} />
      </div>
      {review.createdAt ? (
        <p className="text-[10px] text-gray-400 mb-1.5">{formatReviewDate(review.createdAt)}</p>
      ) : null}
      {review.title ? (
        <p className="text-xs font-medium text-gray-800 mb-0.5">{review.title}</p>
      ) : null}
      <p className="text-xs text-gray-600 leading-snug line-clamp-3">&ldquo;{review.comment}&rdquo;</p>
    </article>
  );
}

export default function PublicReviewsList({
  reviews,
  title = 'Opiniones de clientes',
  emptyMessage = 'Aún no hay reseñas verificadas de clientes.',
  className = '',
}: PublicReviewsListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const scrollNext = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const card = el.querySelector<HTMLElement>('[data-review-card]');
    const step = card ? card.offsetWidth + 12 : 292;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (paused || reviews.length < 2) return;
    const id = window.setInterval(scrollNext, 4500);
    return () => window.clearInterval(id);
  }, [paused, reviews.length, scrollNext]);

  if (!reviews?.length) {
    return (
      <section className={`bg-white rounded-xl border border-gray-200 p-6 text-center ${className}`}>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className={className}>
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div
        className="relative -mx-1"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2"
          aria-label="Carrusel de reseñas"
        >
          {reviews.map((review) => (
            <div key={review.id} data-review-card>
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
