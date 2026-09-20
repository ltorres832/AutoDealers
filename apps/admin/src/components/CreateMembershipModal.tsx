'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { prepareAdminMembershipFeaturesForSave } from '@/lib/membership-features-admin';

interface CreateMembershipModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function FeatureCheckbox({
  label,
  checked,
  onChange,
  comingSoon = false,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  comingSoon?: boolean;
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
      {comingSoon ? (
        <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
          Próximamente
        </span>
      ) : null}
    </label>
  );
}

type FeatureState = Record<string, boolean | string>;

const INITIAL_FEATURES: FeatureState = {
  maxSellers: '',
  maxInventory: '',
  maxCampaigns: '',
  maxPromotions: '',
  maxLeadsPerMonth: '',
  maxAppointmentsPerMonth: '',
  maxStorageGB: '',
  maxApiCallsPerMonth: '',
  maxCustomerDocumentRequestsPerMonth: '',
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
  customerDocumentRequestsEnabled: true,
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
  corporateEmailEnabled: false,
  maxCorporateEmails: '',
  emailSignatureBasic: false,
  emailSignatureAdvanced: false,
  emailAliases: false,
  multiDealerEnabled: false,
  maxDealers: '',
  requiresAdminApproval: false,
  multipleDealers: false,
  fiModule: false,
  fiMultipleManagers: false,
  voiceAIEnabled: false,
  voiceInboundEnabled: false,
  voiceOutboundEnabled: false,
  voiceServiceCallsEnabled: false,
  voiceCampaignsEnabled: false,
  overageBillingEnabled: false,
  compensationPortalEnabled: true,
  dmsServiceEnabled: true,
  dmsPartsEnabled: true,
  dmsFinanceEnabled: true,
  dmsHrEnabled: true,
  publicApiEnabled: false,
  vin_camera_scan: true,
  share_landing: true,
  photo_guide: true,
  bg_remover: true,
  dynamic_scenes: true,
  dealer_site_builder: true,
  daco_labels: true,
  inventory_alliances: true,
  inventory_feed_sync: true,
};

