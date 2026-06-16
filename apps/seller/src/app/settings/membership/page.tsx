'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRealtimeMemberships } from '@/hooks/useRealtimeMemberships';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { DealerManagedMembershipPanel } from '@/components/DealerManagedMembershipPanel';
import { MembershipOnboardingNotice } from '@autodealers/shared/client';

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
  const [userLoading, setUserLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [currentMembership, setCurrentMembership] = useState<Membership | null>(null);
  const [changing, setChanging] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  // Hooks de tiempo real
  const { memberships: availableMemberships, loading: membershipsLoading, emptyReason: membershipsEmptyReason } = useRealtimeMemberships('seller');
  const { subscription, loading: subscriptionLoading } = useRealtimeSubscription(tenantId);

  // Obtener tenantId del usuario
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setTenantId(data.user?.tenantId);
        }
      } catch (error) {
        console.error('Error obteniendo usuario:', error);
      } finally {
        setUserLoading(false);
      }
    }
    fetchUser();
  }, []);

  // Obtener membresía actual basada en la suscripción
  useEffect(() => {
    if (subscription?.membershipId && availableMemberships.length > 0) {
      const membership = availableMemberships.find(m => m.id === subscription.membershipId);
      setCurrentMembership(membership || null);
    } else {
      setCurrentMembership(null);
    }
  }, [subscription, availableMemberships]);

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
        // Membership data will be updated automatically via realtime hooks
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

    if (!subscription || !subscription.stripeCustomerId || !subscription.stripeSubscriptionId) {
      window.location.href = `/settings/membership/payment?membershipId=${newMembershipId}`;
      return;
    }

    setChanging(true);
    try {
      // Asegurar que el token esté fresco antes de hacer la petición
      const { ensureFreshToken } = await import('@/lib/token-refresh');
      await ensureFreshToken();
      
      const response = await fetch('/api/settings/membership/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId: newMembershipId }),
        credentials: 'include',
      });

      if (response.ok) {
        alert(`✅ Membresía ${action === 'cambiar' ? 'cambiada' : 'seleccionada'} exitosamente. El sistema se actualizará automáticamente.`);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
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

  if (userLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user?.dealerId) {
    return (
      <Suspense
        fallback={
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        }
      >
        <DealerManagedMembershipPanel tenantId={tenantId} dealerId={user.dealerId} />
      </Suspense>
    );
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
      <MembershipOnboardingNotice
        accountLabel="cuenta"
        createdByAdmin={user?.createdByAdmin === true}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Membresía</h1>
        <p className="text-gray-600">
          Gestiona tu membresía y cambia de plan cuando lo necesites
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
              href="/settings/profile"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Perfil
            </Link>
            <Link
              href="/settings/website"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Página Web
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
        
        {currentMembership && subscription ? (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{currentMembership.name}</h3>
                <p className="text-gray-600">
                  {currentMembership.billingCycle === 'monthly' ? 'Mensual' : 'Anual'}
                  {' • '}
                  {currentMembership.currency === 'USD' ? '$' : currentMembership.currency}
                  {currentMembership.price.toLocaleString()}
                  {currentMembership.billingCycle === 'monthly' ? '/mes' : '/año'}
                </p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                {getStatusLabel(subscription.status)}
              </span>
            </div>

            {subscription.statusReason && (
              <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <p className="text-sm text-primary-800">
                  <strong>Motivo del estado:</strong> {subscription.statusReason}
                </p>
              </div>
            )}

            {subscription.daysPastDue && subscription.daysPastDue > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Atención:</strong> Tu pago está {subscription.daysPastDue} días atrasado
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-600">Período Actual</p>
                <p className="font-medium">
                  {(() => {
                    let date: Date;
                    if (subscription.currentPeriodStart instanceof Date) {
                      date = subscription.currentPeriodStart;
                    } else if (subscription.currentPeriodStart && typeof subscription.currentPeriodStart === 'object' && 'toDate' in subscription.currentPeriodStart) {
                      date = (subscription.currentPeriodStart as any).toDate();
                    } else {
                      date = new Date(subscription.currentPeriodStart as string | number);
                    }
                    return date.toLocaleDateString();
                  })()} -{' '}
                      {(() => {
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
              {subscription.cancelAtPeriodEnd && (
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <p className="font-medium text-orange-600">
                    Se cancelará al final del período
                  </p>
                </div>
              )}
            </div>

            {/* Botón de Cancelación */}
            {subscription.status !== 'cancelled' && !subscription.cancelAtPeriodEnd && (
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
            
            {subscription.cancelAtPeriodEnd && (
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
            {(currentMembership.features.maxInventory !== undefined || 
              currentMembership.features.maxStorageGB !== undefined || 
              currentMembership.features.maxSellers !== undefined) && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-3">📊 Límites:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentMembership.features.maxSellers !== undefined && (
                    <div className="text-sm">
                      <span className="text-gray-600">👥</span>{' '}
                      <span className="font-medium">
                        {currentMembership.features.maxSellers === null
                          ? '∞ Vendedores'
                          : `${currentMembership.features.maxSellers} Vendedores`}
                      </span>
                    </div>
                  )}
                  {currentMembership.features.maxInventory !== undefined && (
                    <div className="text-sm">
                      <span className="text-gray-600">🚗</span>{' '}
                      <span className="font-medium">
                        {currentMembership.features.maxInventory === null
                          ? '∞ Vehículos'
                          : `${currentMembership.features.maxInventory} Vehículos`}
                      </span>
                    </div>
                  )}
                  {currentMembership.features.maxStorageGB !== undefined && (
                    <div className="text-sm">
                      <span className="text-gray-600">💾</span>{' '}
                      <span className="font-medium">
                        {currentMembership.features.maxStorageGB === null
                          ? '∞ Almacenamiento'
                          : `${currentMembership.features.maxStorageGB} GB Almacenamiento`}
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
                {currentMembership.features.publicWebsite && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Página Web con Subdominio
                  </div>
                )}
                {currentMembership.features.crmAdvanced && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> CRM Completo
                  </div>
                )}
                {currentMembership.features.socialMediaEnabled && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Publicaciones en Redes Sociales
                  </div>
                )}
                {currentMembership.features.videoUploads && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Subida de Videos
                  </div>
                )}
                {currentMembership.features.liveChat && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Chat en Vivo
                  </div>
                )}
                {currentMembership.features.appointmentScheduling && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Sistema de Citas
                  </div>
                )}
                {currentMembership.features.customTemplates && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Templates Personalizados
                  </div>
                )}
                {currentMembership.features.customBranding && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Branding Personalizado
                  </div>
                )}
                {currentMembership.features.socialMediaScheduling && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Campañas Ilimitadas en Redes Sociales
                  </div>
                )}
                {currentMembership.features.aiEnabled && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> IA Habilitada
                  </div>
                )}
                {currentMembership.features.advancedReports && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Reportes Avanzados
                  </div>
                )}
                {currentMembership.features.customSubdomain && (
                  <div className="text-sm">
                    <span className="text-green-600">✓</span> Subdominio Personalizado
                  </div>
                )}
              </div>
              {(currentMembership.features.maxInventory === null && 
                currentMembership.features.maxStorageGB === null) && (
                <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <p className="text-sm text-primary-800 font-medium">
                    🎉 Todo Ilimitado - Sin Restricciones
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <span className="text-3xl">📋</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary-900 mb-2">
                  No tienes una membresía activa
                </h3>
                <p className="text-primary-700 mb-4">
                  Selecciona un plan de membresía para comenzar a usar todas las funcionalidades de la plataforma.
                </p>
                <p className="text-sm text-primary-600">
                  Puedes elegir entre los planes disponibles a continuación. Una vez seleccionado, podrás gestionar tu membresía desde aquí.
                </p>
              </div>
            </div>
          </div>
        )}
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
                  <div className="mt-2 p-2 bg-primary-50 border border-primary-200 rounded">
                    <p className="text-xs text-primary-800 font-medium">
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

        {availableMemberships.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">{membershipsEmptyReason || 'No hay membresías disponibles'}</p>
          </div>
        )}
      </div>
    </div>
  );
}



