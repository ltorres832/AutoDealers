'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface CreateMembershipModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Componente helper para checkboxes de features
function FeatureCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-primary-600 rounded"
      />
      <span className="text-xs">{label}</span>
    </label>
  );
}

export default function CreateMembershipModal({ onClose, onSuccess }: CreateMembershipModalProps) {
  const [dynamicFeatures, setDynamicFeatures] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'dealer' as 'dealer' | 'seller',
    price: '',
    currency: 'USD',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    features: {
      // Límites numéricos
      maxSellers: '',
      maxInventory: '',
      maxCampaigns: '',
      maxPromotions: '',
      maxAppointmentsPerMonth: '',
      maxStorageGB: '',
      maxApiCallsPerMonth: '',
      // Features booleanas
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
      // Email corporativo
      corporateEmailEnabled: false,
      maxCorporateEmails: '',
      emailSignatureBasic: false,
      emailSignatureAdvanced: false,
      emailAliases: false,
      multiDealerEnabled: false,
      maxDealers: '',
      requiresAdminApproval: false,
      multipleDealers: false,
    },
  });
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDynamicFeatures();
  }, []);

  async function fetchDynamicFeatures() {
    try {
      const response = await fetchWithAuth('/api/admin/dynamic-features');
      const data = await response.json();
      setDynamicFeatures(data.features || []);
      
      // Inicializar valores por defecto de features dinámicas
      const defaultValues: any = {};
      data.features?.forEach((feature: any) => {
        if (feature.defaultValue !== undefined) {
          defaultValues[feature.key] = feature.defaultValue;
        } else if (feature.type === 'boolean') {
          defaultValues[feature.key] = false;
        } else if (feature.type === 'number') {
          defaultValues[feature.key] = '';
        } else if (feature.type === 'string') {
          defaultValues[feature.key] = '';
        } else if (feature.type === 'select') {
          defaultValues[feature.key] = '';
        }
      });
      
      setFormData(prev => ({
        ...prev,
        features: { ...prev.features, ...defaultValues },
      }));
    } catch (error) {
      console.error('Error fetching dynamic features:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetchWithAuth('/api/admin/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          price: parseFloat(formData.price),
          currency: formData.currency,
          billingCycle: formData.billingCycle,
          createStripeProduct: true, // Indica que debe crear producto en Stripe
          features: {
            // Límites numéricos
            maxSellers: formData.features.maxSellers ? parseInt(formData.features.maxSellers) : undefined,
            maxInventory: formData.features.maxInventory ? parseInt(formData.features.maxInventory) : undefined,
            maxCampaigns: formData.features.maxCampaigns ? parseInt(formData.features.maxCampaigns) : undefined,
            maxPromotions: formData.features.maxPromotions ? parseInt(formData.features.maxPromotions) : undefined,
            maxAppointmentsPerMonth: formData.features.maxAppointmentsPerMonth ? parseInt(formData.features.maxAppointmentsPerMonth) : undefined,
            maxStorageGB: formData.features.maxStorageGB ? parseInt(formData.features.maxStorageGB) : undefined,
            maxApiCallsPerMonth: formData.features.maxApiCallsPerMonth ? parseInt(formData.features.maxApiCallsPerMonth) : undefined,
            // Features booleanas
            customSubdomain: formData.features.customSubdomain,
            customDomain: formData.features.customDomain,
            aiEnabled: formData.features.aiEnabled,
            aiAutoResponses: formData.features.aiAutoResponses,
            aiContentGeneration: formData.features.aiContentGeneration,
            aiLeadClassification: formData.features.aiLeadClassification,
            socialMediaEnabled: formData.features.socialMediaEnabled,
            socialMediaScheduling: formData.features.socialMediaScheduling,
            socialMediaAnalytics: formData.features.socialMediaAnalytics,
            marketplaceEnabled: formData.features.marketplaceEnabled,
            marketplaceFeatured: formData.features.marketplaceFeatured,
            advancedReports: formData.features.advancedReports,
            customReports: formData.features.customReports,
            exportData: formData.features.exportData,
            whiteLabel: formData.features.whiteLabel,
            apiAccess: formData.features.apiAccess,
            webhooks: formData.features.webhooks,
            ssoEnabled: formData.features.ssoEnabled,
            multiLanguage: formData.features.multiLanguage,
            customTemplates: formData.features.customTemplates,
            emailMarketing: formData.features.emailMarketing,
            smsMarketing: formData.features.smsMarketing,
            whatsappMarketing: formData.features.whatsappMarketing,
            videoUploads: formData.features.videoUploads,
            virtualTours: formData.features.virtualTours,
            liveChat: formData.features.liveChat,
            appointmentScheduling: formData.features.appointmentScheduling,
            paymentProcessing: formData.features.paymentProcessing,
            inventorySync: formData.features.inventorySync,
            crmAdvanced: formData.features.crmAdvanced,
            leadScoring: formData.features.leadScoring,
            automationWorkflows: formData.features.automationWorkflows,
            integrationsUnlimited: formData.features.integrationsUnlimited,
            prioritySupport: formData.features.prioritySupport,
            dedicatedManager: formData.features.dedicatedManager,
            trainingSessions: formData.features.trainingSessions,
            customBranding: formData.features.customBranding,
            mobileApp: formData.features.mobileApp,
            offlineMode: formData.features.offlineMode,
            dataBackup: formData.features.dataBackup,
            complianceTools: formData.features.complianceTools,
            analyticsAdvanced: formData.features.analyticsAdvanced,
            aBTesting: formData.features.aBTesting,
            seoTools: formData.features.seoTools,
            customIntegrations: formData.features.customIntegrations,
            freePromotionsOnLanding: formData.features.freePromotionsOnLanding,
            // Email corporativo
            corporateEmailEnabled: formData.features.corporateEmailEnabled,
            maxCorporateEmails: formData.features.maxCorporateEmails ? parseInt(formData.features.maxCorporateEmails) : undefined,
            emailSignatureBasic: formData.features.emailSignatureBasic,
            emailSignatureAdvanced: formData.features.emailSignatureAdvanced,
            emailAliases: formData.features.emailAliases,
            multiDealerEnabled: formData.type === 'dealer' ? formData.features.multiDealerEnabled : false,
            maxDealers:
              formData.type === 'dealer' && formData.features.multiDealerEnabled
                ? formData.features.maxDealers === ''
                  ? null
                  : parseInt(String(formData.features.maxDealers), 10) || null
                : undefined,
            requiresAdminApproval:
              formData.type === 'dealer' && formData.features.multiDealerEnabled
                ? formData.features.requiresAdminApproval
                : false,
            multipleDealers:
              formData.type === 'dealer' && formData.features.multiDealerEnabled
                ? formData.features.multipleDealers
                : false,
            // Features dinámicas - se agregan automáticamente
            ...dynamicFeatures.reduce((acc, feature) => {
              const value = (formData.features as any)[feature.key];
              if (value !== undefined && value !== null && value !== '') {
                if (feature.type === 'boolean') {
                  acc[feature.key] = Boolean(value);
                } else if (feature.type === 'number') {
                  acc[feature.key] = parseFloat(value) || undefined;
                } else {
                  acc[feature.key] = value;
                }
              }
              return acc;
            }, {} as Record<string, any>),
          },
          isActive: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.stripeCreated) {
          alert(`✅ Membresía creada exitosamente!\n\n💳 Producto en Stripe: Creado\n🔗 Stripe Price ID: ${data.stripePriceId}`);
        } else {
          alert('✅ Membresía creada exitosamente!');
        }
        onClose();
        onSuccess();
      } else {
        const errorData = await response.json();
        alert(`Error al crear membresía: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear membresía');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Crear Membresía</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Información básica */}
          <div>
            <label className="block text-sm font-medium mb-2">Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="dealer">Dealer</option>
                <option value="seller">Seller</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Ciclo de Facturación</label>
              <select
                value={formData.billingCycle}
                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Precio</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Moneda</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
              </select>
            </div>
          </div>
          {/* Indicador de Stripe */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💳</span>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  Integración Automática con Stripe
                </h4>
                <p className="text-sm text-blue-700">
                  Al crear esta membresía, se creará automáticamente un producto y precio en Stripe. 
                  No necesitas hacer nada manualmente.
                </p>
                <div className="mt-2 text-xs text-blue-600 space-y-1">
                  <div>✓ Producto creado en Stripe</div>
                  <div>✓ Precio configurado: <strong>${formData.price || '0'} {formData.currency}</strong></div>
                  <div>✓ Intervalo: <strong>{formData.billingCycle === 'monthly' ? 'Mensual' : 'Anual'}</strong></div>
                  <div>✓ Vinculación automática</div>
                </div>
              </div>
            </div>
          </div>

          {/* Límites Numéricos */}
          <div>
            <label className="block text-sm font-medium mb-2">Límites Numéricos</label>
            <p className="text-xs text-gray-500 mb-3">Deja vacío para ilimitado</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Máx. Vendedores</label>
                <input
                  type="number"
                  value={formData.features.maxSellers}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, maxSellers: e.target.value },
                  })}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Máx. Inventario</label>
                <input
                  type="number"
                  value={formData.features.maxInventory}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, maxInventory: e.target.value },
                  })}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Máx. Campañas</label>
                <input
                  type="number"
                  value={formData.features.maxCampaigns}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, maxCampaigns: e.target.value },
                  })}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Máx. Promociones</label>
                <input
                  type="number"
                  value={formData.features.maxPromotions}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, maxPromotions: e.target.value },
                  })}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Máx. Citas/Mes</label>
                <input
                  type="number"
                  value={formData.features.maxAppointmentsPerMonth}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, maxAppointmentsPerMonth: e.target.value },
                  })}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Almacenamiento (GB)</label>
                <input
                  type="number"
                  value={formData.features.maxStorageGB}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, maxStorageGB: e.target.value },
                  })}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Llamadas API/Mes</label>
                <input
                  type="number"
                  value={formData.features.maxApiCallsPerMonth}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, maxApiCallsPerMonth: e.target.value },
                  })}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Ilimitado"
                />
              </div>
            </div>
          </div>

          {/* Features Booleanas - Similar a la página de edición pero más compacto */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Features</label>
              <button
                type="button"
                onClick={() => setShowAllFeatures(!showAllFeatures)}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                {showAllFeatures ? 'Mostrar menos' : 'Mostrar todas'}
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto border rounded p-3 space-y-3">
              {/* Features básicas siempre visibles - igual que en la página de edición */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">🌐 Dominios y Branding</h4>
                <FeatureCheckbox
                  label="Subdominio personalizado"
                  checked={formData.features.customSubdomain}
                  onChange={(v) => setFormData({
                    ...formData,
                    features: { ...formData.features, customSubdomain: v },
                  })}
                />
                {showAllFeatures && (
                  <>
                    <FeatureCheckbox label="Dominio propio" checked={formData.features.customDomain} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, customDomain: v } })} />
                    <FeatureCheckbox label="White Label" checked={formData.features.whiteLabel} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, whiteLabel: v } })} />
                    <FeatureCheckbox label="Branding personalizado" checked={formData.features.customBranding} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, customBranding: v } })} />
                  </>
                )}
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">🤖 IA</h4>
                <FeatureCheckbox label="IA habilitada" checked={formData.features.aiEnabled} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, aiEnabled: v } })} />
                {showAllFeatures && (
                  <>
                    <FeatureCheckbox label="Respuestas automáticas" checked={formData.features.aiAutoResponses} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, aiAutoResponses: v } })} />
                    <FeatureCheckbox label="Generación de contenido" checked={formData.features.aiContentGeneration} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, aiContentGeneration: v } })} />
                    <FeatureCheckbox label="Clasificación de leads" checked={formData.features.aiLeadClassification} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, aiLeadClassification: v } })} />
                  </>
                )}
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">📱 Redes Sociales</h4>
                <FeatureCheckbox label="Redes sociales" checked={formData.features.socialMediaEnabled} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, socialMediaEnabled: v } })} />
                {showAllFeatures && (
                  <>
                    <FeatureCheckbox label="Programar posts" checked={formData.features.socialMediaScheduling} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, socialMediaScheduling: v } })} />
                    <FeatureCheckbox label="Analytics sociales" checked={formData.features.socialMediaAnalytics} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, socialMediaAnalytics: v } })} />
                  </>
                )}
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">🛒 Marketplace</h4>
                <FeatureCheckbox label="Marketplace" checked={formData.features.marketplaceEnabled} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, marketplaceEnabled: v } })} />
                {showAllFeatures && <FeatureCheckbox label="Destacado" checked={formData.features.marketplaceFeatured} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, marketplaceFeatured: v } })} />}
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">📊 Reportes</h4>
                <FeatureCheckbox label="Reportes avanzados" checked={formData.features.advancedReports} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, advancedReports: v } })} />
                {showAllFeatures && (
                  <>
                    <FeatureCheckbox label="Reportes personalizados" checked={formData.features.customReports} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, customReports: v } })} />
                    <FeatureCheckbox label="Exportar datos" checked={formData.features.exportData} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, exportData: v } })} />
                    <FeatureCheckbox label="Analytics avanzados" checked={formData.features.analyticsAdvanced} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, analyticsAdvanced: v } })} />
                    <FeatureCheckbox label="Pruebas A/B" checked={formData.features.aBTesting} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, aBTesting: v } })} />
                  </>
                )}
              </div>
              {showAllFeatures && (
                <>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">🔌 API</h4>
                    <FeatureCheckbox label="API REST" checked={formData.features.apiAccess} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, apiAccess: v } })} />
                    <FeatureCheckbox label="Webhooks" checked={formData.features.webhooks} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, webhooks: v } })} />
                    <FeatureCheckbox label="Integraciones ilimitadas" checked={formData.features.integrationsUnlimited} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, integrationsUnlimited: v } })} />
                    <FeatureCheckbox label="Integraciones personalizadas" checked={formData.features.customIntegrations} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, customIntegrations: v } })} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">📢 Marketing</h4>
                    <FeatureCheckbox label="Email marketing" checked={formData.features.emailMarketing} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, emailMarketing: v } })} />
                    <FeatureCheckbox label="SMS marketing" checked={formData.features.smsMarketing} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, smsMarketing: v } })} />
                    <FeatureCheckbox label="WhatsApp marketing" checked={formData.features.whatsappMarketing} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, whatsappMarketing: v } })} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">👥 CRM</h4>
                    <FeatureCheckbox label="CRM avanzado" checked={formData.features.crmAdvanced} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, crmAdvanced: v } })} />
                    <FeatureCheckbox label="Scoring de leads" checked={formData.features.leadScoring} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, leadScoring: v } })} />
                    <FeatureCheckbox label="Workflows" checked={formData.features.automationWorkflows} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, automationWorkflows: v } })} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">🎬 Multimedia</h4>
                    <FeatureCheckbox label="Videos" checked={formData.features.videoUploads} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, videoUploads: v } })} />
                    <FeatureCheckbox label="Tours virtuales" checked={formData.features.virtualTours} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, virtualTours: v } })} />
                    <FeatureCheckbox label="Templates personalizados" checked={formData.features.customTemplates} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, customTemplates: v } })} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">⚙️ Servicios</h4>
                    <FeatureCheckbox label="Chat en vivo" checked={formData.features.liveChat} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, liveChat: v } })} />
                    <FeatureCheckbox label="Citas" checked={formData.features.appointmentScheduling} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, appointmentScheduling: v } })} />
                    <FeatureCheckbox label="Pagos" checked={formData.features.paymentProcessing} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, paymentProcessing: v } })} />
                    <FeatureCheckbox label="Sincronización inventario" checked={formData.features.inventorySync} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, inventorySync: v } })} />
                    <FeatureCheckbox label="SSO" checked={formData.features.ssoEnabled} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, ssoEnabled: v } })} />
                    <FeatureCheckbox label="Múltiples idiomas" checked={formData.features.multiLanguage} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, multiLanguage: v } })} />
                    <FeatureCheckbox label="App móvil" checked={formData.features.mobileApp} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, mobileApp: v } })} />
                    <FeatureCheckbox label="Modo offline" checked={formData.features.offlineMode} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, offlineMode: v } })} />
                    <FeatureCheckbox label="Backup automático" checked={formData.features.dataBackup} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, dataBackup: v } })} />
                    <FeatureCheckbox label="Cumplimiento" checked={formData.features.complianceTools} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, complianceTools: v } })} />
                    <FeatureCheckbox label="SEO" checked={formData.features.seoTools} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, seoTools: v } })} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">🎧 Soporte</h4>
                    <FeatureCheckbox label="Soporte prioritario" checked={formData.features.prioritySupport} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, prioritySupport: v } })} />
                    <FeatureCheckbox label="Gerente dedicado" checked={formData.features.dedicatedManager} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, dedicatedManager: v } })} />
                    <FeatureCheckbox label="Entrenamiento" checked={formData.features.trainingSessions} onChange={(v) => setFormData({ ...formData, features: { ...formData.features, trainingSessions: v } })} />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">📧 Email Corporativo</h4>
                <FeatureCheckbox
                  label="Email corporativo habilitado"
                  checked={formData.features.corporateEmailEnabled}
                  onChange={(v) => setFormData({
                    ...formData,
                    features: { ...formData.features, corporateEmailEnabled: v },
                  })}
                />
                {formData.features.corporateEmailEnabled && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Máx. Emails Corporativos</label>
                      <input
                        type="number"
                        value={formData.features.maxCorporateEmails}
                        onChange={(e) => setFormData({
                          ...formData,
                          features: { ...formData.features, maxCorporateEmails: e.target.value },
                        })}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Ilimitado (dejar vacío)"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Dejar vacío para ilimitado</p>
                    </div>
                    <FeatureCheckbox
                      label="Firma básica de email"
                      checked={formData.features.emailSignatureBasic}
                      onChange={(v) => setFormData({
                        ...formData,
                        features: { ...formData.features, emailSignatureBasic: v },
                      })}
                    />
                    <FeatureCheckbox
                      label="Firma avanzada (HTML, imágenes)"
                      checked={formData.features.emailSignatureAdvanced}
                      onChange={(v) => setFormData({
                        ...formData,
                        features: { ...formData.features, emailSignatureAdvanced: v },
                      })}
                    />
                    <FeatureCheckbox
                      label="Aliases de email (ej: ventas@)"
                      checked={formData.features.emailAliases}
                      onChange={(v) => setFormData({
                        ...formData,
                        features: { ...formData.features, emailAliases: v },
                      })}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {formData.type === 'dealer' && (
            <div className="border rounded-lg p-4 bg-slate-50">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Red multi-concesionario</h3>
              <p className="text-xs text-gray-600 mb-3">
                No es un tipo aparte: sigue siendo un plan <strong>Dealer</strong> con permisos extra. Así aparece en registro multi-dealer y en precios públicos cuando corresponde.
              </p>
              <FeatureCheckbox
                label="Plan multi-concesionario (varias sedes / red)"
                checked={formData.features.multiDealerEnabled}
                onChange={(v) =>
                  setFormData({
                    ...formData,
                    features: { ...formData.features, multiDealerEnabled: v },
                  })
                }
              />
              {formData.features.multiDealerEnabled && (
                <div className="mt-3 space-y-3 pl-1">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Máx. concesionarios en la red (vacío = ilimitado)</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.features.maxDealers}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          features: { ...formData.features, maxDealers: e.target.value },
                        })
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Ilimitado"
                    />
                  </div>
                  <FeatureCheckbox
                    label="Alta multi-dealer requiere aprobación administrativa"
                    checked={formData.features.requiresAdminApproval}
                    onChange={(v) =>
                      setFormData({
                        ...formData,
                        features: { ...formData.features, requiresAdminApproval: v },
                      })
                    }
                  />
                  <FeatureCheckbox
                    label="Compat. legado: multipleDealers"
                    checked={formData.features.multipleDealers}
                    onChange={(v) =>
                      setFormData({
                        ...formData,
                        features: { ...formData.features, multipleDealers: v },
                      })
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* Features Dinámicas */}
          {dynamicFeatures.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">✨ Features Dinámicas</label>
                <span className="text-xs text-gray-500">
                  {dynamicFeatures.length} feature{dynamicFeatures.length !== 1 ? 's' : ''} disponible{dynamicFeatures.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto border rounded p-3 space-y-3">
                {dynamicFeatures.map((feature) => (
                  <div key={feature.id} className="space-y-2 p-2 border-b last:border-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900">{feature.name}</h4>
                        <p className="text-xs text-gray-500">{feature.description}</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {feature.type}
                      </span>
                    </div>
                    
                    {feature.type === 'boolean' && (
                      <FeatureCheckbox
                        label={`Habilitar ${feature.name}`}
                        checked={(formData.features as any)[feature.key] || false}
                        onChange={(v) => setFormData({
                          ...formData,
                          features: { ...formData.features, [feature.key]: v },
                        })}
                      />
                    )}
                    
                    {feature.type === 'number' && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          {feature.name}
                          {feature.unit && ` (${feature.unit})`}
                        </label>
                        <input
                          type="number"
                          value={(formData.features as any)[feature.key] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            features: { ...formData.features, [feature.key]: e.target.value } as any,
                          })}
                          className="w-full border rounded px-2 py-1 text-sm"
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
                        <label className="block text-xs text-gray-600 mb-1">{feature.name}</label>
                        <input
                          type="text"
                          value={(formData.features as any)[feature.key] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            features: { ...formData.features, [feature.key]: e.target.value } as any,
                          })}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="Valor personalizado"
                        />
                      </div>
                    )}
                    
                    {feature.type === 'select' && feature.options && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{feature.name}</label>
                        <select
                          value={(formData.features as any)[feature.key] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            features: { ...formData.features, [feature.key]: e.target.value } as any,
                          })}
                          className="w-full border rounded px-2 py-1 text-sm"
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

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Creando membresía y producto en Stripe...' : '✓ Crear Membresía'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