export default function CreateMembershipModal({ onClose, onSuccess }: CreateMembershipModalProps) {
  const [dynamicFeatures, setDynamicFeatures] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'dealer' as 'dealer' | 'seller' | 'business',
    price: '',
    currency: 'USD',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    launchPrice: '',
    launchEndsAt: '',
    introPrice: '',
    introMonths: '',
    features: { ...INITIAL_FEATURES },
  });
  const [loading, setLoading] = useState(false);

  const setFeature = (key: string, value: boolean | string) => {
    setFormData((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: value },
    }));
  };

  const bool = (key: string) => Boolean(formData.features[key]);
  const str = (key: string) => String(formData.features[key] ?? '');

  useEffect(() => {
    fetchDynamicFeatures();
  }, []);

  async function fetchDynamicFeatures() {
    try {
      const response = await fetchWithAuth('/api/admin/dynamic-features');
      const data = await response.json();
      setDynamicFeatures(data.features || []);

      const defaultValues: FeatureState = {};
      data.features?.forEach((feature: any) => {
        if (feature.defaultValue !== undefined) {
          defaultValues[feature.key] = feature.defaultValue;
        } else if (feature.type === 'boolean') {
          defaultValues[feature.key] = false;
        } else {
          defaultValues[feature.key] = '';
        }
      });

      // No dejar que catálogo dinámico pise INV360 (opt-out, default ON).
      const inv360Keys = [
        'vin_camera_scan',
        'share_landing',
        'photo_guide',
        'bg_remover',
        'dynamic_scenes',
        'daco_labels',
        'dealer_site_builder',
        'inventory_alliances',
        'inventory_feed_sync',
      ] as const;
      for (const k of inv360Keys) {
        delete defaultValues[k];
      }

      setFormData((prev) => ({
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
      const featuresPayload = prepareAdminMembershipFeaturesForSave({
        ...formData.features,
        multiDealerEnabled:
          formData.type === 'dealer' ? formData.features.multiDealerEnabled === true : false,
        maxDealers:
          formData.type === 'dealer' && formData.features.multiDealerEnabled === true
            ? formData.features.maxDealers === ''
              ? undefined
              : formData.features.maxDealers
            : undefined,
        requiresAdminApproval:
          formData.type === 'dealer' && formData.features.multiDealerEnabled === true
            ? formData.features.requiresAdminApproval === true
            : false,
        multipleDealers:
          formData.type === 'dealer' && formData.features.multiDealerEnabled === true
            ? formData.features.multipleDealers === true
            : false,
        fiModule:
          formData.type === 'dealer' || formData.type === 'seller'
            ? formData.features.fiModule === true
            : false,
        fiMultipleManagers:
          formData.type === 'dealer' ? formData.features.fiMultipleManagers === true : false,
        customDomain: formData.type === 'business' ? false : formData.features.customDomain === true,
        // Inventario competitivo: no aplica a business; dealer-only solo en dealer
        vin_camera_scan:
          formData.type === 'business' ? false : formData.features.vin_camera_scan === true,
        share_landing:
          formData.type === 'business' ? false : formData.features.share_landing === true,
        photo_guide: formData.type === 'business' ? false : formData.features.photo_guide === true,
        bg_remover: formData.type === 'business' ? false : formData.features.bg_remover === true,
        dynamic_scenes:
          formData.type === 'business' ? false : formData.features.dynamic_scenes === true,
        daco_labels: formData.type === 'business' ? false : formData.features.daco_labels === true,
        dealer_site_builder:
          formData.type === 'dealer' ? formData.features.dealer_site_builder === true : false,
        inventory_alliances:
          formData.type === 'dealer' ? formData.features.inventory_alliances === true : false,
        inventory_feed_sync:
          formData.type === 'dealer' ? formData.features.inventory_feed_sync === true : false,
      });

      const response = await fetchWithAuth('/api/admin/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          price: parseFloat(formData.price),
          currency: formData.currency,
          billingCycle: formData.billingCycle,
          createStripeProduct: true,
          ...(formData.launchPrice && formData.launchEndsAt
            ? {
                launchPrice: parseFloat(formData.launchPrice),
                launchEndsAt: new Date(formData.launchEndsAt).toISOString(),
              }
            : {}),
          ...(formData.introPrice && formData.introMonths
            ? {
                introPrice: parseFloat(formData.introPrice),
                introMonths: parseInt(formData.introMonths, 10),
              }
            : {}),
          features: featuresPayload,
          isActive: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.stripeCreated) {
          alert(
            `✅ Membresía creada exitosamente!\n\n💳 Producto en Stripe: Creado\n🔗 Stripe Price ID: ${data.stripePriceId}`
          );
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

  const regularPrice = formData.price || '49';
  const introExample = formData.introPrice || '19';
  const introN = formData.introMonths || '3';
  const cycleLabel = formData.billingCycle === 'yearly' ? 'años' : 'meses';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Crear Membresía</h2>
          <p className="text-sm text-gray-600 mt-1">
            Misma configuración de features que al editar. Puedes ajustar todo después.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                <option value="seller">Vendedor</option>
                <option value="business">Negocio automotriz</option>
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
              <label className="block text-sm font-medium mb-2">Precio regular</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Precio permanente del plan (lo que se cobra siempre, salvo promociones abajo).
              </p>
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

          <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/50 space-y-3">
            <p className="text-sm font-semibold text-amber-900">
              Precio de lanzamiento (opcional) — oferta del catálogo por fecha
            </p>
            <p className="text-xs text-amber-900/80">
              Hasta la fecha que indiques, <strong>todos</strong> ven y pagan el precio de lanzamiento.
              Cuando llega esa fecha, el catálogo vuelve solo al precio regular. No es por suscriptor:
              es una oferta de calendario.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Precio lanzamiento</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.launchPrice}
                  onChange={(e) => setFormData({ ...formData, launchPrice: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ej: 29"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Válido hasta</label>
                <input
                  type="datetime-local"
                  value={formData.launchEndsAt}
                  onChange={(e) => setFormData({ ...formData, launchEndsAt: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50/50 space-y-3">
            <p className="text-sm font-semibold text-emerald-900">
              Precio intro por N cobros (opcional) — descuento por suscriptor
            </p>
            <p className="text-xs text-emerald-900/80">
              Cada persona que se suscriba paga un precio más bajo durante los primeros N cobros
              (meses si el plan es mensual; años si es anual). Después Stripe pasa solo al precio
              regular. No depende de una fecha del calendario: el descuento arranca cuando esa
              persona se suscribe.
            </p>
            <p className="text-xs bg-white/70 border border-emerald-100 rounded px-3 py-2 text-emerald-950">
              Ejemplo: regular ${regularPrice}, intro ${introExample} × {introN} {cycleLabel} →
              cobra ${introExample} los primeros {introN} {cycleLabel}, luego ${regularPrice}{' '}
              automáticamente.
            </p>
            <p className="text-xs text-gray-600">
              Déjalo vacío si no quieres este tipo de promo. Si solo quieres oferta hasta una fecha,
              usa solo &quot;Precio de lanzamiento&quot; arriba.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Precio intro (lo que paga al inicio)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.introPrice}
                  onChange={(e) => setFormData({ ...formData, introPrice: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Vacío = sin intro"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Cuántos cobros al precio intro
                </label>
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={formData.introMonths}
                  onChange={(e) => setFormData({ ...formData, introMonths: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ej: 1 = primer mes"
                />
              </div>
            </div>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💳</span>
              <div>
                <h4 className="font-semibold text-primary-900 mb-1">
                  Integración automática con Stripe
                </h4>
                <p className="text-sm text-primary-700">
                  Al crear, se generan en Stripe el producto y los precios (regular y, si aplica,
                  lanzamiento / intro).
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Límites numéricos</label>
            <p className="text-xs text-gray-500 mb-3">Deja vacío para ilimitado</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(
                ([
                  ['maxSellers', 'Máx. vendedores'],
                  [
                    'maxInventory',
                    formData.type === 'business' ? 'Máx. piezas / productos' : 'Máx. inventario',
                  ],
                  ['maxCampaigns', 'Máx. campañas'],
                  ['maxPromotions', 'Máx. promociones'],
                  ['maxLeadsPerMonth', 'Máx. leads nuevos / mes'],
                  ['maxAppointmentsPerMonth', 'Máx. citas / mes'],
                  ['maxStorageGB', 'Almacenamiento (GB)'],
                  ['maxApiCallsPerMonth', 'Llamadas API / mes'],
                  ['maxCustomerDocumentRequestsPerMonth', 'Máx. solicitudes docs / mes'],
                ] as const).filter(([key]) => formData.type !== 'business' || key !== 'maxSellers')
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-600 mb-1">{label}</label>
                  <input
                    type="number"
                    value={str(key)}
                    onChange={(e) => setFeature(key, e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Ilimitado"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Features</label>
            <p className="text-xs text-gray-500 mb-3">
              Todas las opciones del plan (igual que en Editar membresía).
            </p>
            <div className="max-h-[28rem] overflow-y-auto border rounded p-3 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">🌐 Dominios y branding</h4>
                <FeatureCheckbox
                  label="Subdominio personalizado"
                  checked={bool('customSubdomain')}
                  onChange={(v) => setFeature('customSubdomain', v)}
                />
                {formData.type !== 'business' ? (
                  <FeatureCheckbox
                    label="Dominio propio"
                    checked={bool('customDomain')}
                    onChange={(v) => setFeature('customDomain', v)}
                  />
                ) : null}
                <FeatureCheckbox
                  label="White Label"
                  checked={bool('whiteLabel')}
                  onChange={(v) => setFeature('whiteLabel', v)}
                />
                <FeatureCheckbox
                  label="Branding personalizado"
                  checked={bool('customBranding')}
                  onChange={(v) => setFeature('customBranding', v)}
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">🤖 IA</h4>
                <FeatureCheckbox
                  label="IA habilitada"
                  checked={bool('aiEnabled')}
                  onChange={(v) => setFeature('aiEnabled', v)}
                />
                <FeatureCheckbox
                  label="Respuestas automáticas"
                  checked={bool('aiAutoResponses')}
                  onChange={(v) => setFeature('aiAutoResponses', v)}
                />
                <FeatureCheckbox
                  label="Generación de contenido"
                  checked={bool('aiContentGeneration')}
                  onChange={(v) => setFeature('aiContentGeneration', v)}
                />
                <FeatureCheckbox
                  label="Clasificación de leads"
                  checked={bool('aiLeadClassification')}
                  onChange={(v) => setFeature('aiLeadClassification', v)}
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">📱 Redes sociales</h4>
                <FeatureCheckbox
                  label="Redes sociales"
                  checked={bool('socialMediaEnabled')}
                  onChange={(v) => setFeature('socialMediaEnabled', v)}
                />
                <FeatureCheckbox
                  label="Programar posts"
                  checked={bool('socialMediaScheduling')}
                  onChange={(v) => setFeature('socialMediaScheduling', v)}
                />
                <FeatureCheckbox
                  label="Analytics sociales"
                  checked={bool('socialMediaAnalytics')}
                  onChange={(v) => setFeature('socialMediaAnalytics', v)}
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">🛒 Marketplace</h4>
                <FeatureCheckbox
                  label="Marketplace"
                  checked={bool('marketplaceEnabled')}
                  onChange={(v) => setFeature('marketplaceEnabled', v)}
                />
                <FeatureCheckbox
                  label="Destacado"
                  checked={bool('marketplaceFeatured')}
                  onChange={(v) => setFeature('marketplaceFeatured', v)}
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">📊 Reportes</h4>
                <FeatureCheckbox
                  label="Reportes avanzados"
                  checked={bool('advancedReports')}
                  onChange={(v) => setFeature('advancedReports', v)}
                />
                <FeatureCheckbox
                  label="Reportes personalizados"
                  checked={bool('customReports')}
                  onChange={(v) => setFeature('customReports', v)}
                />
                <FeatureCheckbox
                  label="Exportar datos"
                  checked={bool('exportData')}
                  onChange={(v) => setFeature('exportData', v)}
                />
                <FeatureCheckbox
                  label="Analytics avanzados"
                  checked={bool('analyticsAdvanced')}
                  onChange={(v) => setFeature('analyticsAdvanced', v)}
                />
                <FeatureCheckbox
                  label="Pruebas A/B"
                  checked={bool('aBTesting')}
                  onChange={(v) => setFeature('aBTesting', v)}
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">🔌 API</h4>
                <FeatureCheckbox
                  label="API REST"
                  checked={bool('apiAccess')}
                  onChange={(v) => setFeature('apiAccess', v)}
                />
                <FeatureCheckbox
                  label="Webhooks"
                  checked={bool('webhooks')}
                  onChange={(v) => setFeature('webhooks', v)}
                />
                <FeatureCheckbox
                  label="Integraciones ilimitadas"
                  checked={bool('integrationsUnlimited')}
                  onChange={(v) => setFeature('integrationsUnlimited', v)}
                />
                <FeatureCheckbox
                  label="Integraciones personalizadas"
                  checked={bool('customIntegrations')}
                  onChange={(v) => setFeature('customIntegrations', v)}
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">📢 Marketing</h4>
                <FeatureCheckbox
                  label="Email marketing"
                  checked={bool('emailMarketing')}
                  onChange={(v) => setFeature('emailMarketing', v)}
                />
                <FeatureCheckbox
                  label="SMS marketing"
                  checked={bool('smsMarketing')}
                  onChange={(v) => setFeature('smsMarketing', v)}
                />
                <FeatureCheckbox
                  label="WhatsApp marketing"
                  checked={bool('whatsappMarketing')}
                  onChange={(v) => setFeature('whatsappMarketing', v)}
                />
                <FeatureCheckbox
                  label="Promociones gratis en landing"
                  checked={bool('freePromotionsOnLanding')}
                  onChange={(v) => setFeature('freePromotionsOnLanding', v)}
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">👥 CRM y leads</h4>
                <FeatureCheckbox
                  label="CRM avanzado"
                  checked={bool('crmAdvanced')}
                  onChange={(v) => setFeature('crmAdvanced', v)}
                />
                <FeatureCheckbox
                  label="Scoring de leads"
                  checked={bool('leadScoring')}
                  onChange={(v) => setFeature('leadScoring', v)}
                />
                <FeatureCheckbox
                  label="Workflows"
                  checked={bool('automationWorkflows')}
                  onChange={(v) => setFeature('automationWorkflows', v)}
                />
                <FeatureCheckbox
                  label="Solicitar documentos al cliente"
                  checked={bool('customerDocumentRequestsEnabled')}
                  onChange={(v) => setFeature('customerDocumentRequestsEnabled', v)}
                />
              </div>

              {(formData.type === 'dealer' || formData.type === 'seller') && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Módulo F&amp;I</h4>
                  <FeatureCheckbox
                    label="Módulo F&I (finanzas y seguros)"
                    checked={bool('fiModule')}
                    onChange={(v) => setFeature('fiModule', v)}
                  />
                  {formData.type === 'dealer' && (
                    <FeatureCheckbox
                      label="Varios gerentes F&I"
                      checked={bool('fiMultipleManagers')}
                      onChange={(v) => setFeature('fiMultipleManagers', v)}
                    />
                  )}
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">🎙️ Agente de Voz IA</h4>
                <FeatureCheckbox
                  label="Agente de Voz IA habilitado"
                  checked={bool('voiceAIEnabled')}
                  onChange={(v) => setFeature('voiceAIEnabled', v)}
                  comingSoon
                />
                {bool('voiceAIEnabled') && (
                  <>
                    <FeatureCheckbox
                      label="Llamadas entrantes IA"
                      checked={bool('voiceInboundEnabled')}
                      onChange={(v) => setFeature('voiceInboundEnabled', v)}
                      comingSoon
                    />
                    <FeatureCheckbox
                      label="Llamadas salientes IA"
                      checked={bool('voiceOutboundEnabled')}
                      onChange={(v) => setFeature('voiceOutboundEnabled', v)}
                      comingSoon
                    />
                    <FeatureCheckbox
                      label="Citas de servicio por voz"
                      checked={bool('voiceServiceCallsEnabled')}
                      onChange={(v) => setFeature('voiceServiceCallsEnabled', v)}
                      comingSoon
                    />
                    <FeatureCheckbox
                      label="Campañas de llamadas"
                      checked={bool('voiceCampaignsEnabled')}
                      onChange={(v) => setFeature('voiceCampaignsEnabled', v)}
                    />
                  </>
                )}
                <FeatureCheckbox
                  label="Facturación automática de excesos (overage)"
                  checked={bool('overageBillingEnabled')}
                  onChange={(v) => setFeature('overageBillingEnabled', v)}
                />
                <h4 className="text-xs font-semibold text-gray-700 mb-2 mt-3">💼 DMS / Compensación</h4>
                <FeatureCheckbox
                  label="Portal Mi Compensación"
                  checked={bool('compensationPortalEnabled')}
                  onChange={(v) => setFeature('compensationPortalEnabled', v)}
                />
                <FeatureCheckbox
                  label="DMS Servicio"
                  checked={bool('dmsServiceEnabled')}
                  onChange={(v) => setFeature('dmsServiceEnabled', v)}
                />
                <FeatureCheckbox
                  label="DMS Piezas"
                  checked={bool('dmsPartsEnabled')}
                  onChange={(v) => setFeature('dmsPartsEnabled', v)}
                />
                <FeatureCheckbox
                  label="DMS Finanzas"
                  checked={bool('dmsFinanceEnabled')}
                  onChange={(v) => setFeature('dmsFinanceEnabled', v)}
                />
                <FeatureCheckbox
                  label="DMS RR.HH."
                  checked={bool('dmsHrEnabled')}
                  onChange={(v) => setFeature('dmsHrEnabled', v)}
                />
                <FeatureCheckbox
                  label="API pública"
                  checked={bool('publicApiEnabled')}
                  onChange={(v) => setFeature('publicApiEnabled', v)}
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">🎬 Multimedia</h4>
                <FeatureCheckbox
                  label="Videos"
                  checked={bool('videoUploads')}
                  onChange={(v) => setFeature('videoUploads', v)}
                />
                <FeatureCheckbox
                  label="Tours virtuales"
                  checked={bool('virtualTours')}
                  onChange={(v) => setFeature('virtualTours', v)}
                />
                <FeatureCheckbox
                  label="Templates personalizados"
                  checked={bool('customTemplates')}
                  onChange={(v) => setFeature('customTemplates', v)}
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">⚙️ Servicios</h4>
                <FeatureCheckbox
                  label="Chat en vivo"
                  checked={bool('liveChat')}
                  onChange={(v) => setFeature('liveChat', v)}
                />
                <FeatureCheckbox
                  label="Citas"
                  checked={bool('appointmentScheduling')}
                  onChange={(v) => setFeature('appointmentScheduling', v)}
                />
                <FeatureCheckbox
                  label="Pagos"
                  checked={bool('paymentProcessing')}
                  onChange={(v) => setFeature('paymentProcessing', v)}
                />
                <FeatureCheckbox
                  label="Sincronización inventario"
                  checked={bool('inventorySync')}
                  onChange={(v) => setFeature('inventorySync', v)}
                />
                <FeatureCheckbox
                  label="SSO"
                  checked={bool('ssoEnabled')}
                  onChange={(v) => setFeature('ssoEnabled', v)}
                />
                <FeatureCheckbox
                  label="Múltiples idiomas"
                  checked={bool('multiLanguage')}
                  onChange={(v) => setFeature('multiLanguage', v)}
                />
                <FeatureCheckbox
                  label="App móvil"
                  checked={bool('mobileApp')}
                  onChange={(v) => setFeature('mobileApp', v)}
                />
                <FeatureCheckbox
                  label="Modo offline"
                  checked={bool('offlineMode')}
                  onChange={(v) => setFeature('offlineMode', v)}
                />
                <FeatureCheckbox
                  label="Backup automático"
                  checked={bool('dataBackup')}
                  onChange={(v) => setFeature('dataBackup', v)}
                />
                <FeatureCheckbox
                  label="Cumplimiento"
                  checked={bool('complianceTools')}
                  onChange={(v) => setFeature('complianceTools', v)}
                />
                <FeatureCheckbox
                  label="SEO"
                  checked={bool('seoTools')}
                  onChange={(v) => setFeature('seoTools', v)}
                />
              </div>

              {(formData.type === 'dealer' || formData.type === 'seller') && (
                <div className="md:col-span-2 lg:col-span-3">
                  <h4 className="text-sm font-bold text-gray-900 mb-1">📦 Inventario competitivo</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Activas por defecto (opt-out). Desmarca solo si quieres apagarlas en este plan.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    <FeatureCheckbox
                      label="Escaneo VIN con cámara"
                      checked={bool('vin_camera_scan')}
                      onChange={(v) => setFeature('vin_camera_scan', v)}
                    />
                    <FeatureCheckbox
                      label="Landing + QR compartir"
                      checked={bool('share_landing')}
                      onChange={(v) => setFeature('share_landing', v)}
                    />
                    <FeatureCheckbox
                      label="Guía de fotos"
                      checked={bool('photo_guide')}
                      onChange={(v) => setFeature('photo_guide', v)}
                    />
                    <FeatureCheckbox
                      label="Quitar fondo (IA)"
                      checked={bool('bg_remover')}
                      onChange={(v) => setFeature('bg_remover', v)}
                    />
                    <FeatureCheckbox
                      label="Escenas dinámicas"
                      checked={bool('dynamic_scenes')}
                      onChange={(v) => setFeature('dynamic_scenes', v)}
                    />
                    <FeatureCheckbox
                      label="Etiquetas DACO + QR"
                      checked={bool('daco_labels')}
                      onChange={(v) => setFeature('daco_labels', v)}
                    />
                    {formData.type === 'dealer' ? (
                      <>
                        <FeatureCheckbox
                          label="Constructor sitio dealer"
                          checked={bool('dealer_site_builder')}
                          onChange={(v) => setFeature('dealer_site_builder', v)}
                        />
                        <FeatureCheckbox
                          label="Alianzas de inventario"
                          checked={bool('inventory_alliances')}
                          onChange={(v) => setFeature('inventory_alliances', v)}
                        />
                        <FeatureCheckbox
                          label="Sync por feed URL"
                          checked={bool('inventory_feed_sync')}
                          onChange={(v) => setFeature('inventory_feed_sync', v)}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">🎧 Soporte</h4>
                <FeatureCheckbox
                  label="Soporte prioritario"
                  checked={bool('prioritySupport')}
                  onChange={(v) => setFeature('prioritySupport', v)}
                />
                <FeatureCheckbox
                  label="Gerente dedicado"
                  checked={bool('dedicatedManager')}
                  onChange={(v) => setFeature('dedicatedManager', v)}
                />
                <FeatureCheckbox
                  label="Entrenamiento"
                  checked={bool('trainingSessions')}
                  onChange={(v) => setFeature('trainingSessions', v)}
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">📧 Email corporativo</h4>
                <FeatureCheckbox
                  label="Email corporativo habilitado"
                  checked={bool('corporateEmailEnabled')}
                  onChange={(v) => setFeature('corporateEmailEnabled', v)}
                />
                {bool('corporateEmailEnabled') && (
                  <>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-600 mb-1">
                        Máx. emails corporativos
                      </label>
                      <input
                        type="number"
                        value={str('maxCorporateEmails')}
                        onChange={(e) => setFeature('maxCorporateEmails', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Ilimitado"
                        min={0}
                      />
                    </div>
                    <FeatureCheckbox
                      label="Firma básica de email"
                      checked={bool('emailSignatureBasic')}
                      onChange={(v) => setFeature('emailSignatureBasic', v)}
                    />
                    <FeatureCheckbox
                      label="Firma avanzada (HTML, imágenes)"
                      checked={bool('emailSignatureAdvanced')}
                      onChange={(v) => setFeature('emailSignatureAdvanced', v)}
                    />
                    <FeatureCheckbox
                      label="Aliases de email (ej: ventas@)"
                      checked={bool('emailAliases')}
                      onChange={(v) => setFeature('emailAliases', v)}
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
                Sigue siendo un plan Dealer con permisos extra para varias sedes.
              </p>
              <FeatureCheckbox
                label="Plan multi-concesionario (varias sedes / red)"
                checked={bool('multiDealerEnabled')}
                onChange={(v) => setFeature('multiDealerEnabled', v)}
              />
              {bool('multiDealerEnabled') && (
                <div className="mt-3 space-y-3 pl-1">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Máx. concesionarios en la red (vacío = ilimitado)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={str('maxDealers')}
                      onChange={(e) => setFeature('maxDealers', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Ilimitado"
                    />
                  </div>
                  <FeatureCheckbox
                    label="Alta multi-dealer requiere aprobación administrativa"
                    checked={bool('requiresAdminApproval')}
                    onChange={(v) => setFeature('requiresAdminApproval', v)}
                  />
                  <FeatureCheckbox
                    label="Compat. legado: multipleDealers"
                    checked={bool('multipleDealers')}
                    onChange={(v) => setFeature('multipleDealers', v)}
                  />
                </div>
              )}
            </div>
          )}

          {dynamicFeatures.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">✨ Features dinámicas</label>
                <span className="text-xs text-gray-500">
                  {dynamicFeatures.length} disponible
                  {dynamicFeatures.length !== 1 ? 's' : ''}
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
                      <span className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded">
                        {feature.type}
                      </span>
                    </div>

                    {feature.type === 'boolean' && (
                      <FeatureCheckbox
                        label={`Habilitar ${feature.name}`}
                        checked={bool(feature.key)}
                        onChange={(v) => setFeature(feature.key, v)}
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
                          value={str(feature.key)}
                          onChange={(e) => setFeature(feature.key, e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="Ilimitado"
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
                          value={str(feature.key)}
                          onChange={(e) => setFeature(feature.key, e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="Valor personalizado"
                        />
                      </div>
                    )}

                    {feature.type === 'select' && feature.options && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{feature.name}</label>
                        <select
                          value={str(feature.key)}
                          onChange={(e) => setFeature(feature.key, e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Seleccionar...</option>
                          {feature.options.map((option: string) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
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
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
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
