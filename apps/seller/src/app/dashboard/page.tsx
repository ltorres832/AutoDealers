'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useRealtimeMemberships } from '@/hooks/useRealtimeMemberships';

interface DashboardData {
  stats: {
    myLeads: number;
    activeLeads: number;
    mySales: number;
    myRevenue: number;
    weeklyRevenue: number;
    dailyRevenue: number;
    monthlyCommissions: number;
    totalCommissions: number;
    appointmentsToday: number;
    unreadMessages: number;
    conversionRate: number;
    totalVehicles: number;
    availableVehicles: number;
    dailySales: number;
    weeklySales: number;
    monthlySales: number;
    totalPromotions?: number;
    activePromotions?: number;
    totalPromotionViews?: number;
    totalPromotionClicks?: number;
  };
  recentLeads: any[];
  recentSales: any[];
  upcomingAppointments: any[];
  recentPromotions?: Array<{
    id: string;
    name: string;
    views: number;
    clicks: number;
    status: string;
    createdAt?: string;
  }>;
}

export default function SellerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileInfo, setProfileInfo] = useState<any>(null);
  const router = useRouter();
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  
  // Hooks de tiempo real para membresías y suscripciones (mismo que en la página de membresías)
  const { subscription, loading: subscriptionLoading } = useRealtimeSubscription(tenantId);
  const { memberships, loading: membershipsLoading } = useRealtimeMemberships('seller');
  
  // Obtener membresía actual basada en la suscripción
  const currentMembership = subscription?.membershipId 
    ? memberships.find(m => m.id === subscription.membershipId) 
    : null;

  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth no está configurado');
      setAuthLoading(false);
      setLoading(false);
      setData({
        stats: {
          myLeads: 0,
          activeLeads: 0,
          mySales: 0,
          myRevenue: 0,
          weeklyRevenue: 0,
          dailyRevenue: 0,
          monthlyCommissions: 0,
          totalCommissions: 0,
          appointmentsToday: 0,
          unreadMessages: 0,
          conversionRate: 0,
          totalVehicles: 0,
          availableVehicles: 0,
          dailySales: 0,
          weeklySales: 0,
          monthlySales: 0,
        },
        recentLeads: [],
        recentSales: [],
        upcomingAppointments: [],
      });
      return;
    }

    let isValidating = false; // Flag para evitar múltiples validaciones simultáneas
    let hasValidated = false; // Flag para evitar validaciones repetidas
    
    // Limpiar cualquier intervalo anterior al inicio
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Verificar autenticación primero
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Si ya validamos exitosamente, no volver a validar
      if (hasValidated && user) {
        return;
      }
      
      if (!user) {
        setAuthLoading(false);
        setTimeout(() => {
          if (!auth.currentUser) {
            window.location.href = '/login';
          }
        }, 500);
        return;
      }
      
      // Evitar múltiples validaciones simultáneas
      if (isValidating) {
        return;
      }
      
      isValidating = true;
      
      try {
        // Obtener token y guardarlo en cookie
        const token = await user.getIdToken(true); // Forzar renovación
        if (!token || token.length < 200) {
          console.error('❌ Token inválido o truncado:', token?.length);
          throw new Error('Error al obtener token de autenticación');
        }
        const isSecure = window.location.protocol === 'https:';
        const cookieValue = encodeURIComponent(token);
        document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        console.log('✅ Token guardado en dashboard, longitud:', token.length);
        
        // Verificar que el usuario es seller - pero si falla, no redirigir inmediatamente
        // Solo marcar como no validado y dejar que el usuario vea el dashboard
        try {
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid }),
            credentials: 'include',
          });
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            if (loginData.user?.role === 'seller') {
              // Todo está correcto
              setUser(loginData.user);
              setTenantId(loginData.user?.tenantId);
              hasValidated = true;
              isValidating = false;
              setAuthLoading(false);
              fetchDashboardData();
              fetchProfileInfo();
              
              // Establecer intervalo para actualizar datos cada 60 segundos (reducido de 30)
              if (!intervalIdRef.current) {
                intervalIdRef.current = setInterval(() => {
                  fetchDashboardData();
                }, 60000);
              }
              return;
            }
          }
        } catch (apiError) {
          // Si la API falla, pero el usuario está autenticado en Firebase, permitir acceso
          // Esto evita que problemas de red causen redirecciones
        }
        
        // Si llegamos aquí, el usuario está autenticado en Firebase pero la validación falló
        // Permitir acceso de todas formas si Firebase Auth dice que está bien
        // Intentar obtener información del usuario para establecer tenantId
        try {
          const userResponse = await fetch('/api/user', { credentials: 'include' });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUser(userData.user);
            setTenantId(userData.user?.tenantId);
          }
        } catch (e) {
          console.error('Error obteniendo usuario:', e);
        }
        hasValidated = true;
        isValidating = false;
        setAuthLoading(false);
        fetchDashboardData();
        fetchProfileInfo();
        
        if (!intervalIdRef.current) {
          intervalIdRef.current = setInterval(() => {
            fetchDashboardData();
          }, 60000); // Reducido de 30 a 60 segundos
        }
      } catch (error) {
        isValidating = false;
        setAuthLoading(false);
        // Solo redirigir si realmente no hay usuario en Firebase
        if (!auth.currentUser) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 500);
        }
      }
    });

    return () => {
      unsubscribe();
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [router]);

  async function fetchDashboardData() {
    let timeoutId: NodeJS.Timeout | undefined;
    
    try {
      setLoading(true);
      
      // Agregar timeout de 8 segundos
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch('/api/dashboard', {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('Error fetching dashboard:', errorData, 'Status:', response.status);
        
        // Si es un error de autenticación, NO redirigir inmediatamente
        // El onAuthStateChanged se encargará de manejar esto
        if (response.status === 401) {
          console.log('[DASHBOARD] 401 error, but user is authenticated. Waiting for auth state change.');
          // No redirigir aquí - dejar que onAuthStateChanged maneje
          return;
        }
        
        // Establecer datos vacíos en lugar de null para evitar el mensaje de error
        setData({
          stats: {
            myLeads: 0,
            activeLeads: 0,
            mySales: 0,
            myRevenue: 0,
            weeklyRevenue: 0,
            dailyRevenue: 0,
            monthlyCommissions: 0,
            totalCommissions: 0,
            appointmentsToday: 0,
            unreadMessages: 0,
            conversionRate: 0,
            totalVehicles: 0,
            availableVehicles: 0,
            dailySales: 0,
            weeklySales: 0,
            monthlySales: 0,
            totalPromotions: 0,
            activePromotions: 0,
            totalPromotionViews: 0,
            totalPromotionClicks: 0,
          },
          recentLeads: [],
          recentSales: [],
          upcomingAppointments: [],
          recentPromotions: [],
        });
        return;
      }
      
      const dashboardData = await response.json();
      // Asegurar que siempre tenga los campos de promociones
      const finalData: DashboardData = {
        ...dashboardData,
        stats: {
          ...dashboardData.stats,
          totalPromotions: dashboardData.stats?.totalPromotions ?? 0,
          activePromotions: dashboardData.stats?.activePromotions ?? 0,
          totalPromotionViews: dashboardData.stats?.totalPromotionViews ?? 0,
          totalPromotionClicks: dashboardData.stats?.totalPromotionClicks ?? 0,
        },
        recentPromotions: dashboardData.recentPromotions || [],
      };
      setData(finalData);
    } catch (error: any) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      console.error('Error:', error);
      
      // Si es un timeout, mostrar datos vacíos
      if (error.name === 'AbortError') {
        console.warn('Dashboard request timeout');
      }
      
      // Establecer datos vacíos en lugar de null
      setData({
        stats: {
          myLeads: 0,
          activeLeads: 0,
          mySales: 0,
          myRevenue: 0,
          weeklyRevenue: 0,
          dailyRevenue: 0,
          monthlyCommissions: 0,
          totalCommissions: 0,
          appointmentsToday: 0,
          unreadMessages: 0,
          conversionRate: 0,
          totalVehicles: 0,
          availableVehicles: 0,
          dailySales: 0,
          weeklySales: 0,
          monthlySales: 0,
          totalPromotions: 0,
          activePromotions: 0,
          totalPromotionViews: 0,
          totalPromotionClicks: 0,
        },
        recentLeads: [],
        recentSales: [],
        upcomingAppointments: [],
        recentPromotions: [],
      });
    } finally {
      setLoading(false);
    }
  }

  // Ya no necesitamos fetchMembershipInfo porque usamos hooks de tiempo real
  // Los datos se actualizan automáticamente desde Firestore

  async function fetchProfileInfo() {
    try {
      const response = await fetch('/api/settings/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileInfo(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile info:', error);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'past_due':
      case 'unpaid':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'suspended':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      active: 'Activa',
      past_due: 'Pago Pendiente',
      cancelled: 'Cancelada',
      suspended: 'Suspendida',
      trialing: 'En Prueba',
      unpaid: 'No Pagado',
    };
    return labels[status] || status;
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Asegurar que data siempre tenga la estructura correcta
  const safeData = data || {
    stats: {
      myLeads: 0,
      activeLeads: 0,
      mySales: 0,
      myRevenue: 0,
      weeklyRevenue: 0,
      dailyRevenue: 0,
      monthlyCommissions: 0,
      totalCommissions: 0,
      appointmentsToday: 0,
      unreadMessages: 0,
      conversionRate: 0,
      totalVehicles: 0,
      availableVehicles: 0,
      dailySales: 0,
      weeklySales: 0,
      monthlySales: 0,
      totalPromotions: 0,
      activePromotions: 0,
      totalPromotionViews: 0,
      totalPromotionClicks: 0,
    },
    recentLeads: [],
    recentSales: [],
    upcomingAppointments: [],
    recentPromotions: [],
  };

  // Normalizar datos de promociones
  safeData.stats = {
    ...safeData.stats,
    totalPromotions: safeData.stats?.totalPromotions ?? 0,
    activePromotions: safeData.stats?.activePromotions ?? 0,
    totalPromotionViews: safeData.stats?.totalPromotionViews ?? 0,
    totalPromotionClicks: safeData.stats?.totalPromotionClicks ?? 0,
  };
  safeData.recentPromotions = safeData.recentPromotions || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Mi Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Vista general de tus leads, ventas y actividades
            </p>
          </div>
          {/* Calificaciones */}
          {profileInfo && (profileInfo.sellerRating || 0) > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-2">Mi Calificación</div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-2xl ${
                        star <= Math.round(profileInfo.sellerRating || 0)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <div className="ml-2">
                  <div className="text-xl font-bold text-gray-900">
                    {(profileInfo.sellerRating || 0).toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {profileInfo.sellerRatingCount || 0} calificación{profileInfo.sellerRatingCount !== 1 ? 'es' : ''}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Completion Banner */}
      {profileInfo && !profileInfo._dismissed && (!profileInfo.photo || !profileInfo.bio) && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-6 shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📸</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Completa tu perfil para que los clientes te conozcan mejor
                </h3>
                <p className="text-gray-700 mb-3">
                  Agrega tu foto y una breve biografía. Esta información aparecerá en tu página web pública y ayudará a los clientes a conocerte antes de agendar una cita.
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {!profileInfo.photo && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm font-medium text-blue-700 border border-blue-200">
                      <span>❌</span>
                      Foto de perfil faltante
                    </span>
                  )}
                  {!profileInfo.bio && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm font-medium text-blue-700 border border-blue-200">
                      <span>❌</span>
                      Biografía faltante
                    </span>
                  )}
                </div>
                <Link
                  href="/settings/profile"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg"
                >
                  <span>Completar Perfil</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
            <button
              onClick={() => setProfileInfo({ ...profileInfo, _dismissed: true })}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 ml-4"
              aria-label="Cerrar"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>
      )}

      {/* Membership Status Card */}
      {currentMembership && subscription && (
        <div className={`mb-6 p-4 rounded-lg border-2 ${getStatusColor(subscription.status)}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">Membresía: {currentMembership.name}</h3>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/50">
                  {getStatusLabel(subscription.status)}
                </span>
              </div>
              {subscription.statusReason && (
                <p className="text-sm mt-1 opacity-90">
                  {subscription.statusReason}
                </p>
              )}
              <p className="text-sm mt-1">
                Próximo pago: {(() => {
                  let date: Date;
                  if (subscription.currentPeriodEnd instanceof Date) {
                    date = subscription.currentPeriodEnd;
                  } else if (subscription.currentPeriodEnd && typeof subscription.currentPeriodEnd === 'object' && 'toDate' in subscription.currentPeriodEnd) {
                    date = (subscription.currentPeriodEnd as any).toDate();
                  } else {
                    date = new Date(subscription.currentPeriodEnd as string | number);
                  }
                  return date.toLocaleDateString();
                })()}
              </p>
            </div>
            <Link
              href="/settings/membership"
              className="px-4 py-2 bg-white/80 hover:bg-white rounded-lg font-medium text-sm transition-colors"
            >
              Gestionar Membresía
            </Link>
          </div>
        </div>
      )}

      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Mis Leads</p>
          <p className="text-3xl font-bold">{safeData.stats.myLeads}</p>
          <p className="text-sm text-green-600 mt-1">
            {safeData.stats.activeLeads} activos
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Mis Ventas</p>
          <p className="text-3xl font-bold">{safeData.stats.mySales}</p>
          <p className="text-sm text-gray-500 mt-1">
            {safeData.stats.conversionRate.toFixed(1)}% conversión
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Revenue Mensual</p>
          <p className="text-3xl font-bold">
            ${safeData.stats.myRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            ${safeData.stats.weeklyRevenue.toLocaleString()} esta semana
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Comisiones Totales</p>
          <p className="text-3xl font-bold text-green-600">
            ${safeData.stats.totalCommissions.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            ${safeData.stats.monthlyCommissions.toLocaleString()} este mes
          </p>
        </div>
      </div>

      {/* Estadísticas Secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Ventas Hoy</p>
          <p className="text-3xl font-bold">{safeData.stats.dailySales}</p>
          <p className="text-sm text-gray-500 mt-1">
            ${safeData.stats.dailyRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Ventas Semana</p>
          <p className="text-3xl font-bold">{safeData.stats.weeklySales}</p>
          <p className="text-sm text-gray-500 mt-1">
            ${safeData.stats.weeklyRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Ventas Mes</p>
          <p className="text-3xl font-bold">{safeData.stats.monthlySales}</p>
          <p className="text-sm text-gray-500 mt-1">
            ${safeData.stats.myRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Vehículos</p>
          <p className="text-3xl font-bold">{safeData.stats.totalVehicles}</p>
          <p className="text-sm text-blue-600 mt-1">
            {safeData.stats.availableVehicles} disponibles
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Citas Hoy</p>
          <p className="text-3xl font-bold">{safeData.stats.appointmentsToday}</p>
          <p className="text-sm text-gray-500 mt-1">
            {safeData.stats.unreadMessages} mensajes sin leer
          </p>
        </div>
      </div>

      {/* Estadísticas de Promociones - SIEMPRE VISIBLE - TEST */}
      <div 
        className="mb-8" 
        style={{ 
          backgroundColor: '#faf5ff', 
          padding: '24px', 
          borderRadius: '8px', 
          border: '2px solid #e9d5ff',
          marginTop: '24px',
          marginBottom: '24px',
          minHeight: '200px'
        }}
      >
        <div style={{ backgroundColor: 'transparent' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 
              className="text-2xl font-bold" 
              style={{ color: '#1f2937', fontSize: '24px', fontWeight: 'bold' }}
            >
              📊 Estadísticas de Promociones
            </h2>
            <Link
              href="/promotions"
              style={{ color: '#9333ea', fontSize: '14px', fontWeight: '500' }}
            >
              Ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 mb-1">Total Promociones</p>
              <p className="text-2xl font-bold text-gray-900">{safeData.stats.totalPromotions || 0}</p>
              <p className="text-xs text-green-600 mt-1">
                {safeData.stats.activePromotions || 0} activas
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 mb-1">Total Vistas</p>
              <p className="text-2xl font-bold text-blue-600">{safeData.stats.totalPromotionViews || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {safeData.stats.totalPromotionClicks || 0} clics
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 mb-1">Total Clics</p>
              <p className="text-2xl font-bold text-purple-600">{safeData.stats.totalPromotionClicks || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {(safeData.stats.totalPromotionViews ?? 0) > 0 
                  ? ((safeData.stats.totalPromotionClicks || 0) / (safeData.stats.totalPromotionViews || 1) * 100).toFixed(1)
                  : '0.0'}% tasa de clic
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 mb-1">Tasa de Conversión</p>
              <p className="text-2xl font-bold text-green-600">
                {(safeData.stats.totalPromotionViews ?? 0) > 0 
                  ? ((safeData.stats.totalPromotionClicks || 0) / (safeData.stats.totalPromotionViews || 1) * 100).toFixed(1)
                  : '0.0'}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Clics / Vistas
              </p>
            </div>
          </div>
          {safeData.recentPromotions && safeData.recentPromotions.length > 0 ? (
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="text-lg font-semibold mb-3">Promociones Recientes</h3>
              <div className="space-y-2">
                {safeData.recentPromotions.slice(0, 5).map((promo) => (
                  <div key={promo.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{promo.name}</p>
                      <p className="text-xs text-gray-500">
                        {promo.status === 'active' ? 'Activa' : promo.status}
                      </p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-blue-600 font-bold">{promo.views || 0}</p>
                        <p className="text-xs text-gray-500">Vistas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-purple-600 font-bold">{promo.clicks || 0}</p>
                        <p className="text-xs text-gray-500">Clics</p>
                      </div>
                      {promo.views > 0 && (
                        <div className="text-center">
                          <p className="text-green-600 font-bold">
                            {((promo.clicks || 0) / promo.views * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500">CTR</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-gray-500 text-center py-4">
                No hay promociones aún. <Link href="/promotions" className="text-purple-600 hover:text-purple-700 font-medium">Crea tu primera promoción</Link>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pre-Cualificaciones Recientes */}
      <PreQualificationsSection />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Leads Recientes */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Mis Leads Recientes</h2>
            <Link
              href="/leads"
              className="text-primary-600 hover:text-primary-700 text-sm"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {safeData.recentLeads.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay leads</p>
            ) : (
              safeData.recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="block p-3 border rounded hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-gray-500">{lead.source}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        lead.status === 'new'
                          ? 'bg-blue-100 text-blue-700'
                          : lead.status === 'qualified'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Citas Próximas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Citas Próximas</h2>
            <Link
              href="/appointments"
              className="text-primary-600 hover:text-primary-700 text-sm"
            >
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {safeData.upcomingAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay citas</p>
            ) : (
              safeData.upcomingAppointments.map((apt) => (
                <Link
                  key={apt.id}
                  href={`/appointments`}
                  className="block p-3 border rounded hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{apt.leadName}</p>
                      <p className="text-sm text-gray-500">
                        {(() => {
                          const date = apt.scheduledAt instanceof Date 
                            ? apt.scheduledAt 
                            : (apt.scheduledAt as any)?.toDate?.() || new Date(apt.scheduledAt);
                          return date.toLocaleString();
                        })()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                        {apt.type}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        apt.status === 'confirmed' 
                          ? 'bg-green-100 text-green-700'
                          : apt.status === 'scheduled'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ventas Recientes */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Mis Ventas Recientes</h2>
          <Link
            href="/sales"
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            Ver todas
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {safeData.recentSales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No hay ventas recientes
                  </td>
                </tr>
              ) : (
                safeData.recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{sale.vehicle}</td>
                    <td className="px-6 py-4">{sale.customerName}</td>
                    <td className="px-6 py-4 font-medium">
                      ${sale.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {(() => {
                        const date = sale.createdAt instanceof Date 
                          ? sale.createdAt 
                          : (sale.createdAt as any)?.toDate?.() || new Date(sale.createdAt);
                        return date.toLocaleDateString();
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/leads"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">👥</div>
          <p className="font-medium">Mis Leads</p>
        </Link>
        <Link
          href="/inventory"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">🚗</div>
          <p className="font-medium">Inventario</p>
        </Link>
        <Link
          href="/appointments"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">📅</div>
          <p className="font-medium">Citas</p>
        </Link>
        <Link
          href="/messages"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">💬</div>
          <p className="font-medium">Mensajes</p>
        </Link>
        <Link
          href="/internal-chat"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">💬</div>
          <p className="font-medium">Chat Interno</p>
        </Link>
        <Link
          href="/sales-statistics"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">📊</div>
          <p className="font-medium">Estadísticas</p>
        </Link>
        <Link
          href="/reports"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">📈</div>
          <p className="font-medium">Reportes</p>
        </Link>
        <Link
          href="/campaigns"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">📢</div>
          <p className="font-medium">Campañas</p>
        </Link>
        <Link
          href="/promotions"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">🎁</div>
          <p className="font-medium">Promociones</p>
        </Link>
        <Link
          href="/banners"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">🎨</div>
          <p className="font-medium">Banners Premium</p>
        </Link>
        <Link
          href="/settings/profile"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">⚙️</div>
          <p className="font-medium">Configuración</p>
        </Link>
      </div>
    </div>
  );
}

// Componente de Pre-Cualificaciones
function PreQualificationsSection() {
  const [preQualifications, setPreQualifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreQualifications();
  }, []);

  async function fetchPreQualifications() {
    try {
      const response = await fetch('/api/pre-qualifications?limit=5');
      if (response.ok) {
        const data = await response.json();
        setPreQualifications(data.preQualifications || []);
      }
    } catch (error) {
      console.error('Error fetching pre-qualifications:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pre_approved':
        return 'bg-green-100 text-green-700';
      case 'partially_approved':
        return 'bg-yellow-100 text-yellow-700';
      case 'manual_review':
        return 'bg-blue-100 text-blue-700';
      case 'not_qualified':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'pre_approved':
        return 'Pre-Aprobado';
      case 'partially_approved':
        return 'Parcial';
      case 'manual_review':
        return 'Revisión';
      case 'not_qualified':
        return 'No Califica';
      default:
        return status;
    }
  }

  if (loading) {
    return null;
  }

  if (preQualifications.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Pre-Cualificaciones Recientes</h2>
        <Link
          href="/leads?status=pre_qualified"
          className="text-primary-600 hover:text-primary-700 text-sm"
        >
          Ver todas
        </Link>
      </div>
      <div className="space-y-3">
        {preQualifications.map((pq) => (
          <Link
            key={pq.id}
            href={`/leads/${pq.leadId || '#'}`}
            className="block p-4 border rounded hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <p className="font-medium">{pq.contact.name}</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(pq.result.status)}`}>
                    {getStatusLabel(pq.result.status)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Score: {pq.result.score}/100
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {pq.result.approvedAmount && (
                    <span className="font-semibold text-green-600">
                      ${pq.result.approvedAmount.toLocaleString()} aprobados
                    </span>
                  )}
                  <span>{pq.contact.phone}</span>
                  <span>{(() => {
                    const date = pq.createdAt instanceof Date 
                      ? pq.createdAt 
                      : (pq.createdAt as any)?.toDate?.() || new Date(pq.createdAt);
                    return date.toLocaleDateString();
                  })()}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}



