'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StarRating from '@/components/StarRating';

interface Promotion {
  id: string;
  tenantId: string;
  tenantName?: string;
  name: string;
  description: string;
  type: string;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  status: string;
  startDate: string;
  endDate?: string;
  isPaid?: boolean;
  priority?: number;
  priorityScore?: number;
  price?: number;
  duration?: number;
  promotionScope?: 'vehicle' | 'dealer' | 'seller';
  views?: number;
  clicks?: number;
  expiresAt?: string;
  // Métricas de redes sociales
  socialMetrics?: {
    facebook?: {
      views?: number;
      clicks?: number;
      likes?: number;
      shares?: number;
      comments?: number;
      engagement?: number;
    };
    instagram?: {
      views?: number;
      clicks?: number;
      likes?: number;
      shares?: number;
      comments?: number;
      engagement?: number;
    };
  };
  // IDs de posts en redes sociales
  socialPostIds?: {
    facebook?: string;
    instagram?: string;
  };
  // Calificaciones
  sellerRating?: number;
  sellerRatingCount?: number;
  dealerRating?: number;
  dealerRatingCount?: number;
}

export default function AdminAllPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPromotions();
  }, []);

  async function fetchPromotions() {
    try {
      const response = await fetch('/api/admin/all-promotions');
      const data = await response.json();
      // Ordenar promociones pagadas por prioridad
      const promotions = data.promotions || [];
      promotions.sort((a: Promotion, b: Promotion) => {
        if (a.isPaid && b.isPaid) {
          return (b.priority || 0) - (a.priority || 0); // Mayor prioridad primero
        }
        return 0;
      });
      setPromotions(promotions);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function recalculatePriorities() {
    if (!confirm('¿Recalcular prioridades de todas las promociones pagadas activas?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/promotions/recalculate-priority', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}`);
        fetchPromotions();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al recalcular prioridades'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function updatePriority(promotionId: string, tenantId: string, newPriority: number) {
    try {
      const response = await fetch(`/api/admin/promotions/${promotionId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, priority: newPriority }),
      });

      if (response.ok) {
        alert('✅ Prioridad actualizada');
        fetchPromotions();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al actualizar prioridad'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Todas las Promociones</h1>
          <p className="text-gray-600 mt-2">
            Vista de todas las promociones de todos los tenants
          </p>
        </div>
        <div className="flex gap-2">
          {promotions.filter(p => p.isPaid && p.status === 'active').length > 0 && (
            <button
              onClick={recalculatePriorities}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 font-medium text-sm"
            >
              🔄 Recalcular Prioridades
            </button>
          )}
          <Link
            href="/admin/promotions/assign"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            ➕ Asignar Promoción
          </Link>
          <Link
            href="/admin/promotions/create"
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            + Crear Promoción
          </Link>
        </div>
      </div>

      {/* Progreso y Estadísticas de Todas las Promociones - SECCIÓN PRINCIPAL */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-2 border-blue-200">
        <div className="flex items-center gap-3">
          <div className="text-4xl">📊</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Progreso y Estadísticas de Promociones</h2>
            <p className="text-gray-600 text-sm mt-1">
              Visualiza el rendimiento completo de todas las promociones, incluyendo métricas de landing page, Facebook e Instagram
            </p>
          </div>
        </div>
      </div>
      
      <PromotionProgressSection promotions={promotions} />
      
      {promotions.length > 0 && (
        <div className="mt-8 mb-6">
          <h2 className="text-2xl font-bold mb-4">📋 Lista de Promociones</h2>
        </div>
      )}

      {promotions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No hay promociones registradas</p>
          <p className="text-gray-400 text-sm mt-2">Las promociones aparecerán aquí cuando se creen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map((promotion) => (
          <div key={promotion.id} className={`bg-white rounded-lg shadow p-6 ${
            promotion.isPaid ? 'border-2 border-yellow-300' : ''
          }`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{promotion.name}</h3>
                <p className="text-sm text-gray-600">{promotion.tenantName || promotion.tenantId}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`px-3 py-1 rounded text-xs ${
                    promotion.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {promotion.status}
                </span>
                {promotion.isPaid && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                    ⭐ Pagada
                  </span>
                )}
              </div>
            </div>

            {promotion.isPaid && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-600">Prioridad:</span>
                  <span className="font-bold text-yellow-700">{promotion.priority || 0}</span>
                </div>
                {promotion.priorityScore && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-600">Score:</span>
                    <span className="text-sm text-gray-700">{promotion.priorityScore.toFixed(1)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Precio: ${promotion.price?.toFixed(2) || '0'}</span>
                  <span>Duración: {promotion.duration || 0} días</span>
                </div>
                <div className="mt-2">
                  <label className="text-xs text-gray-600 block mb-1">Ajustar Prioridad:</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      defaultValue={promotion.priority || 0}
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      onBlur={(e) => {
                        const newPriority = parseInt(e.target.value);
                        if (newPriority && newPriority !== promotion.priority) {
                          updatePriority(promotion.id, promotion.tenantId, newPriority);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <p className="text-gray-600 text-sm mb-4">{promotion.description}</p>

            {/* Calificaciones */}
            {((promotion.sellerRating && promotion.sellerRating > 0) || (promotion.dealerRating && promotion.dealerRating > 0)) && (
              <div className="mb-4">
                <StarRating
                  rating={promotion.sellerRating || promotion.dealerRating || 0}
                  count={promotion.sellerRatingCount || promotion.dealerRatingCount || 0}
                  size="sm"
                  showCount={true}
                />
              </div>
            )}

            {promotion.discount && (
              <div className="bg-primary-50 p-3 rounded mb-4">
                <p className="text-sm text-gray-600">Descuento</p>
                <p className="text-2xl font-bold text-primary-600">
                  {promotion.discount.type === 'percentage'
                    ? `${promotion.discount.value}%`
                    : `$${promotion.discount.value}`}
                </p>
              </div>
            )}

            <div className="text-xs text-gray-500">
              <p>Inicio: {new Date(promotion.startDate).toLocaleDateString()}</p>
              {promotion.endDate && (
                <p>Fin: {new Date(promotion.endDate).toLocaleDateString()}</p>
              )}
            </div>
          </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sección de Progreso y Estadísticas de Promociones
function PromotionProgressSection({ promotions }: { promotions: Promotion[] }) {
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'active' | 'expired'>('all');

  const filteredPromotions = promotions.filter((p) => {
    if (filter === 'paid') return p.isPaid;
    if (filter === 'unpaid') return !p.isPaid;
    if (filter === 'active') return p.status === 'active';
    if (filter === 'expired') return p.status === 'expired';
    return true;
  });

  function calculateTotalMetrics(promotion: Promotion) {
    const totalViews = (promotion.views || 0) + 
      (promotion.socialMetrics?.facebook?.views || 0) + 
      (promotion.socialMetrics?.instagram?.views || 0);
    
    const totalClicks = (promotion.clicks || 0) + 
      (promotion.socialMetrics?.facebook?.clicks || 0) + 
      (promotion.socialMetrics?.instagram?.clicks || 0);
    
    const totalLikes = (promotion.socialMetrics?.facebook?.likes || 0) + 
      (promotion.socialMetrics?.instagram?.likes || 0);
    
    const totalShares = (promotion.socialMetrics?.facebook?.shares || 0) + 
      (promotion.socialMetrics?.instagram?.shares || 0);
    
    const totalComments = (promotion.socialMetrics?.facebook?.comments || 0) + 
      (promotion.socialMetrics?.instagram?.comments || 0);

    return {
      totalViews,
      totalClicks,
      totalLikes,
      totalShares,
      totalComments,
      conversionRate: totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00',
    };
  }

  return (
    <div className="mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">📊 Progreso y Estadísticas de Promociones</h2>
            <p className="text-gray-600 mt-1">
              Visualiza el rendimiento de todas las promociones de todos los tenants, incluyendo métricas de redes sociales
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border rounded px-3 py-2"
            >
              <option value="all">Todas</option>
              <option value="paid">Pagadas</option>
              <option value="unpaid">No Pagadas</option>
              <option value="active">Activas</option>
              <option value="expired">Expiradas</option>
            </select>
          </div>
        </div>

        {filteredPromotions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay promociones para mostrar con este filtro
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPromotions.map((promotion) => {
              const metrics = calculateTotalMetrics(promotion);
              const hasSocialMetrics = promotion.socialMetrics?.facebook || promotion.socialMetrics?.instagram;

              return (
                <div
                  key={promotion.id}
                  className="border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold">{promotion.name}</h3>
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                          {promotion.tenantName || promotion.tenantId}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          promotion.isPaid 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {promotion.isPaid ? '💰 Pagada' : '🆓 Gratis'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          promotion.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : promotion.status === 'expired'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {promotion.status === 'active' ? '✅ Activa' : 
                           promotion.status === 'expired' ? '❌ Expirada' : 
                           promotion.status}
                        </span>
                        {promotion.promotionScope && (
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            {promotion.promotionScope === 'vehicle' ? '🚗 Vehículo' : 
                             promotion.promotionScope === 'dealer' ? '🏢 Dealer' : 
                             '👤 Vendedor'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{promotion.description}</p>
                      {/* Calificaciones */}
                      {((promotion.sellerRating && promotion.sellerRating > 0) || (promotion.dealerRating && promotion.dealerRating > 0)) && (
                        <div className="mb-2">
                          <StarRating
                            rating={promotion.sellerRating || promotion.dealerRating || 0}
                            count={promotion.sellerRatingCount || promotion.dealerRatingCount || 0}
                            size="sm"
                            showCount={true}
                          />
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {promotion.startDate && (
                          <span>Inicio: {new Date(promotion.startDate).toLocaleDateString()}</span>
                        )}
                        {promotion.endDate && (
                          <span className="ml-4">Fin: {new Date(promotion.endDate).toLocaleDateString()}</span>
                        )}
                        {promotion.expiresAt && (
                          <span className="ml-4">Expira: {new Date(promotion.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPromotion(selectedPromotion?.id === promotion.id ? null : promotion)}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      {selectedPromotion?.id === promotion.id ? 'Ocultar' : 'Ver Detalles'}
                    </button>
                  </div>

                  {/* Métricas Principales */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-3">
                    <div className="bg-blue-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">👁️ Vistas Totales</div>
                      <div className="text-xl font-bold text-blue-600">{metrics.totalViews}</div>
                    </div>
                    <div className="bg-purple-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">🖱️ Clics Totales</div>
                      <div className="text-xl font-bold text-purple-600">{metrics.totalClicks}</div>
                    </div>
                    <div className="bg-green-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">❤️ Likes</div>
                      <div className="text-xl font-bold text-green-600">{metrics.totalLikes}</div>
                    </div>
                    <div className="bg-yellow-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">📤 Compartidos</div>
                      <div className="text-xl font-bold text-yellow-600">{metrics.totalShares}</div>
                    </div>
                    <div className="bg-pink-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">💬 Comentarios</div>
                      <div className="text-xl font-bold text-pink-600">{metrics.totalComments}</div>
                    </div>
                    <div className="bg-indigo-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">📈 Conversión</div>
                      <div className="text-xl font-bold text-indigo-600">{metrics.conversionRate}%</div>
                    </div>
                  </div>

                  {/* Detalles Expandidos */}
                  {selectedPromotion?.id === promotion.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Métricas de Landing Page */}
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">🌐 Landing Page</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Vistas:</span>
                            <span className="ml-2 font-bold">{promotion.views || 0}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Clics:</span>
                            <span className="ml-2 font-bold">{promotion.clicks || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Métricas de Facebook */}
                      {promotion.socialMetrics?.facebook && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                            <span>📘 Facebook</span>
                            {promotion.socialPostIds?.facebook && (
                              <a
                                href={`https://facebook.com/posts/${promotion.socialPostIds.facebook}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs"
                              >
                                Ver Post
                              </a>
                            )}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm bg-blue-50 p-3 rounded">
                            <div>
                              <span className="text-gray-600">Vistas:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.facebook.views || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Clics:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.facebook.clicks || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Likes:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.facebook.likes || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Compartidos:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.facebook.shares || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Comentarios:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.facebook.comments || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Métricas de Instagram */}
                      {promotion.socialMetrics?.instagram && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                            <span>📷 Instagram</span>
                            {promotion.socialPostIds?.instagram && (
                              <a
                                href={`https://instagram.com/p/${promotion.socialPostIds.instagram}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-pink-600 hover:underline text-xs"
                              >
                                Ver Post
                              </a>
                            )}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm bg-pink-50 p-3 rounded">
                            <div>
                              <span className="text-gray-600">Vistas:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.instagram.views || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Clics:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.instagram.clicks || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Likes:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.instagram.likes || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Compartidos:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.instagram.shares || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Comentarios:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.instagram.comments || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {!hasSocialMetrics && (
                        <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded">
                          ℹ️ Esta promoción no tiene métricas de redes sociales aún
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

