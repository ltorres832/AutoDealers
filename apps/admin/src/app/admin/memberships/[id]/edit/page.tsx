'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { MembershipFeatures } from '@autodealers/billing';

export default function EditMembershipPage() {
  const router = useRouter();
  const params = useParams();
  const membershipId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [membership, setMembership] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dynamicFeatures, setDynamicFeatures] = useState<any[]>([]);
  const [features, setFeatures] = useState<MembershipFeatures>({
    maxSellers: undefined,
    maxInventory: undefined,
    maxCampaigns: undefined,
    maxPromotions: undefined,
    maxAppointmentsPerMonth: undefined,
    maxStorageGB: undefined,
    maxApiCallsPerMonth: undefined,
    customSubdomain: false,
    customDomain: false,
    aiEnabled: false,
    aiAutoResponses: false,
    aiContentGeneration: false,
    aiLeadClassification: false,
    socialMediaEnabled: false,
    socialMediaScheduling: false,
    socialMediaAnalytics: false,
    marketplaceEnabled: false,
    marketplaceFeatured: false,
    advancedReports: false,
    customReports: false,
    exportData: false,
    whiteLabel: false,
    apiAccess: false,
    webhooks: false,
    ssoEnabled: false,
    multiLanguage: false,
    customTemplates: false,
    emailMarketing: false,
    smsMarketing: false,
    whatsappMarketing: false,
    videoUploads: false,
    virtualTours: false,
    liveChat: false,
    appointmentScheduling: false,
    paymentProcessing: false,
    inventorySync: false,
    crmAdvanced: false,
    leadScoring: false,
    automationWorkflows: false,
    integrationsUnlimited: false,
    prioritySupport: false,
    dedicatedManager: false,
    trainingSessions: false,
    customBranding: false,
    mobileApp: false,
    offlineMode: false,
    dataBackup: false,
    complianceTools: false,
    analyticsAdvanced: false,
    aBTesting: false,
    seoTools: false,
    customIntegrations: false,
    freePromotionsOnLanding: false,
    fiModule: false,
    fiMultipleManagers: false,
    // Email corporativo
    corporateEmailEnabled: false,
    maxCorporateEmails: undefined,
    emailSignatureBasic: false,
    emailSignatureAdvanced: false,
    emailAliases: false,
  });

  useEffect(() => {
    fetchMembership();
  }, [membershipId]);

  async function fetchMembership() {
    console.log('🔍 fetchMembership called with membershipId:', membershipId);
    console.log('🔍 params:', params);
    
    if (!membershipId) {
      console.error('❌ No membership ID provided');
      setError('No se proporcionó un ID de membresía');
      setLoading(false);
      return;
    }
    
    try {
      // Obtener token de todas las fuentes posibles
      const localToken = localStorage.getItem('authToken');
      const cookieToken = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('authToken='))
        ?.split('=')[1];
      
      const token = localToken || cookieToken;
      
      console.log('📡 Fetching membership from:', `/api/admin/memberships/${membershipId}`);
      console.log('🔐 Token available:', token ? 'Yes' : 'No');
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Agregar token si está disponible
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/admin/memberships/${membershipId}`, {
        headers,
        credentials: 'include',
      });
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Error fetching membership:', errorData);
        setError(errorData.error || `Error ${response.status}: ${response.statusText}`);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('📦 Membership data received:', data);
      
      if (data.membership) {
        console.log('✅ Membership found:', data.membership.id, data.membership.name);
        setMembership(data.membership);
        setFeatures(data.membership.features || features);
        setError(null);
      } else {
        console.error('❌ Membership not found in response:', data);
        setError('Membresía no encontrada en la respuesta del servidor');
      }
    } catch (error: any) {
      console.error('❌ Exception fetching membership:', error);
      setError(`Error al cargar la membresía: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveMembership() {
    setSaving(true);
    setError(null);
    try {
      // Obtener token de todas las fuentes posibles
      const localToken = localStorage.getItem('authToken');
      const cookieToken = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('authToken='))
        ?.split('=')[1];
      
      const token = localToken || cookieToken;
      
      console.log('💾 Saving membership:', membershipId);
      console.log('🔐 Token available:', token ? 'Yes' : 'No');
      
      if (!token) {
        const errorMsg = 'No se encontró token de autenticación. Por favor, cierra sesión y vuelve a iniciar sesión.';
        setError(errorMsg);
        alert(errorMsg);
        setSaving(false);
        return;
      }
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      
      const response = await fetch(`/api/admin/memberships/${membershipId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          ...membership,
          features,
        }),
      });

      console.log('📡 Save response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Membership updated successfully:', data);
        alert('Membresía actualizada exitosamente. Las features se sincronizarán automáticamente.');
        router.replace('/admin/memberships');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Error updating membership:', errorData);
        const errorMessage = errorData.error || `Error ${response.status}: ${response.statusText}`;
        alert(`Error al actualizar membresía: ${errorMessage}`);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar membresía');
    } finally {
      setSaving(false);
    }
  }

  function updateFeature(key: keyof MembershipFeatures, value: boolean | number | string | undefined) {
    setFeatures({ ...features, [key]: value });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600">Cargando membresía...</p>
        {membershipId && (
          <p className="text-xs text-gray-400 mt-2">ID: {membershipId}</p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error}</p>
          {membershipId && (
            <p className="text-sm text-red-600 mb-4">ID de membresía: {membershipId}</p>
          )}
          <Link
            href="/admin/memberships"
            className="inline-block px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Volver a Membresías
          </Link>
        </div>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-900 mb-2">Membresía no encontrada</h2>
          <p className="text-yellow-700 mb-4">
            No se pudo encontrar la membresía con el ID proporcionado.
          </p>
          {membershipId && (
            <p className="text-sm text-yellow-600 mb-4">ID buscado: {membershipId}</p>
          )}
          <Link
            href="/admin/memberships"
            className="inline-block px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Volver a Membresías
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <Link href="/admin/memberships" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Volver a Membresías
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Editar Membresía: {membership.name}</h1>
        <p className="text-gray-600">
          Configura todas las features ejecutables de esta membresía
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Información Básica</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre</label>
            <input
              type="text"
              value={membership.name}
              onChange={(e) => setMembership({ ...membership, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Precio</label>
            <input
              type="number"
              value={membership.price}
              onChange={(e) => setMembership({ ...membership, price: parseFloat(e.target.value) })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Límites Numéricos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Límites Numéricos</h2>
        <p className="text-sm text-gray-600 mb-4">
          Deja en blanco o 0 para ilimitado
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Máx. Vendedores</label>
            <input
              type="number"
              value={features.maxSellers || ''}
              onChange={(e) => updateFeature('maxSellers', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Ilimitado"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Máx. Inventario</label>
            <input
              type="number"
              value={features.maxInventory || ''}
              onChange={(e) => updateFeature('maxInventory', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Ilimitado"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Máx. Campañas</label>
            <input
              type="number"
              value={features.maxCampaigns || ''}
              onChange={(e) => updateFeature('maxCampaigns', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Ilimitado"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Máx. Promociones</label>
            <input
              type="number"
              value={features.maxPromotions || ''}
              onChange={(e) => updateFeature('maxPromotions', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Ilimitado"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Máx. Citas/Mes</label>
            <input
              type="number"
              value={features.maxAppointmentsPerMonth || ''}
              onChange={(e) => updateFeature('maxAppointmentsPerMonth', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Ilimitado"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Almacenamiento (GB)</label>
            <input
              type="number"
              value={features.maxStorageGB || ''}
              onChange={(e) => updateFeature('maxStorageGB', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Ilimitado"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Llamadas API/Mes</label>
            <input
              type="number"
              value={features.maxApiCallsPerMonth || ''}
              onChange={(e) => updateFeature('maxApiCallsPerMonth', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Ilimitado"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Features Booleanas - Organizadas por categorías */}
      <div className="space-y-6">
        {/* Dominios y Branding */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">🌐 Dominios y Branding</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureToggle
              label="Subdominio Personalizado"
              value={features.customSubdomain}
              onChange={(v) => updateFeature('customSubdomain', v)}
            />
            <FeatureToggle
              label="Dominio Propio (ej: midealer.com)"
              value={features.customDomain}
              onChange={(v) => updateFeature('customDomain', v)}
            />
            <FeatureToggle
              label="White Label (Sin branding AutoDealers)"
              value={features.whiteLabel}
              onChange={(v) => updateFeature('whiteLabel', v)}
            />
            <FeatureToggle
              label="Branding Completamente Personalizado"
              value={features.customBranding}
              onChange={(v) => updateFeature('customBranding', v)}
            />
          </div>
        </div>

        {/* Inteligencia Artificial */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">🤖 Inteligencia Artificial</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureToggle
              label="IA Habilitada"
              value={features.aiEnabled}
              onChange={(v) => updateFeature('aiEnabled', v)}
            />
            <FeatureToggle
              label="Respuestas Automáticas con IA"
              value={features.aiAutoResponses}
              onChange={(v) => updateFeature('aiAutoResponses', v)}
            />
            <FeatureToggle
              label="Generación de Contenido con IA"
              value={features.aiContentGeneration}
              onChange={(v) => updateFeature('aiContentGeneration', v)}
            />
            <FeatureToggle
              label="Clasificación Automática de Leads"
              value={features.aiLeadClassification}
              onChange={(v) => updateFeature('aiLeadClassification', v)}
            />
          </div>
        </div>

        {/* Redes Sociales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">📱 Redes Sociales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureToggle
              label="Integración con Redes Sociales"
              value={features.socialMediaEnabled}
              onChange={(v) => updateFeature('socialMediaEnabled', v)}
            />
            <FeatureToggle
              label="Programar Posts"
              value={features.socialMediaScheduling}
              onChange={(v) => updateFeature('socialMediaScheduling', v)}
            />
            <FeatureToggle
              label="Analytics de Redes Sociales"
              value={features.socialMediaAnalytics}
              onChange={(v) => updateFeature('socialMediaAnalytics', v)}
            />
          </div>
        </div>

        {/* Marketplace */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">🛒 Marketplace</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureToggle
              label="Acceso al Marketplace"
              value={features.marketplaceEnabled}
              onChange={(v) => updateFeature('marketplaceEnabled', v)}
            />
            <FeatureToggle
              label="Destacado en Marketplace"
              value={features.marketplaceFeatured}
              onChange={(v) => updateFeature('marketplaceFeatured', v)}
            />
          </div>
        </div>

        {/* Reportes y Analytics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">📊 Reportes y Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureToggle
              label="Reportes Avanzados"
              value={features.advancedReports}
              onChange={(v) => updateFeature('advancedReports', v)}
            />
            <FeatureToggle
              label="Reportes Personalizados"
              value={features.customReports}
              onChange={(v) => updateFeature('customReports', v)}
            />
            <FeatureToggle
              label="Exportar Datos (CSV, Excel, PDF)"
              value={features.exportData}
              onChange={(v) => updateFeature('exportData', v)}
            />
            <FeatureToggle
              label="Analytics Avanzados"
              value={features.analyticsAdvanced}
              onChange={(v) => updateFeature('analyticsAdvanced', v)}
            />
            <FeatureToggle
              label="Pruebas A/B"
              value={features.aBTesting}
              onChange={(v) => updateFeature('aBTesting', v)}
            />
          </div>
        </div>

        {/* API y Integraciones */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">🔌 API e Integraciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureToggle
              label="Acceso a API REST"
              value={features.apiAccess}
              onChange={(v) => updateFeature('apiAccess', v)}
            />
            <FeatureToggle
              label="Webhooks Personalizados"
              value={features.webhooks}
              onChange={(v) => updateFeature('webhooks', v)}
            />
            <FeatureToggle
              label="Integraciones Ilimitadas"
              value={features.integrationsUnlimited}
              onChange={(v) => updateFeature('integrationsUnlimited', v)}
            />
            <FeatureToggle
              label="Integraciones Personalizadas"
              value={features.customIntegrations}
              onChange={(v) => updateFeature('customIntegrations', v)}
            />
          </div>
        </div>

        {/* Marketing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">📢 Marketing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureToggle
              label="Marketing por Email"
              value={features.emailMarketing}
              onChange={(v) => updateFeature('emailMarketing', v)}
            />
            <FeatureToggle
              label="Marketing por SMS"
              value={features.smsMarketing}
              onChange={(v) => updateFeature('smsMarketing', v)}
            />
            <FeatureToggle
              label="Marketing por WhatsApp"
              value={features.whatsappMarketing}
              onChange={(v) => updateFeature('whatsappMarketing', v)}
            />
          </div>
        </div>

        {/* CRM y Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">👥 CRM y Leads</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureToggle
              label="CRM Avanzado con Pipelines"
              value={features.crmAdvanced}
              onChange={(v) => updateFeature('crmAdvanced', v)}
            />
            <FeatureToggle
              label="Scoring Automático de Leads"
              value={features.leadScoring}
              onChange={(v) => updateFeature('leadScoring', v)}
            />
            <FeatureToggle
              label="Workflows Automatizados"
              value={features.automationWorkflows}
              onChange={(v) => updateFeature('automationWorkflows', v)}
            />
          </div>
        </div>

        {/* Contenido y Multimedia */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">🎬 Contenido y Multimedia</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureToggle
              label="Subir Videos"
              value={features.videoUploads}
              onChange={(v) => updateFeature('videoUploads', v)}
            />
            <FeatureToggle
              label="Tours Virtuales 360°"
              value={features.virtualTours}
              onChange={(v) => updateFeature('virtualTours', v)}
            />
            <FeatureToggle
              label="Templates Personalizados"
              value={features.customTemplates}
              onChange={(v) => updateFeature('customTemplates', v)}
            />
          </div>
        </div>

        {/* Promociones */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">🎁 Promociones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureToggle
              label="Promociones Gratuitas en Landing Page"
              value={features.freePromotionsOnLanding}
              onChange={(v) => updateFeature('freePromotionsOnLanding', v)}
            />
          </div>
        </div>

        {/* Servicios Adicionales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">⚙️ Servicios Adicionales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureToggle
              label="Chat en Vivo"
              value={features.liveChat}
              onChange={(v) => updateFeature('liveChat', v)}
            />
            <FeatureToggle
              label="Sistema de Citas"
              value={features.appointmentScheduling}
              onChange={(v) => updateFeature('appointmentScheduling', v)}
            />
            <FeatureToggle
              label="Procesamiento de Pagos"
              value={features.paymentProcessing}
              onChange={(v) => updateFeature('paymentProcessing', v)}
            />
            <FeatureToggle
              label="Sincronización de Inventario"
              value={features.inventorySync}
              onChange={(v) => updateFeature('inventorySync', v)}
            />
            <FeatureToggle
              label="Single Sign-On (SSO)"
              value={features.ssoEnabled}
              onChange={(v) => updateFeature('ssoEnabled', v)}
            />
            <FeatureToggle
              label="Múltiples Idiomas"
              value={features.multiLanguage}
              onChange={(v) => updateFeature('multiLanguage', v)}
            />
            <FeatureToggle
              label="App Móvil"
              value={features.mobileApp}
              onChange={(v) => updateFeature('mobileApp', v)}
            />
            <FeatureToggle
              label="Modo Offline"
              value={features.offlineMode}
              onChange={(v) => updateFeature('offlineMode', v)}
            />
            <FeatureToggle
              label="Backup Automático"
              value={features.dataBackup}
              onChange={(v) => updateFeature('dataBackup', v)}
            />
            <FeatureToggle
              label="Herramientas de Cumplimiento"
              value={features.complianceTools}
              onChange={(v) => updateFeature('complianceTools', v)}
            />
            <FeatureToggle
              label="Herramientas SEO"
              value={features.seoTools}
              onChange={(v) => updateFeature('seoTools', v)}
            />
          </div>
        </div>

        {/* Soporte */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">🎧 Soporte</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureToggle
              label="Soporte Prioritario"
              value={features.prioritySupport}
              onChange={(v) => updateFeature('prioritySupport', v)}
            />
            <FeatureToggle
              label="Gerente de Cuenta Dedicado"
              value={features.dedicatedManager}
              onChange={(v) => updateFeature('dedicatedManager', v)}
            />
            <FeatureToggle
              label="Sesiones de Entrenamiento"
              value={features.trainingSessions}
              onChange={(v) => updateFeature('trainingSessions', v)}
            />
          </div>
        </div>

        {/* Email Corporativo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">📧 Email Corporativo</h2>
          <div className="space-y-4">
            <FeatureToggle
              label="Email Corporativo Habilitado"
              value={features.corporateEmailEnabled || false}
              onChange={(v) => updateFeature('corporateEmailEnabled', v)}
            />
            {features.corporateEmailEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Máx. Emails Corporativos</label>
                  <input
                    type="number"
                    value={features.maxCorporateEmails || ''}
                    onChange={(e) => updateFeature('maxCorporateEmails', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Ilimitado (dejar vacío)"
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Dejar vacío para ilimitado (solo Enterprise)</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FeatureToggle
                    label="Firma Básica de Email"
                    value={features.emailSignatureBasic || false}
                    onChange={(v) => updateFeature('emailSignatureBasic', v)}
                  />
                  <FeatureToggle
                    label="Firma Avanzada (HTML, imágenes)"
                    value={features.emailSignatureAdvanced || false}
                    onChange={(v) => updateFeature('emailSignatureAdvanced', v)}
                  />
                  <FeatureToggle
                    label="Aliases de Email (ej: ventas@)"
                    value={features.emailAliases || false}
                    onChange={(v) => updateFeature('emailAliases', v)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features Dinámicas */}
      {dynamicFeatures.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">✨ Features Dinámicas</h2>
          <p className="text-sm text-gray-600 mb-4">
            Features personalizadas creadas desde el panel de administración
          </p>
          <div className="space-y-4">
            {dynamicFeatures.map((feature) => (
              <div key={feature.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{feature.name}</h3>
                    <p className="text-xs text-gray-500">{feature.description}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {feature.type}
                  </span>
                </div>
                
                {feature.type === 'boolean' && (
                  <FeatureToggle
                    label={`Habilitar ${feature.name}`}
                    value={(features as any)[feature.key] || false}
                    onChange={(v) => updateFeature(feature.key as any, v)}
                  />
                )}
                
                {feature.type === 'number' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {feature.name}
                      {feature.unit && ` (${feature.unit})`}
                    </label>
                    <input
                      type="number"
                      value={(features as any)[feature.key] || ''}
                      onChange={(e) => updateFeature(
                        feature.key as any,
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )}
                      className="w-full border rounded px-3 py-2"
                      placeholder={feature.min !== undefined && feature.max !== undefined 
                        ? `${feature.min}-${feature.max}` 
                        : 'Ilimitado'}
                      min={feature.min}
                      max={feature.max}
                    />
                  </div>
                )}
                
                {feature.type === 'string' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">{feature.name}</label>
                    <input
                      type="text"
                      value={(features as any)[feature.key] || ''}
                      onChange={(e) => updateFeature(
                        feature.key as any,
                        e.target.value
                      )}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Valor personalizado"
                    />
                  </div>
                )}
                
                {feature.type === 'select' && feature.options && (
                  <div>
                    <label className="block text-sm font-medium mb-2">{feature.name}</label>
                    <select
                      value={(features as any)[feature.key] || ''}
                      onChange={(e) => updateFeature(
                        feature.key as any,
                        e.target.value
                      )}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {feature.options.map((option: string) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end space-x-4 mt-6">
        <Link
          href="/admin/memberships"
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Cancelar
        </Link>
        <button
          onClick={saveMembership}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
        >
          {saving ? 'Guardando y Sincronizando...' : 'Guardar y Sincronizar Features'}
        </button>
      </div>
    </div>
  );
}

function FeatureToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 text-primary-600 rounded"
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

