'use client';

import { useState, useEffect } from 'react';
import { useRealtimeRewards } from '@/hooks/useRealtimeRewards';
import { useRealtimeReferrals } from '@/hooks/useRealtimeReferrals';

interface Referral {
  id: string;
  referredEmail: string;
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

interface Rewards {
  activeRewards: {
    nextMonthDiscount: number;
    freeMonthsRemaining: number;
    promotionCredits: number;
    bannerCredits: number;
  };
  stats: {
    totalReferred: number;
    totalRewarded: number;
    pendingRewards: number;
  };
}

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  
  // Hook en tiempo real para recompensas
  const { rewards, loading: rewardsLoading } = useRealtimeRewards(userId);
  
  // Hook en tiempo real para referidos
  const { referrals, loading: referralsLoading } = useRealtimeReferrals(userId);

  useEffect(() => {
    fetchUserAndData();
  }, []);

  async function fetchUserAndData() {
    try {
      // Obtener usuario actual
      const userResponse = await fetch('/api/auth/me', { credentials: 'include' });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserId(userData.user?.userId || userData.user?.id || userData.id || '');
      }
      
      // Obtener código de referido
      const codeResponse = await fetch('/api/referrals/my-code', { credentials: 'include' });
      if (codeResponse.ok) {
        const codeData = await codeResponse.json();
        setReferralCode(codeData.code);
        setReferralLink(codeData.link);
      }

      // Los referidos se cargan automáticamente con el hook useRealtimeReferrals
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

  const loading = (rewardsLoading && !rewards) || (referralsLoading && referrals.length === 0);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Sistema de Referidos</h1>

      {/* Código de Referido */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Mi Código de Referido</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Código</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralCode}
                readOnly
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-gray-50"
              />
              <button
                onClick={() => copyToClipboard(referralCode)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Link de Referido</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-gray-50"
              />
              <button
                onClick={() => copyToClipboard(referralLink)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recompensas Activas */}
      {rewards && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Mis Recompensas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Descuento Próximo Mes</div>
              <div className="text-2xl font-bold text-blue-600">
                {rewards.activeRewards.nextMonthDiscount > 0 ? `${rewards.activeRewards.nextMonthDiscount}%` : '0%'}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Meses Gratis</div>
              <div className="text-2xl font-bold text-green-600">
                {rewards.activeRewards.freeMonthsRemaining}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Promociones Disponibles</div>
              <div className="text-2xl font-bold text-purple-600">
                {rewards.activeRewards.promotionCredits}
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Banners Disponibles</div>
              <div className="text-2xl font-bold text-orange-600">
                {rewards.activeRewards.bannerCredits}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      {rewards && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Estadísticas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Referidos</div>
              <div className="text-3xl font-bold text-gray-900">{rewards.stats.totalReferred}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Recompensados</div>
              <div className="text-3xl font-bold text-green-600">{rewards.stats.totalRewarded}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Pendientes</div>
              <div className="text-3xl font-bold text-yellow-600">{rewards.stats.pendingRewards}</div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Referidos */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Mis Referidos</h2>
        </div>
        {referrals.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-gray-600">Aún no has referido a nadie</p>
            <p className="text-gray-500 text-sm mt-2">Comparte tu código o link para empezar a ganar recompensas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membresía</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recompensas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {referrals.map((referral) => (
                  <tr key={referral.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {referral.referredEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {referral.membershipType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(referral.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {referral.status === 'rewarded' && (
                        <div className="space-y-1">
                          {referral.rewardStatus.discountApplied && (
                            <div className="text-xs">✓ Descuento aplicado</div>
                          )}
                          {referral.rewardStatus.freeMonthApplied && (
                            <div className="text-xs">✓ Mes gratis aplicado</div>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

