'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRealtimeSponsoredContent } from '@/hooks/useRealtimeSponsoredContent';
import CreateSponsoredContentModal from './CreateSponsoredContentModal';
import { StripePaymentForm } from '@autodealers/shared';

export default function AdminSponsoredContentPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'active' | 'rejected'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const { content, loading } = useRealtimeSponsoredContent({
    status: filter === 'all' ? undefined : filter,
  });

  function getStatusBadge(status: string) {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      paused: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      active: 'Activa',
      paused: 'Pausada',
      expired: 'Expirada',
      rejected: 'Rechazada',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  }

  async function updateAdStatus(
    advertiserId: string,
    adId: string,
    status: 'approved' | 'suspended' | 'pending' | 'payment_pending' | 'active'
  ) {
    setActionError('');
    setActionLoading(adId);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('authToken') ||
            document.cookie
              .split(';')
              .find((c) => c.trim().startsWith('authToken='))
              ?.split('=')[1] ||
            ''
          : '';

      const res = await fetch(`/api/admin/advertisers/${advertiserId}/ads/${adId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo actualizar el anuncio');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error al actualizar el anuncio');
    } finally {
      setActionLoading(null);
    }
  }

  async function createPaymentSession(advertiserId: string, adId: string) {
    setActionError('');
    setActionLoading(adId);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('authToken') ||
            document.cookie
              .split(';')
              .find((c) => c.trim().startsWith('authToken='))
              ?.split('=')[1] ||
            ''
          : '';

      const res = await fetch(`/api/admin/advertisers/${advertiserId}/ads/${adId}/payment-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo crear la sesión de pago');
      }

      if (data.clientSecret) {
        const ad = content.find(c => c.id === adId);
        setPaymentData({
          clientSecret: data.clientSecret,
          paymentIntentId: data.paymentIntentId,
          advertiserId,
          adId,
          amount: (ad as any)?.price || 0,
          description: `Anuncio: ${(ad as any)?.title || (ad as any)?.campaignName || 'Anuncio'}`,
        });
        setShowPayment(true);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error al crear la sesión de pago');
    } finally {
      setActionLoading(null);
    }
  }

  // Estadísticas en tiempo real
  const stats = useMemo(() => {
    return {
      total: content.length,
      pending: content.filter((c) => c.status === 'pending').length,
      approved: content.filter((c) => c.status === 'approved').length,
      active: content.filter((c) => c.status === 'active').length,
      totalImpressions: content.reduce((sum, c) => sum + c.impressions, 0),
      totalClicks: content.reduce((sum, c) => sum + c.clicks, 0),
    };
  }, [content]);

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contenido Patrocinado</h1>
          <p className="text-gray-600">Gestiona las promociones de empresas externas</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold transition-colors"
        >
          + Crear Contenido
        </button>
      </div>

      {showCreateModal && (
        <CreateSponsoredContentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // El hook se actualizará automáticamente
          }}
        />
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Pendientes</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Aprobadas</div>
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Activas</div>
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Impresiones</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalImpressions.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Clics</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalClicks.toLocaleString()}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'active', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobadas' : f === 'active' ? 'Activas' : 'Rechazadas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando contenido...</p>
        </div>
      ) : content.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📢</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay contenido patrocinado</h3>
          <p className="text-gray-600">No se encontró contenido con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {actionError}
            </div>
          )}
          {content.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    {getStatusBadge(item.status)}
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                      {item.placement}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">{item.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Empresa: {item.advertiserName}</span>
                    <span>•</span>
                    <span>👁️ {item.impressions.toLocaleString()} vistas</span>
                    <span>•</span>
                    <span>👆 {item.clicks.toLocaleString()} clics</span>
                    <span>•</span>
                    <span>CTR: {item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(2) : 0}%</span>
                  </div>
                </div>
              </div>

              {item.imageUrl && (
                <div className="mb-4">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full max-w-md h-48 object-cover rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="flex gap-2 mt-4">
                {item.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateAdStatus(item.advertiserId, item.id, 'approved')}
                      disabled={actionLoading === item.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => updateAdStatus(item.advertiserId, item.id, 'suspended')}
                      disabled={actionLoading === item.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                    >
                      Suspender
                    </button>
                  </>
                )}
                {item.status === 'payment_pending' && (
                  <button
                    onClick={() => createPaymentSession(item.advertiserId, item.id)}
                    disabled={actionLoading === item.id}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50"
                  >
                    Generar link de pago
                  </button>
                )}
                {item.status === 'approved' && (
                  <button
                    onClick={() => updateAdStatus(item.advertiserId, item.id, 'suspended')}
                    disabled={actionLoading === item.id}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50"
                  >
                    Suspender
                  </button>
                )}
                {item.status === 'approved' && (
                  <button
                    onClick={() => updateAdStatus(item.advertiserId, item.id, 'active')}
                    disabled={actionLoading === item.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    Activar (público)
                  </button>
                )}
                {item.status === 'active' && (
                  <button
                    onClick={() => updateAdStatus(item.advertiserId, item.id, 'suspended')}
                    disabled={actionLoading === item.id}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium disabled:opacity-50"
                  >
                    Pausar
                  </button>
                )}
                {item.status === 'suspended' && (
                  <button
                    onClick={() => updateAdStatus(item.advertiserId, item.id, 'approved')}
                    disabled={actionLoading === item.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    Re-activar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Pago Integrado */}
      {showPayment && paymentData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-8 border-2 border-blue-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Completa el Pago</h2>
                <p className="text-gray-600 mt-1">{paymentData.description}</p>
              </div>
              <button
                onClick={() => {
                  setShowPayment(false);
                  setPaymentData(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <StripePaymentForm
              amount={paymentData.amount}
              currency="usd"
              description={paymentData.description}
              clientSecret={paymentData.clientSecret}
              onSuccess={async (paymentIntentId: string) => {
                try {
                  const response = await fetch(`/api/admin/advertisers/${paymentData.advertiserId}/ads/${paymentData.adId}/confirm-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentIntentId }),
                  });

                  if (response.ok) {
                    alert('¡Pago completado exitosamente!');
                    setShowPayment(false);
                    setPaymentData(null);
                    window.location.reload();
                  } else {
                    const data = await response.json();
                    alert(`Error al confirmar el pago: ${data.error || 'Error desconocido'}`);
                  }
                } catch (error: any) {
                  alert(`Error: ${error.message}`);
                }
              }}
              onError={(error: string) => {
                alert(`Error en el pago: ${error}`);
              }}
              metadata={{
                advertiserId: paymentData.advertiserId,
                adId: paymentData.adId,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

