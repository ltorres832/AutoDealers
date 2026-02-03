'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRealtimeMemberships } from '@/hooks/useRealtimeMemberships';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface Membership {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: any;
  stripePriceId: string;
  isActive: boolean;
}

interface Subscription {
  id: string;
  tenantId: string;
  membershipId: string;
  status: 'active' | 'past_due' | 'cancelled' | 'suspended' | 'trialing' | 'unpaid';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  daysPastDue?: number;
  statusReason?: string;
}

export default function MembershipPage() {
  const [user, setUser] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [currentMembership, setCurrentMembership] = useState<Membership | null>(null);
  const [changing, setChanging] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const [isMultiDealer, setIsMultiDealer] = useState<boolean | null>(null);
  const { subscription, loading: subscriptionLoading } = useRealtimeSubscription(tenantId);
  const [availableMemberships, setAvailableMemberships] = useState<Membership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(true);

  // Obtener tenantId del usuario y determinar si es multi-dealer
  useEffect(() => {
    async function fetchUser() {
      try {
        const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
        const response = await fetchWithAuth('/api/user', {});
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setTenantId(data.user?.tenantId);
        }
      } catch (error) {
        console.error('Error obteniendo usuario:', error);
      }
    }
    fetchUser();
  }, []);

  // Determinar si es multi-dealer basado en la membresía actual
  useEffect(() => {
    async function checkMultiDealer() {
      if (subscription?.membershipId) {
        try {
          const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
          const response = await fetchWithAuth('/api/settings/membership', {});
          if (response.ok) {
            const data = await response.json();
            const isMulti = data.membership?.features?.multiDealerEnabled === true;
            setIsMultiDealer(isMulti);
          }
        } catch (error) {
          console.error('Error verificando tipo de membresía:', error);
        }
      } else {
        // Si no tiene membresía, asumir que es dealer regular
        setIsMultiDealer(false);
      }
    }
    
    if (subscription) {
      checkMultiDealer();
    } else if (!subscriptionLoading) {
      // Si no hay suscripción, asumir dealer regular
      setIsMultiDealer(false);
    }
  }, [subscription, subscriptionLoading]);

  // Cargar membresías desde el API (ya filtradas según tipo de cuenta)
  useEffect(() => {
    async function fetchMemberships() {
      if (isMultiDealer === null) {
        // Esperar a determinar el tipo de cuenta
        return;
      }

      setMembershipsLoading(true);
      try {
        const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
        const response = await fetchWithAuth('/api/settings/membership/available', {});
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ [MEMBERSHIP PAGE] Membresías obtenidas:', data.memberships?.length || 0);
          
          if (data.memberships && Array.isArray(data.memberships)) {
            setAvailableMemberships(data.memberships);
          } else {
            console.warn('⚠️ [MEMBERSHIP PAGE] Respuesta no contiene array de membresías');
            setAvailableMemberships([]);
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ [MEMBERSHIP PAGE] Error en respuesta:', response.status, errorData);
          setAvailableMemberships([]);
        }
      } catch (error: any) {
        console.error('❌ [MEMBERSHIP PAGE] Error obteniendo membresías desde API:', error);
        console.error('❌ [MEMBERSHIP PAGE] Error details:', error.message, error.stack);
        setAvailableMemberships([]);
      } finally {
        setMembershipsLoading(false);
      }
    }
    
    fetchMemberships();
  }, [isMultiDealer]);

  // Obtener membresía actual directamente desde el API (no depende de availableMemberships)
  // CRÍTICO: Verificar TANTO subscription.membershipId COMO user.membershipId
  useEffect(() => {
    async function fetchCurrentMembership() {
      // Obtener membershipId de la suscripción O del usuario directamente
      const membershipIdToUse = subscription?.membershipId || user?.membershipId;
      
      if (membershipIdToUse) {
        try {
          console.log('🔍 [MEMBERSHIP PAGE] Obteniendo membresía actual para membershipId:', membershipIdToUse);
          console.log('🔍 [MEMBERSHIP PAGE] Fuente:', subscription?.membershipId ? 'subscription' : 'user');
          
          const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
          
          // Intentar obtener desde el API de membresía
          const response = await fetchWithAuth('/api/settings/membership', {});
          if (response.ok) {
            const data = await response.json();
            console.log('✅ [MEMBERSHIP PAGE] Membresía actual obtenida desde API:', {
              id: data.membership?.id,
              name: data.membership?.name,
            });
            if (data.membership) {
              setCurrentMembership(data.membership);
              return;
            }
          } else if (response.status === 404) {
            // Si no hay suscripción pero el usuario tiene membershipId, buscar en availableMemberships
            console.log('⚠️ [MEMBERSHIP PAGE] No hay suscripción, pero usuario tiene membershipId. Buscando en availableMemberships...');
            // No intentar importar getMembershipById del servidor - usar solo API o availableMemberships
          }
          
          // Fallback: buscar en availableMemberships
          if (availableMemberships.length > 0) {
            const membership = availableMemberships.find(m => m.id === membershipIdToUse);
            if (membership) {
              console.log('✅ [MEMBERSHIP PAGE] Membresía encontrada en availableMemberships');
              setCurrentMembership(membership);
              return;
            }
          }
          
          console.warn('⚠️ [MEMBERSHIP PAGE] No se encontró membresía con ID:', membershipIdToUse);
          setCurrentMembership(null);
        } catch (error) {
          console.error('❌ [MEMBERSHIP PAGE] Error obteniendo membresía actual:', error);
          // Fallback: buscar en availableMemberships
          if (availableMemberships.length > 0 && membershipIdToUse) {
            const membership = availableMemberships.find(m => m.id === membershipIdToUse);
            setCurrentMembership(membership || null);
          } else {
            setCurrentMembership(null);
          }
        }
      } else {
        console.log('⚠️ [MEMBERSHIP PAGE] No hay membershipId en subscription ni en user');
        console.log('⚠️ [MEMBERSHIP PAGE] subscription:', subscription);
        console.log('⚠️ [MEMBERSHIP PAGE] user:', user);
        setCurrentMembership(null);
      }
    }
    
    fetchCurrentMembership();
  }, [subscription?.membershipId, user?.membershipId, availableMemberships]);

  const loading = membershipsLoading || subscriptionLoading;

  async function handleCancelMembership() {
    if (!confirm('¿Estás seguro de que quieres cancelar tu membresía? Se cancelará al final del período actual y podrás seguir usando el servicio hasta entonces.')) {
      return;
    }

    setCancelling(true);
    try {
      const response = await fetch('/api/settings/membership/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately: false }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Tu membresía se cancelará al final del período actual.');
        // Los hooks de tiempo real actualizarán automáticamente
      } else {
        const error = await response.json();
        alert(error.message || error.error || 'Error al cancelar membresía');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error al cancelar membresía');
    } finally {
      setCancelling(false);
    }
  }

  async function handleReactivateMembership() {
    if (!confirm('¿Estás seguro de que quieres reactivar tu membresía?')) {
      return;
    }

    setReactivating(true);
    try {
      const response = await fetch('/api/settings/membership/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately: false, reactivate: true }),
      });

      if (response.ok) {
        alert('Tu membresía ha sido reactivada exitosamente.');
        // Los hooks de tiempo real actualizarán automáticamente
      } else {
        const error = await response.json();
        alert(error.message || error.error || 'Error al reactivar membresía');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error al reactivar membresía');
    } finally {
      setReactivating(false);
    }
  }

  async function handleChangeMembership(newMembershipId: string) {
    const selectedMembership = availableMemberships.find(m => m.id === newMembershipId);
    const action = currentMembership ? 'cambiar' : 'seleccionar';
    const message = currentMembership 
      ? `¿Estás seguro de que quieres cambiar de "${currentMembership.name}" a "${selectedMembership?.name}"?`
      : `¿Estás seguro de que quieres seleccionar el plan "${selectedMembership?.name}" por $${selectedMembership?.price}/${selectedMembership?.billingCycle}?`;
    
    if (!confirm(message)) {
      return;
    }

    // Si no hay suscripción activa o no tiene método de pago, redirigir directamente a la página de pago
    if (!subscription || !subscription.stripeCustomerId || !subscription.stripeSubscriptionId) {
      window.location.href = `/settings/membership/payment?membershipId=${newMembershipId}`;
      return;
    }

    setChanging(true);
    try {
      const response = await fetch('/api/settings/membership/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId: newMembershipId }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Membresía ${action === 'cambiar' ? 'cambiada' : 'seleccionada'} exitosamente. El sistema se actualizará automáticamente.`);
        // Los hooks de tiempo real actualizarán automáticamente
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const error = await response.json();
        alert(error.message || error.error || `Error al ${action} membresía`);
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error al ${action} membresía: ${error.message || 'Error desconocido'}`);
    } finally {
      setChanging(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'bg-green-100 text-green-700';
      case 'past_due':
      case 'unpaid':
        return 'bg-yellow-100 text-yellow-700';
      case 'suspended':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
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

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración</h1>
        <p className="text-gray-600">
          Personaliza tu dashboard y conecta tus redes sociales
        </p>
        
        {/* Settings Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <Link
              href="/settings/branding"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Branding
            </Link>
            <Link
              href="/settings/integrations"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Integraciones
            </Link>
            <Link
              href="/settings/templates"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Templates
            </Link>
            <Link
              href="/settings/membership"
              className="border-b-2 border-primary-500 py-4 px-1 text-sm font-medium text-primary-600"
            >
              Membresía
            </Link>
          </nav>
        </div>
      </div>

      {/* Gestión de Métodos de Pago - Siempre visible */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Métodos de Pago</h2>
          <p className="text-gray-600 mb-4">
            Gestiona tus métodos de pago para tus suscripciones y pagos recurrentes.
          </p>
          <Link
            href="/settings/membership/payment-methods"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
          >
            💳 Gestionar Métodos de Pago
          </Link>
        </div>
      </div>

      {/* Estado Actual */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Membresía Actual</h2>
        
        {/* Mostrar membresía si existe, incluso sin suscripción */}
        {(() => {
          // Obtener membresía actual: primero currentMembership, luego buscar por user.membershipId
          const membershipToShow = currentMembership || 
            (user?.membershipId ? availableMemberships.find(m => m.id === user.membershipId) : null);
          
          if (!membershipToShow) {
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">📋</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      No tienes una membresía activa
                    </h3>
                    <p className="text-blue-700 mb-4">
                      Selecciona un plan de membresía para comenzar a usar todas las funcionalidades de la plataforma.
                    </p>
                    <p className="text-sm text-blue-600 mb-4">
                      Puedes elegir entre los planes disponibles a continuación. Una vez seleccionado, podrás gestionar tu membresía desde aquí.
                    </p>
                    {user?.status === 'active' && !user?.membershipId && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 mb-2">
                          <strong>¿Ya pagaste tu membresía?</strong> Si acabas de pagar, el sistema puede tardar unos segundos en activarla.
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
                              const response = await fetchWithAuth('/api/admin/fix-my-membership', {
                                method: 'POST',
                              });
                              const data = await response.json();
                              if (response.ok) {
                                alert('✅ Membresía activada correctamente. Recarga la página.');
                                window.location.reload();
                              } else {
                                alert('No se encontró un pago reciente. Si ya pagaste, espera unos segundos y vuelve a intentar.');
                              }
                            } catch (error) {
                              console.error('Error:', error);
                              alert('Error al verificar el pago. Por favor, contacta a soporte.');
                            }
                          }}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium text-sm"
                        >
                          🔄 Verificar Pago Reciente
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          
          return (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{membershipToShow.name}</h3>
                <p className="text-gray-600">
                  {membershipToShow.billingCycle === 'monthly' ? 'Mensual' : 'Anual'}
                  {' • '}
                  {membershipToShow.currency === 'USD' ? '$' : membershipToShow.currency}
                  {membershipToShow.price.toLocaleString()}
                  {membershipToShow.billingCycle === 'monthly' ? '/mes' : '/año'}
                </p>
              </div>
              {subscription ? (
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                  {getStatusLabel(subscription.status)}
                </span>
              ) : (
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  Activa
                </span>
              )}
            </div>

            {subscription?.statusReason && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Motivo del estado:</strong> {subscription.statusReason}
                </p>
              </div>
            )}

            {subscription?.daysPastDue && subscription.daysPastDue > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Atención:</strong> Tu pago está {subscription.daysPastDue} días atrasado
                </p>
              </div>
            )}

            {subscription && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-600">Período Actual</p>
                  <p className="font-medium">
                    {(() => {
                      const start = typeof subscription.currentPeriodStart === 'string' 
                        ? subscription.currentPeriodStart 
                        : subscription.currentPeriodStart instanceof Date
                        ? subscription.currentPeriodStart.toISOString()
                        : (subscription.currentPeriodStart as any)?.toDate?.()?.toISOString() || subscription.currentPeriodStart;
                      return new Date(start).toLocaleDateString();
                    })()} -{' '}
                    {(() => {
                      const end = typeof subscription.currentPeriodEnd === 'string' 
                        ? subscription.currentPeriodEnd 
                        : subscription.currentPeriodEnd instanceof Date
                        ? subscription.currentPeriodEnd.toISOString()
                        : (subscription.currentPeriodEnd as any)?.toDate?.()?.toISOString() || subscription.currentPeriodEnd;
                      return new Date(end).toLocaleDateString();
                    })()}
                  </p>
                </div>
                {subscription.cancelAtPeriodEnd && (
                  <div>
                    <p className="text-sm text-gray-600">Estado</p>
                    <p className="font-medium text-orange-600">
                      Se cancelará al final del período
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Botón de Cancelación - Solo si hay suscripción */}
            {subscription && subscription.status !== 'cancelled' && !subscription.cancelAtPeriodEnd && (
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={handleCancelMembership}
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling ? 'Cancelando...' : 'Cancelar Membresía'}
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Tu membresía se cancelará al final del período actual. Podrás seguir usando el servicio hasta entonces.
                </p>
              </div>
            )}
            
            {subscription?.cancelAtPeriodEnd && (
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={handleReactivateMembership}
                  disabled={reactivating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reactivating ? 'Reactivando...' : 'Reactivar Membresía'}
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Tu membresía está programada para cancelarse. Puedes reactivarla para continuar usando el servicio.
                </p>
              </div>
            )}

            {/* Límites */}
            {(membershipToShow.features.maxInventory !== undefined || 
              membershipToShow.features.maxStorageGB !== undefined || 
              membershipToShow.features.maxSellers !== undefined) && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-3">📊 Límites:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {membershipToShow.features.maxSellers !== undefined && (
                    <div className="text-sm">
                      <span className="text-gray-600">👥</span>{' '}
                      <span className="font-medium">
                        {membershipToShow.features.maxSellers === null
                          ? '∞ Vendedores'
                          : `${membershipToShow.features.maxSellers} Vendedores`}
                      </span>
                    </div>
                  )}
                  {membershipToShow.features.maxInventory !== undefined && (
                    <div className="text-sm">
                      <span className="text-gray-600">🚗</span>{' '}
                      <span className="font-medium">
                        {membershipToShow.features.maxInventory === null
                          ? '∞ Vehículos'
                          : `${membershipToShow.features.maxInventory} Vehículos`}
                      </span>
                    </div>
                  )}
                  {membershipToShow.features.maxStorageGB !== undefined && (
                    <div className="text-sm">
                      <span className="text-gray-600">💾</span>{' '}
                      <span className="font-medium">
                        {membershipToShow.features.maxStorageGB === null
                          ? '∞ Almacenamiento'
                          : `${membershipToShow.features.maxStorageGB} GB Almacenamiento`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Features */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-3">✅ Incluye:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {membershipToShow.features.publicWebsite && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Página Web con Subdominio
                  </div>
                )}
                {membershipToShow.features.crmAdvanced && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> CRM Completo
                  </div>
                )}
                {membershipToShow.features.socialMediaEnabled && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Publicaciones en Redes Sociales
                  </div>
                )}
                {membershipToShow.features.videoUploads && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Subida de Videos
                  </div>
                )}
                {membershipToShow.features.liveChat && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Chat en Vivo
                  </div>
                )}
                {membershipToShow.features.appointmentScheduling && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Sistema de Citas
                  </div>
                )}
                {membershipToShow.features.customTemplates && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Templates Personalizados
                  </div>
                )}
                {membershipToShow.features.customBranding && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Branding Personalizado
                  </div>
                )}
                {membershipToShow.features.socialMediaScheduling && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Campañas Ilimitadas en Redes Sociales
                  </div>
                )}
                {membershipToShow.features.aiEnabled && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> IA Habilitada
                  </div>
                )}
                {membershipToShow.features.advancedReports && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Reportes Avanzados
                  </div>
                )}
                {membershipToShow.features.customSubdomain && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Subdominio Personalizado
                  </div>
                )}
              </div>
              {(membershipToShow.features.maxInventory === null && 
                membershipToShow.features.maxStorageGB === null) && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800 font-medium">
                    🎉 Todo Ilimitado - Sin Restricciones
                  </p>
                </div>
              )}
            </div>
          </div>
          );
        })()}
      </div>

      {/* Cambiar Membresía */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cambiar Membresía</h2>
        <p className="text-gray-600 mb-6">
          Selecciona una nueva membresía. Los cambios se aplicarán inmediatamente.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableMemberships.map((membership) => (
            <div
              key={membership.id}
              className={`bg-white rounded-lg shadow border-2 p-6 ${
                currentMembership?.id === membership.id
                  ? 'border-primary-500'
                  : 'border-gray-200'
              }`}
            >
              <div className="mb-4">
                <h3 className="text-xl font-semibold mb-2">{membership.name}</h3>
                <div className="text-2xl font-bold text-primary-600">
                  {membership.currency === 'USD' ? '$' : membership.currency}
                  {membership.price.toLocaleString()}
                  <span className="text-sm font-normal text-gray-600">
                    /{membership.billingCycle === 'monthly' ? 'mes' : 'año'}
                  </span>
                </div>
              </div>

              {/* Límites */}
              {(membership.features.maxInventory !== undefined || 
                membership.features.maxStorageGB !== undefined || 
                membership.features.maxSellers !== undefined) && (
                <div className="mb-4">
                  <h5 className="text-sm font-semibold mb-2">📊 Límites:</h5>
                  <div className="space-y-1">
                    {membership.features.maxSellers !== undefined && (
                      <div className="text-sm">
                        <span className="text-gray-600">👥</span>{' '}
                        <span className="font-medium">
                          {membership.features.maxSellers === null
                            ? '∞ Vendedores'
                            : `${membership.features.maxSellers} Vendedores`}
                        </span>
                      </div>
                    )}
                    {membership.features.maxInventory !== undefined && (
                      <div className="text-sm">
                        <span className="text-gray-600">🚗</span>{' '}
                        <span className="font-medium">
                          {membership.features.maxInventory === null
                            ? '∞ Vehículos'
                            : `${membership.features.maxInventory} Vehículos`}
                        </span>
                      </div>
                    )}
                    {membership.features.maxStorageGB !== undefined && (
                      <div className="text-sm">
                        <span className="text-gray-600">💾</span>{' '}
                        <span className="font-medium">
                          {membership.features.maxStorageGB === null
                            ? '∞ Almacenamiento'
                            : `${membership.features.maxStorageGB} GB Almacenamiento`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="mb-4">
                <h5 className="text-sm font-semibold mb-2">✅ Incluye:</h5>
                <div className="space-y-1">
                  {membership.features.publicWebsite && (
                    <div className="text-sm text-green-600">✓ Página Web con Subdominio</div>
                  )}
                  {membership.features.crmAdvanced && (
                    <div className="text-sm text-green-600">✓ CRM Completo</div>
                  )}
                  {membership.features.socialMediaEnabled && (
                    <div className="text-sm text-green-600">✓ Publicaciones en Redes Sociales</div>
                  )}
                  {membership.features.videoUploads && (
                    <div className="text-sm text-green-600">✓ Subida de Videos</div>
                  )}
                  {membership.features.liveChat && (
                    <div className="text-sm text-green-600">✓ Chat en Vivo</div>
                  )}
                  {membership.features.appointmentScheduling && (
                    <div className="text-sm text-green-600">✓ Sistema de Citas</div>
                  )}
                  {membership.features.customTemplates && (
                    <div className="text-sm text-green-600">✓ Templates Personalizados</div>
                  )}
                  {membership.features.customBranding && (
                    <div className="text-sm text-green-600">✓ Branding Personalizado</div>
                  )}
                  {membership.features.socialMediaScheduling && (
                    <div className="text-sm text-green-600">✓ Campañas Ilimitadas en Redes Sociales</div>
                  )}
                  {membership.features.aiEnabled && (
                    <div className="text-sm text-green-600">✓ IA Habilitada</div>
                  )}
                  {membership.features.advancedReports && (
                    <div className="text-sm text-green-600">✓ Reportes Avanzados</div>
                  )}
                  {membership.features.customSubdomain && (
                    <div className="text-sm text-green-600">✓ Subdominio Personalizado</div>
                  )}
                </div>
                {(membership.features.maxInventory === null && 
                  membership.features.maxStorageGB === null) && (
                  <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded">
                    <p className="text-xs text-purple-800 font-medium">
                      🎉 Todo Ilimitado - Sin Restricciones
                    </p>
                  </div>
                )}
              </div>

              {currentMembership?.id === membership.id ? (
                <button
                  disabled
                  className="w-full px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-medium cursor-not-allowed"
                >
                  Membresía Actual
                </button>
              ) : (
                <button
                  onClick={() => handleChangeMembership(membership.id)}
                  disabled={changing}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
                >
                  {changing 
                    ? 'Procesando...' 
                    : currentMembership 
                      ? 'Cambiar a esta membresía' 
                      : 'Seleccionar esta membresía'}
                </button>
              )}
            </div>
          ))}
        </div>

        {availableMemberships.length === 0 && !membershipsLoading && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">No hay membresías disponibles</p>
            <button
              onClick={async () => {
                try {
                  const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
                  const response = await fetchWithAuth('/api/settings/membership/available', {});
                  if (response.ok) {
                    const data = await response.json();
                    if (data.memberships && data.memberships.length > 0) {
                      setAvailableMemberships(data.memberships);
                    } else {
                      alert('No se encontraron membresías. Por favor, contacta al administrador.');
                    }
                  }
                } catch (error) {
                  console.error('Error:', error);
                  alert('Error al cargar membresías. Por favor, recarga la página.');
                }
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              Recargar Membresías
            </button>
          </div>
        )}
        
        {membershipsLoading && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando membresías...</p>
          </div>
        )}
      </div>
    </div>
  );
}



