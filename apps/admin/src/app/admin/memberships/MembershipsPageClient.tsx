'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { useRealtimeMemberships, type RealtimeMembership } from '@/hooks/useRealtimeMemberships';
import { RealtimeIndicator } from '@/components/RealtimeIndicator';
import CreateMembershipModal from '@/components/CreateMembershipModal';
import ErrorModal from '@/components/ErrorModal';
import MembershipCard from '@/components/MembershipCard';

import type { AdminMembershipRow } from '@/lib/load-admin-memberships';

interface Membership {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  stripePriceId?: string;
  features: {
    maxSellers?: number | null;
    maxInventory?: number | null;
    maxCampaigns?: number | null;
    maxPromotions?: number | null;
    maxLeadsPerMonth?: number | null;
    maxAppointmentsPerMonth?: number | null;
    maxStorageGB?: number | null;
    maxApiCallsPerMonth?: number | null;
    customSubdomain?: boolean;
    customDomain?: boolean;
    aiEnabled?: boolean;
    aiAutoResponses?: boolean;
    aiContentGeneration?: boolean;
    aiLeadClassification?: boolean;
    socialMediaEnabled?: boolean;
    socialMediaScheduling?: boolean;
    socialMediaAnalytics?: boolean;
    marketplaceEnabled?: boolean;
    marketplaceFeatured?: boolean;
    advancedReports?: boolean;
    customReports?: boolean;
    exportData?: boolean;
    whiteLabel?: boolean;
    apiAccess?: boolean;
    webhooks?: boolean;
    ssoEnabled?: boolean;
    multiLanguage?: boolean;
    customTemplates?: boolean;
    emailMarketing?: boolean;
    smsMarketing?: boolean;
    whatsappMarketing?: boolean;
    videoUploads?: boolean;
    virtualTours?: boolean;
    liveChat?: boolean;
    appointmentScheduling?: boolean;
    paymentProcessing?: boolean;
    inventorySync?: boolean;
    crmAdvanced?: boolean;
    leadScoring?: boolean;
    automationWorkflows?: boolean;
    integrationsUnlimited?: boolean;
    prioritySupport?: boolean;
    dedicatedManager?: boolean;
    trainingSessions?: boolean;
    customBranding?: boolean;
    mobileApp?: boolean;
    offlineMode?: boolean;
    dataBackup?: boolean;
    complianceTools?: boolean;
    analyticsAdvanced?: boolean;
    aBTesting?: boolean;
    seoTools?: boolean;
    customIntegrations?: boolean;
    // Email corporativo
    corporateEmailEnabled?: boolean;
    maxCorporateEmails?: number | null;
    emailSignatureBasic?: boolean;
    emailSignatureAdvanced?: boolean;
    emailAliases?: boolean;
    multiDealerEnabled?: boolean;
    multipleDealers?: boolean;
  };
  isActive: boolean;
  tenantCount?: number;
}

type Props = {
  initialMemberships: AdminMembershipRow[];
  initialError?: string | null;
};

