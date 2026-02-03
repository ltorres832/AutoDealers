'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Banner {
  id: string;
  tenantId: string;
  tenantName?: string;
  imageUrl: string;
  title: string;
  description: string;
  ctaText: string;
  linkType: 'vehicle' | 'dealer' | 'seller' | 'filter';
  linkValue: string;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  approved: boolean;
  duration: number;
  price: number;
  views: number;
  clicks: number;
  expiresAt?: string;
  createdAt?: string;
  rejectionReason?: string;
  requestedBy?: string;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    rejected: 0,
    totalViews: 0,
    totalClicks: 0,
  });

  useEffect(() => {
    fetchBanners();
  }, [filter]);

  async function fetchBanners() {
    try {
      const url = filter === 'all' 
        ? '/api/admin/banners'
        : `/api/admin/banners?status=${filter}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const fetchedBanners = data.banners || [];
        setBanners(fetchedBanners);

        const pending = fetchedBanners.filter((b: Banner) => b.status === 'pending').length;
        const active = fetchedBanners.filter((b: Banner) => b.status === 'active').length;
        const rejected = fetchedBanners.filter((b: Banner) => b.status === 'rejected').length;
        const totalViews = fetchedBanners.reduce((sum: number, b: Banner) => sum + (b.views || 0), 0);
        const totalClicks = fetchedBanners.reduce((sum: number, b: Banner) => sum + (b.clicks || 0), 0);

        setStats({
          total: fetchedBanners.length,
          pending,
          active,
          rejected,
          totalViews,
          totalClicks,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function approveBanner(bannerId: string, tenantId: string) {
    try {
      const response = await fetch(`/api/admin/banners/${bannerId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });

      if (response.ok) {
        alert('Banner aprobado exitosamente');
        fetchBanners();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al aprobar el banner'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function rejectBanner(bannerId: string, tenantId: string, reason: string) {
    if (!reason.trim()) {
      alert('Por favor proporciona una razón para el rechazo');
      return;
    }

    try {
      const response = await fetch(`/api/admin/banners/${bannerId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, reason }),
      });

      if (response.ok) {
        alert('Banner rechazado exitosamente');
        fetchBanners();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al rechazar el banner'}`);
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

  const pendingBanners = banners.filter(b => b.status === 'pending');
  const activeBanners = banners.filter(b => b.status === 'active');
  const rejectedBanners = banners.filter(b => b.status === 'rejected');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Banners Premium</h1>
          <p className="text-gray-600 mt-2">
            Aprueba o rechaza banners premium de dealers y vendedores
          </p>
        </div>
        <Link
          href="/admin/banners/assign"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          ➕ Asignar Banner
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Pendientes</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Activos</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Rechazados</div>
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Vistas</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalViews}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Clics</div>
          <div className="text-2xl font-bold text-purple-600">{stats.totalClicks}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Pendientes ({stats.pending})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'active' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Activos ({stats.active})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Rechazados ({stats.rejected})
        </button>
      </div>

      {/* Banners Pendientes */}
      {pendingBanners.length > 0 && filter !== 'active' && filter !== 'rejected' && (
        <div className="mb-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⏳</span>
              <div>
                <h2 className="text-xl font-bold">Banners Pendientes de Aprobación</h2>
                <p className="text-sm text-gray-600">
                  Revisa y aprueba o rechaza estos banners
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingBanners.map((banner) => (
                <BannerCard
                  key={banner.id}
                  banner={banner}
                  onApprove={() => approveBanner(banner.id, banner.tenantId)}
                  onReject={(reason) => rejectBanner(banner.id, banner.tenantId, reason)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Banners Activos */}
      {activeBanners.length > 0 && filter !== 'pending' && filter !== 'rejected' && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Banners Activos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeBanners.map((banner) => (
              <BannerCard
                key={banner.id}
                banner={banner}
                readOnly={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Banners Rechazados */}
      {rejectedBanners.length > 0 && filter !== 'pending' && filter !== 'active' && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Banners Rechazados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rejectedBanners.map((banner) => (
              <BannerCard
                key={banner.id}
                banner={banner}
                readOnly={true}
              />
            ))}
          </div>
        </div>
      )}

      {banners.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-xl font-bold mb-2">No hay banners</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'No hay banners en el sistema'
              : `No hay banners con estado "${filter}"`}
          </p>
        </div>
      )}
    </div>
  );
}

function BannerCard({
  banner,
  onApprove,
  onReject,
  readOnly = false,
}: {
  banner: Banner;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  readOnly?: boolean;
}) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {banner.imageUrl && (
          <div className="relative h-48 bg-gray-200">
            <img
              src={banner.imageUrl}
              alt={banner.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                banner.status === 'active' ? 'bg-green-500 text-white' :
                banner.status === 'pending' ? 'bg-yellow-500 text-white' :
                'bg-red-500 text-white'
              }`}>
                {banner.status === 'active' ? 'Activo' :
                 banner.status === 'pending' ? 'Pendiente' :
                 'Rechazado'}
              </span>
            </div>
          </div>
        )}
        <div className="p-4">
          <h3 className="font-bold text-lg mb-2">{banner.title}</h3>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{banner.description}</p>
          
          {banner.tenantName && (
            <p className="text-xs text-gray-500 mb-2">
              <strong>Dealer:</strong> {banner.tenantName}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div>
              <div className="text-gray-500">Vistas</div>
              <div className="font-bold text-blue-600">{banner.views || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">Clics</div>
              <div className="font-bold text-purple-600">{banner.clicks || 0}</div>
            </div>
          </div>

          {banner.expiresAt && (
            <div className="text-xs text-gray-500 mb-3">
              Expira: {new Date(banner.expiresAt).toLocaleDateString()}
            </div>
          )}

          {banner.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
              <p className="text-xs text-red-700">
                <strong>Razón del rechazo:</strong> {banner.rejectionReason}
              </p>
            </div>
          )}

          {!readOnly && banner.status === 'pending' && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={onApprove}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 font-medium text-sm"
              >
                ✅ Aprobar
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-medium text-sm"
              >
                ❌ Rechazar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Rechazo */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Rechazar Banner</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Razón del rechazo *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={4}
                placeholder="Explica por qué se rechaza este banner..."
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 border rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (rejectReason.trim() && onReject) {
                    onReject(rejectReason);
                    setShowRejectModal(false);
                    setRejectReason('');
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

