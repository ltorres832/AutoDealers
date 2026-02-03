'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRealtimeReviews } from '@/hooks/useRealtimeReviews';

interface GlobalStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
}

export default function AdminReviewsPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  
  const { reviews, loading } = useRealtimeReviews({
    status: filter,
    tenantId: selectedTenant !== 'all' ? selectedTenant : undefined,
  });

  // Calcular estadísticas globales en tiempo real
  const globalStats = useMemo<GlobalStats>(() => {
    const stats = {
      total: reviews.length,
      approved: reviews.filter((r) => r.status === 'approved').length,
      pending: reviews.filter((r) => r.status === 'pending').length,
      rejected: reviews.filter((r) => r.status === 'rejected').length,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as { [key: number]: number },
    };

    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      stats.averageRating = totalRating / reviews.length;

      reviews.forEach((review) => {
        stats.ratingDistribution[review.rating] =
          (stats.ratingDistribution[review.rating] || 0) + 1;
      });
    }

    return stats;
  }, [reviews]);

  function renderStars(rating: number) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}>
            ★
          </span>
        ))}
      </div>
    );
  }

  function getStatusBadge(status: string) {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reseñas - Todos los Tenants</h1>
          <p className="text-gray-600">Gestiona las reseñas de todos los concesionarios y vendedores</p>
        </div>
        <Link
          href="/admin/reviews/create"
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Crear Reseña
        </Link>
      </div>

      {/* Estadísticas Globales */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Total</div>
            <div className="text-2xl font-bold text-gray-900">{globalStats.total}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Aprobadas</div>
            <div className="text-2xl font-bold text-green-600">{globalStats.approved}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Pendientes</div>
            <div className="text-2xl font-bold text-yellow-600">{globalStats.pending}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Rechazadas</div>
            <div className="text-2xl font-bold text-red-600">{globalStats.rejected}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Rating Promedio</div>
            <div className="text-2xl font-bold text-primary-600">
              {globalStats.averageRating.toFixed(1)} ⭐
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobadas' : 'Rechazadas'}
            </button>
          ))}
        </div>
        <div>
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Todos los Tenants</option>
            {/* Aquí se podrían cargar los tenants disponibles */}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando reseñas...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">⭐</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay reseñas</h3>
          <p className="text-gray-600">No se encontraron reseñas con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{review.customerName}</h3>
                    {review.featured && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                        ⭐ Destacada
                      </span>
                    )}
                    {getStatusBadge(review.status)}
                    {review.tenantName && (
                      <Link
                        href={`/admin/tenants/${review.tenantId}`}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded hover:bg-blue-200"
                      >
                        {review.tenantName}
                        {review.tenantCompanyName && ` (${review.tenantCompanyName})`}
                      </Link>
                    )}
                  </div>
                  {review.title && (
                    <h4 className="text-md font-medium text-gray-700 mb-2">{review.title}</h4>
                  )}
                  <div className="mb-2">{renderStars(review.rating)}</div>
                  <p className="text-gray-700 mb-2">{review.comment}</p>
                  {review.customerEmail && (
                    <p className="text-sm text-gray-500">Email: {review.customerEmail}</p>
                  )}
                  {review.customerPhone && (
                    <p className="text-sm text-gray-500">Teléfono: {review.customerPhone}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(review.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {review.response && (
                <div className="mt-4 pt-4 border-t border-gray-200 bg-blue-50 rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-blue-900">Respuesta del concesionario:</div>
                    <div className="text-xs text-blue-600">
                      {new Date(review.response.respondedAt).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <p className="text-blue-800">{review.response.text}</p>
                  <p className="text-xs text-blue-600 mt-2">Por: {review.response.respondedBy}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