export default function MembershipsPageClient({
  initialMemberships,
  initialError = null,
}: Props) {
  const { memberships: realtimeMemberships, loading, error: realtimeError, refresh } =
    useRealtimeMemberships(initialMemberships as RealtimeMembership[]);
  const memberships = (
    realtimeMemberships.length > 0 ? realtimeMemberships : initialMemberships
  ) as Membership[];
  const displayError =
    realtimeError && memberships.length === 0
      ? realtimeError
      : initialError && memberships.length === 0
        ? initialError
        : null;
  const summaryDisplay = {
    total: memberships.length,
    dealers: memberships.filter((m) => m.type === 'dealer').length,
    sellers: memberships.filter((m) => m.type === 'seller').length,
    active: memberships.filter((m) => m.isActive).length,
    multiDealer: memberships.filter(
      (m) => m.type === 'dealer' && m.features?.multiDealerEnabled
    ).length,
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingDefaults, setCreatingDefaults] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    details: undefined,
  });

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  async function fetchMemberships() {
    addDebugLog('🔄 Recargando membresías desde API…');
    await refresh();
    addDebugLog('✅ Lista actualizada');
  }

  async function handleToggleActive(membershipId: string, currentStatus: boolean) {
    if (!confirm(`¿${currentStatus ? 'Desactivar' : 'Activar'} esta membresía?\n\n${currentStatus ? 'Los usuarios no podrán seleccionar este plan hasta que lo reactives.' : 'Los usuarios podrán seleccionar este plan.'}`)) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/admin/memberships/${membershipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        alert(`Membresía ${!currentStatus ? 'activada' : 'desactivada'} exitosamente`);
        fetchMemberships(); // Recargar la lista
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar estado');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar estado');
    }
  }

  async function createDefaultMemberships() {
    if (!confirm('¿Crear las 6 membresías por defecto (3 Dealers + 3 Sellers)?\n\nEsto creará/actualizará las membresías con features reales implementadas.')) {
      return;
    }

    setCreatingDefaults(true);
    try {
      console.log('🚀 Iniciando creación de membresías...');
      console.log('📍 URL:', '/api/admin/memberships/create-default');
      
      // Obtener token de todas las fuentes posibles
      const localToken = localStorage.getItem('authToken');
      const cookieToken = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('authToken='))
        ?.split('=')[1];
      
      const token = localToken || cookieToken;
      
      console.log('🔐 Verificando token...');
      console.log('   localStorage:', localToken ? `${localToken.substring(0, 30)}...` : 'NO ENCONTRADO');
      console.log('   cookie:', cookieToken ? `${cookieToken.substring(0, 30)}...` : 'NO ENCONTRADO');
      console.log('   token final:', token ? `${token.substring(0, 30)}...` : 'NO ENCONTRADO');
      
      if (!token) {
        throw new Error(
          'No se encontró token de autenticación.\n\n' +
          'Por favor:\n' +
          '1. Cierra sesión completamente\n' +
          '2. Vuelve a iniciar sesión\n' +
          '3. Intenta crear las membresías nuevamente\n\n' +
          'Si el problema persiste, verifica que las cookies estén habilitadas en tu navegador.'
        );
      }
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Siempre agregar el token
      };
      
      console.log('📤 Enviando petición con headers:', {
        'Content-Type': headers['Content-Type'],
        'Authorization': headers['Authorization'] ? 'Presente' : 'Ausente',
      });
      
      const response = await fetchWithAuth('/api/admin/memberships/create-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('📡 Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        let errorText = '';
        let errorData: { error?: string; details?: string } | null = null;
        
        try {
          errorText = await response.text();
          console.log('📄 Error text:', errorText);
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.log('⚠️ No se pudo parsear error como JSON');
          errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
        }
        
        let errorMessage = errorData?.error || errorData?.details || `Error ${response.status}: ${response.statusText}`;
        
        // Mensaje más específico para errores 401
        if (response.status === 401) {
          errorMessage = 'No autorizado. Tu sesión puede haber expirado.\n\n' +
            'Por favor:\n' +
            '1. Cierra sesión\n' +
            '2. Vuelve a iniciar sesión\n' +
            '3. Intenta nuevamente';
        }
        
        console.error('❌ Error de respuesta:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Datos recibidos:', data);

      if (data.success) {
        const message = `✅ Membresías creadas exitosamente!\n\n` +
          `Creadas: ${data.summary.created}\n` +
          `Actualizadas: ${data.summary.updated}\n` +
          `Stripe: ${data.summary.stripeCreated} productos creados\n` +
          (data.summary.errors > 0 ? `\n⚠️ Errores: ${data.summary.errors}` : '');
        alert(message);
        
        // Esperar un momento antes de recargar para asegurar que Firestore haya actualizado
        await new Promise((resolve) => setTimeout(resolve, 500));
        await refresh();
      } else {
        const errorMsg = `❌ Error: ${data.error || 'Error desconocido'}\n\nDetalles: ${data.details || 'Sin detalles disponibles'}`;
        console.error('❌ Error en respuesta:', errorMsg);
        alert(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Error creando membresías:', error);
      console.error('Stack:', error.stack);
      
      let errorMessage = error.message || 'Error desconocido';
      let errorDetails = error.stack || '';
      
      // Detectar errores comunes
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        errorMessage = 'No se pudo conectar con el servidor.';
        errorDetails = `Error: ${error.message}\n\nPosibles causas:\n` +
          `1. El servidor no está corriendo (verifica que npm run dev esté activo)\n` +
          `2. No estás autenticado (cierra sesión y vuelve a iniciar)\n` +
          `3. Problema de red o CORS\n\n` +
          `Stack trace:\n${error.stack || 'No disponible'}`;
      }
      
      // Mostrar modal de error en lugar de alert
      setErrorModal({
        isOpen: true,
        title: 'Error al Crear Membresías',
        message: errorMessage,
        details: errorDetails,
      });
    } finally {
      setCreatingDefaults(false);
    }
  }

  if (loading && memberships.length === 0) {
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
          <h1 className="text-3xl font-bold">Gestión de Membresías</h1>
          <p className="text-gray-600 mt-2 flex items-center gap-3 flex-wrap">
            Control total sobre todas las membresías y planes
            <RealtimeIndicator isActive={!loading} label="Sincronizado" />
          </p>
          <p className="text-sm text-gray-500 mt-2 max-w-3xl">
            Los planes <strong>multi-concesionario</strong> no son un tipo aparte: son planes{' '}
            <strong>Dealer</strong> con la opción <code className="text-xs bg-gray-100 px-1 rounded">multiDealerEnabled</code>{' '}
            (se listan aquí como dealer; en la tarjeta verás “Multi Dealer” si aplica).
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={createDefaultMemberships}
            disabled={creatingDefaults}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {creatingDefaults ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creando...</span>
              </>
            ) : (
              <>
                <span>🎯</span>
                <span>Crear Membresías por Defecto</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            + Crear Membresía
          </button>
        </div>
      </div>

      {/* Debug info - Siempre visible */}
      <div className="mb-4 space-y-2">
        <div className="p-3 bg-primary-50 border border-primary-200 rounded text-sm">
          <p className="font-semibold text-primary-900">📊 Estado Actual:</p>
          <p className="text-primary-700">Membresías cargadas: <strong>{summaryDisplay.total}</strong></p>
          <p className="text-primary-700">Dealers: <strong>{summaryDisplay.dealers}</strong></p>
          <p className="text-primary-700">Sellers: <strong>{summaryDisplay.sellers}</strong></p>
          <p className="text-primary-700">
            Dealer con red multi-concesionario: <strong>{summaryDisplay.multiDealer}</strong>
          </p>
          <p className="text-primary-700">Activas: <strong>{summaryDisplay.active}</strong></p>
          {displayError ? (
            <p className="text-red-700">Error al cargar: {displayError}</p>
          ) : null}
          {loading && <p className="text-primary-700">⏳ Cargando...</p>}
        </div>
        
        {debugInfo.length > 0 && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs max-h-40 overflow-y-auto">
            <p className="font-semibold text-gray-900 mb-2">🔍 Logs de Debug:</p>
            {debugInfo.map((log, i) => (
              <p key={i} className="text-gray-700 font-mono">{log}</p>
            ))}
          </div>
        )}
      </div>

      {memberships.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No hay membresías registradas</p>
          <p className="text-gray-400 text-sm mt-2">Las membresías aparecerán aquí cuando se creen</p>
          <button
            onClick={createDefaultMemberships}
            className="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
          >
            🎯 Crear Membresías por Defecto
          </button>
        </div>
      ) : (
        <div>
          {/* Agrupar por tipo */}
          {memberships.filter((m) => m.type === 'dealer').length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">🏢 Planes para Dealers</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {memberships
                  .filter((m) => m.type === 'dealer')
                  .map((membership, index) => (
                  <div key={membership.id}>
                    <MembershipCard
                      membership={membership}
                      isPopular={index === 1} // El del medio es popular
                    />
                    {membership.stripePriceId && (
                      <div className="mt-2 flex items-center justify-center gap-2 text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full">
                        <span>💳</span>
                        <span>Vinculado con Stripe</span>
                      </div>
                    )}
                    {membership.tenantCount !== undefined && (
                      <div className="mt-2 text-center text-xs text-gray-500">
                        {membership.tenantCount} tenant{membership.tenantCount !== 1 ? 's' : ''} usando este plan
                      </div>
                    )}
                    {/* Estado activo/inactivo - Badge prominente */}
                    <div className={`mt-2 flex items-center justify-center gap-2 text-xs px-3 py-1 rounded-full font-medium ${
                      membership.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      <span>{membership.isActive ? '✓' : '✗'}</span>
                      <span>{membership.isActive ? 'Activa' : 'Inactiva'}</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {/* Botón de toggle activo/inactivo */}
                      <button
                        onClick={() => handleToggleActive(membership.id, membership.isActive)}
                        className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          membership.isActive
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {membership.isActive ? '⏸️ Desactivar' : '▶️ Activar'}
                      </button>
                      <Link
                        href={`/admin/memberships/${membership.id}/edit`}
                        className="block w-full px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm text-center"
                      >
                        ✏️ Editar
                      </Link>
                    </div>
                  </div>
                  ))}
              </div>
            </div>
          )}

          {memberships.filter((m) => m.type === 'seller').length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">👤 Planes para Vendedores</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {memberships
                  .filter((m) => m.type === 'seller')
                  .map((membership, index) => (
                  <div key={membership.id}>
                    <MembershipCard
                      membership={membership}
                      isPopular={index === 1} // El del medio es popular
                    />
                    {membership.stripePriceId && (
                      <div className="mt-2 flex items-center justify-center gap-2 text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full">
                        <span>💳</span>
                        <span>Vinculado con Stripe</span>
                      </div>
                    )}
                    {membership.tenantCount !== undefined && (
                      <div className="mt-2 text-center text-xs text-gray-500">
                        {membership.tenantCount} tenant{membership.tenantCount !== 1 ? 's' : ''} usando este plan
                      </div>
                    )}
                    {/* Estado activo/inactivo - Badge prominente */}
                    <div className={`mt-2 flex items-center justify-center gap-2 text-xs px-3 py-1 rounded-full font-medium ${
                      membership.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      <span>{membership.isActive ? '✓' : '✗'}</span>
                      <span>{membership.isActive ? 'Activa' : 'Inactiva'}</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {/* Botón de toggle activo/inactivo */}
                      <button
                        onClick={() => handleToggleActive(membership.id, membership.isActive)}
                        className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          membership.isActive
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {membership.isActive ? '⏸️ Desactivar' : '▶️ Activar'}
                      </button>
                      <Link
                        href={`/admin/memberships/${membership.id}/edit`}
                        className="block w-full px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm text-center"
                      >
                        ✏️ Editar
                      </Link>
                    </div>
                  </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateMembershipModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchMemberships}
        />
      )}

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        message={errorModal.message}
        details={errorModal.details}
      />
    </div>
  );
}

// CreateMembershipModal moved to @/components/CreateMembershipModal

