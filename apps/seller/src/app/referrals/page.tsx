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
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Hook en tiempo real para recompensas
  const { rewards, loading: rewardsLoading } = useRealtimeRewards(userId);
  
  // Hook en tiempo real para referidos
  const { referrals, loading: referralsLoading } = useRealtimeReferrals(userId);

  useEffect(() => {
    fetchUserAndData();
  }, []);

  // Reintentar obtener código cuando userId esté disponible
  useEffect(() => {
    if (userId && !referralCode) {
      console.log('🔄 Reintentando obtener código de referido para userId:', userId);
      fetch('/api/referrals/my-code', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.code) {
            setReferralCode(data.code);
            setReferralLink(data.link || '');
            console.log('✅ Código obtenido en segundo intento:', data.code);
          }
        })
        .catch(err => console.error('❌ Error en segundo intento:', err));
    }
  }, [userId, referralCode]);

  async function fetchUserAndData() {
    setLoading(true);
    setError('');
    try {
      // LIMPIAR COOKIES INVÁLIDAS PRIMERO
      const cookies = document.cookie.split(';');
      const authTokenCookie = cookies.find(c => c.trim().startsWith('authToken='));
      if (authTokenCookie) {
        const tokenValue = decodeURIComponent(authTokenCookie.split('=')[1] || '');
        if (tokenValue && tokenValue.length < 200) {
          // Es un token de otra app, limpiarlo
          document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/advertiser; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          setError('Token inválido detectado. Por favor, inicia sesión nuevamente.');
          setLoading(false);
          setTimeout(() => window.location.href = '/login', 2000);
          return;
        }
      }
      
      // Renovar token antes de hacer las llamadas
      try {
        const { ensureFreshToken } = await import('@/lib/token-refresh');
        await ensureFreshToken();
      } catch (tokenError) {
        // Continuar aunque falle la renovación
      }
      
      // Obtener usuario actual
      const userResponse = await fetch('/api/auth/me', { credentials: 'include' });
      
      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        
        // Si el servidor indica que debe limpiar la cookie, hacerlo
        if (errorData.clearCookie) {
          document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/advertiser; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        
        if (userResponse.status === 401) {
          setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
          setTimeout(() => window.location.href = '/login', 2000);
        } else {
          setError(errorData.error || 'Error al obtener información del usuario.');
        }
        setLoading(false);
        return;
      }
      
      const userData = await userResponse.json();
      const userIdValue = userData.user?.userId || userData.user?.id || userData.id || '';
      
      if (!userIdValue) {
        setError('No se pudo obtener tu ID de usuario.');
        setLoading(false);
        return;
      }
      
      setUserId(userIdValue);
      
      // Obtener código de referido
      const codeResponse = await fetch('/api/referrals/my-code', { credentials: 'include' });
      
      if (!codeResponse.ok) {
        const errorData = await codeResponse.json().catch(() => ({ error: 'Error desconocido' }));
        
        if (codeResponse.status === 401) {
          setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        } else if (codeResponse.status === 403) {
          setError('No tienes permiso para acceder a esta función.');
        } else {
          setError(errorData.error || errorData.message || 'Error al obtener el código de referido.');
        }
        setLoading(false);
        return;
      }
      
      const codeData = await codeResponse.json();
      
      if (codeData.code) {
        setReferralCode(codeData.code);
        setReferralLink(codeData.link || '');
        setError('');
      } else {
        setError('El servidor no devolvió un código de referido.');
      }
    } catch (error: any) {
      console.error('Error en fetchUserAndData:', error);
      setError(`Error: ${error.message || 'No se pudo conectar con el servidor'}.`);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string) {
    if (!text || text.trim() === '') {
      setError('No hay texto para copiar');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.log('✅ Texto copiado al portapapeles:', text);
    } catch (err) {
      console.error('❌ Error al copiar:', err);
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        setError('No se pudo copiar al portapapeles. Por favor, copia manualmente.');
      }
      document.body.removeChild(textArea);
    }
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

  const pageLoading = loading || ((rewardsLoading && !rewards) || (referralsLoading && referrals.length === 0));
  
  if (pageLoading && !referralCode) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Cargando código de referido...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Sistema de Referidos</h1>

      {/* Código de Referido */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Mi Código de Referido</h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 font-semibold mb-2">❌ Error</p>
            <p className="text-red-700 text-sm mb-3">{error}</p>
            <div className="space-y-2">
              <button
                onClick={fetchUserAndData}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                🔄 Reintentar
              </button>
              {error.includes('sesión') || error.includes('expirado') ? (
                <button
                  onClick={() => {
                    window.location.href = '/login';
                  }}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  🔐 Ir al Login
                </button>
              ) : null}
            </div>
          </div>
        )}
        
        {!error && !referralCode && !loading ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 text-sm mb-2">
              ⚠️ No se pudo cargar el código de referido.
            </p>
            <button
              onClick={fetchUserAndData}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
            >
              🔄 Reintentar
            </button>
          </div>
        ) : null}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Código</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralCode || (loading ? 'Cargando...' : 'No disponible')}
                readOnly
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-gray-50"
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (referralCode) {
                    copyToClipboard(referralCode);
                  }
                }}
                disabled={!referralCode || loading}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  referralCode && !loading
                    ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer active:bg-blue-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                type="button"
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
                value={referralLink || (loading ? 'Cargando...' : 'No disponible')}
                readOnly
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-gray-50"
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (referralLink) {
                    copyToClipboard(referralLink);
                  }
                }}
                disabled={!referralLink || loading}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  referralLink && !loading
                    ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer active:bg-blue-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                type="button"
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

