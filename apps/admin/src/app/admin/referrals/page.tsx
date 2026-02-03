'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimeReferrals } from '@/hooks/useRealtimeReferrals';

interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referredEmail: string;
  referralCode: string;
  membershipType: string;
  userType: string;
  status: string;
  rewardStatus: {
    discountApplied: boolean;
    freeMonthApplied: boolean;
    promotionsAvailable: number;
    bannersAvailable: number;
    promotionsUsed: number;
    bannersUsed: number;
  };
  createdAt: string;
  confirmedAt?: string;
  rewardsGrantedAt?: string;
}

interface ReferralStats {
  total: number;
  pending: number;
  confirmed: number;
  rewarded: number;
  cancelled: number;
}

export default function ReferralsAdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showGrantCreditModal, setShowGrantCreditModal] = useState(false);

  // Hook en tiempo real para referidos
  const { referrals, loading } = useRealtimeReferrals({
    status: filter === 'all' ? undefined : filter,
  });

  // Calcular estadísticas en tiempo real
  useEffect(() => {
    if (referrals.length > 0) {
      setStats({
        total: referrals.length,
        pending: referrals.filter(r => r.status === 'pending').length,
        confirmed: referrals.filter(r => r.status === 'confirmed').length,
        rewarded: referrals.filter(r => r.status === 'rewarded').length,
        cancelled: referrals.filter(r => r.status === 'cancelled').length,
      });
    } else {
      setStats({
        total: 0,
        pending: 0,
        confirmed: 0,
        rewarded: 0,
        cancelled: 0,
      });
    }
  }, [referrals]);

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      rewarded: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      rewarded: 'Recompensado',
      cancelled: 'Cancelado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Referidos</h1>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              console.log('🔘 Click en Configurar Recompensas');
              // Usar window.location directamente para asegurar la navegación
              window.location.href = '/admin/referrals/config';
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            ⚙️ Configurar Recompensas
          </button>
          <button
            onClick={() => setShowGrantCreditModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            ➕ Otorgar Crédito
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Total</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Pendientes</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Confirmados</div>
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Recompensados</div>
            <div className="text-2xl font-bold text-green-600">{stats.rewarded}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Cancelados</div>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'confirmed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Confirmados
          </button>
          <button
            onClick={() => setFilter('rewarded')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'rewarded'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Recompensados
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'cancelled'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cancelados
          </button>
        </div>
      </div>

      {/* Lista de Referidos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referidor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membresía</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recompensas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No hay referidos registrados
                  </td>
                </tr>
              ) : (
                referrals.map((referral) => (
                  <tr key={referral.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {referral.referrerId.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {referral.referredEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {referral.membershipType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {referral.userType === 'dealer' ? 'Dealer' : 'Vendedor'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(referral.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {referral.status === 'rewarded' && (
                        <div className="space-y-1">
                          {referral.rewardStatus.discountApplied && (
                            <div className="text-xs">✓ Descuento</div>
                          )}
                          {referral.rewardStatus.freeMonthApplied && (
                            <div className="text-xs">✓ Mes gratis</div>
                          )}
                          {referral.rewardStatus.promotionsAvailable > 0 && (
                            <div className="text-xs">
                              {referral.rewardStatus.promotionsUsed}/{referral.rewardStatus.promotionsAvailable} promociones
                            </div>
                          )}
                          {referral.rewardStatus.bannersAvailable > 0 && (
                            <div className="text-xs">
                              {referral.rewardStatus.bannersUsed}/{referral.rewardStatus.bannersAvailable} banners
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(referral.createdAt).toLocaleDateString('es-ES')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Otorgar Crédito */}
      {showGrantCreditModal && (
        <GrantCreditModal
          onClose={() => setShowGrantCreditModal(false)}
          onSuccess={() => {
            setShowGrantCreditModal(false);
            // El hook useRealtimeReferrals actualiza automáticamente
          }}
        />
      )}
    </div>
  );
}

function GrantCreditModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [userId, setUserId] = useState('');
  const [type, setType] = useState<'promotion' | 'banner'>('promotion');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/referrals/grant-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Error al otorgar crédito');
      }
    } catch (err: any) {
      setError(err.message || 'Error al otorgar crédito');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Otorgar Crédito</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID del Usuario
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="ID del usuario (dealer o seller)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Crédito
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'promotion' | 'banner')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="promotion">Promoción</option>
              <option value="banner">Banner</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-semibold mb-1">ℹ️ Información sobre expiración:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Promociones:</strong> No expiran hasta que se usen</li>
              <li><strong>Banners:</strong> No expiran hasta que se usen. Una vez usados, válidos por 7 días</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Otorgando...' : 'Otorgar Crédito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

