'use client';

import { useState, useMemo } from 'react';
import { useRealtimeSponsoredContent } from '@/hooks/useRealtimeSponsoredContent';
import CreateSponsoredContentModal from './CreateSponsoredContentModal';
import { StripePaymentForm } from '@autodealers/shared/components/StripePaymentForm';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { resolveAdCreativePreviewSrc } from '@autodealers/core/ad-creative';

type ContentFilter =
  | 'all'
  | 'pending'
  | 'payment_pending'
  | 'approved'
  | 'active'
  | 'paused'
  | 'rejected';

type ModerationStatus =
  | 'active'
  | 'approved'
  | 'paused'
  | 'rejected'
  | 'cancelled'
  | 'pending';

export default function AdminSponsoredContentPage() {
  const [filter, setFilter] = useState<ContentFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    clientSecret: string;
    paymentIntentId?: string;
    advertiserId: string;
    adId: string;
    amount: number;
    description: string;
  } | null>(null);

  const { content, loading } = useRealtimeSponsoredContent({
    status: filter === 'all' ? undefined : filter,
  });

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      payment_pending: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-primary-100 text-primary-800',
      paused: 'bg-gray-100 text-gray-800',
      suspended: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      payment_pending: 'Pago pendiente',
      approved: 'Aprobada',
      active: 'Activa (público)',
      paused: 'Pausada',
      suspended: 'Suspendida',
      expired: 'Expirada',
      rejected: 'Rechazada',
      cancelled: 'Cancelada',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  }

  async function moderateAd(adId: string, status: ModerationStatus, reason?: string) {
    setActionError('');
    setActionMessage('');
    setActionLoading(adId);
    try {
      const res = await fetchWithAuth(`/api/admin/sponsored-content/${adId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar el anuncio');
      setActionMessage('Anuncio actualizado correctamente');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error al actualizar el anuncio');
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteAd(adId: string, title: string) {
    if (!confirm(`¿Eliminar permanentemente "${title || 'este anuncio'}"?`)) return;
    setActionError('');
    setActionMessage('');
    setActionLoading(adId);
    try {
      const res = await fetchWithAuth(`/api/admin/sponsored-content/${adId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar el anuncio');
      setActionMessage('Anuncio eliminado');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setActionLoading(null);
    }
  }

  async function createPaymentSession(advertiserId: string, adId: string) {
    setActionError('');
    setActionLoading(adId);
    try {
      const res = await fetchWithAuth(
        `/api/admin/advertisers/${advertiserId}/ads/${adId}/payment-session`,
        { method: 'POST' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo crear la sesión de pago');

      if (data.clientSecret) {
        const ad = content.find((c) => c.id === adId) as {
          price?: number;
          title?: string;
          campaignName?: string;
        } | undefined;
        setPaymentData({
          clientSecret: data.clientSecret,
          paymentIntentId: data.paymentIntentId,
          advertiserId,
          adId,
          amount: ad?.price || 0,
          description: `Anuncio: ${ad?.title || ad?.campaignName || 'Anuncio'}`,
        });
        setShowPayment(true);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error al crear la sesión de pago');
    } finally {
      setActionLoading(null);
    }
  }

  const stats = useMemo(
    () => ({
      total: content.length,
      pending: content.filter((c) => c.status === 'pending').length,
      paymentPending: content.filter((c) => c.status === 'payment_pending').length,
      active: content.filter((c) => c.status === 'active' || c.status === 'approved').length,
      paused: content.filter((c) => c.status === 'paused' || c.status === 'suspended').length,
      totalImpressions: content.reduce((sum, c) => sum + (c.impressions || 0), 0),
      totalClicks: content.reduce((sum, c) => sum + (c.clicks || 0), 0),
    }),
    [content]
  );

  const filterButtons: { key: ContentFilter; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'payment_pending', label: 'Pago pendiente' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'active', label: 'Activas' },
    { key: 'paused', label: 'Pausadas' },
    { key: 'rejected', label: 'Rechazadas' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contenido Patrocinado</h1>
          <p className="text-gray-600">
            Aprueba, activa, pausa, rechaza o elimina anuncios. Solo los estados{' '}
            <strong>activo</strong> y <strong>aprobado</strong> se muestran en el sitio público.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold transition-colors"
        >
          + Crear Contenido
        </button>
      </div>

      {showCreateModal && (
        <CreateSponsoredContentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pago pend." value={stats.paymentPending} className="text-orange-600" />
        <StatCard label="Pendientes" value={stats.pending} className="text-yellow-600" />
        <StatCard label="En público" value={stats.active} className="text-primary-600" />
        <StatCard label="Pausadas" value={stats.paused} className="text-gray-600" />
        <StatCard label="Impresiones" value={stats.totalImpressions.toLocaleString()} />
        <StatCard label="Clics" value={stats.totalClicks.toLocaleString()} />
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        {filterButtons.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {actionError}
        </div>
      )}
      {actionMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {actionMessage}
        </div>
      )}

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
          {content.map((item) => {
            const busy = actionLoading === item.id;
            const displayTitle = item.title || item.campaignName || '(sin título)';
            const isPublic =
              item.status === 'active' || item.status === 'approved';

            return (
              <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{displayTitle}</h3>
                      {getStatusBadge(item.status)}
                      <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded">
                        {item.placement}
                      </span>
                      {isPublic && (
                        <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-200">
                          Visible en web
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-gray-700 mb-2 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>Empresa: {item.advertiserName}</span>
                      <span>👁️ {(item.impressions || 0).toLocaleString()}</span>
                      <span>👆 {(item.clicks || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {resolveAdCreativePreviewSrc(item).kind !== 'none' && (
                  <div className="mb-4">
                    {resolveAdCreativePreviewSrc(item).kind === 'video' ? (
                      <video
                        src={resolveAdCreativePreviewSrc(item).src}
                        className="h-48 w-full max-w-md rounded-lg object-cover"
                        muted
                        playsInline
                        controls
                      />
                    ) : (
                    <img
                      src={resolveAdCreativePreviewSrc(item).src}
                      alt={displayTitle}
                      className="w-full max-w-md h-48 object-cover rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  {!isPublic && item.status !== 'rejected' && item.status !== 'cancelled' && (
                    <button
                      onClick={() => moderateAd(item.id, 'active')}
                      disabled={busy}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                    >
                      Publicar (activar)
                    </button>
                  )}

                  {(item.status === 'active' || item.status === 'approved') && (
                    <button
                      onClick={() => moderateAd(item.id, 'paused')}
                      disabled={busy}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50"
                    >
                      Pausar / ocultar
                    </button>
                  )}

                  {item.status === 'paused' && (
                    <button
                      onClick={() => moderateAd(item.id, 'active')}
                      disabled={busy}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
                    >
                      Reanudar
                    </button>
                  )}

                  {item.status === 'payment_pending' && (
                    <button
                      onClick={() => createPaymentSession(item.advertiserId, item.id)}
                      disabled={busy}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
                    >
                      Cobrar / activar pago
                    </button>
                  )}

                  {item.status !== 'rejected' && item.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        const reason = prompt('Motivo del rechazo (opcional):') || '';
                        void moderateAd(item.id, 'rejected', reason);
                      }}
                      disabled={busy}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  )}

                  <button
                    onClick={() => deleteAd(item.id, displayTitle)}
                    disabled={busy}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showPayment && paymentData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-8 border-2 border-primary-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  const response = await fetchWithAuth(
                    `/api/admin/advertisers/${paymentData.advertiserId}/ads/${paymentData.adId}/confirm-payment`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ paymentIntentId }),
                    }
                  );
                  if (response.ok) {
                    setShowPayment(false);
                    setPaymentData(null);
                    setActionMessage('Pago completado. El anuncio quedó activo en el sitio.');
                  } else {
                    const data = await response.json();
                    setActionError(data.error || 'Error al confirmar el pago');
                  }
                } catch (error: unknown) {
                  setActionError(error instanceof Error ? error.message : 'Error en el pago');
                }
              }}
              onError={(error: string) => setActionError(error)}
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

function StatCard({
  label,
  value,
  className = 'text-gray-900',
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${className}`}>{value}</div>
    </div>
  );
}
