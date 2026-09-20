'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type PlanKind = 'seller' | 'dealer' | 'multi_dealer';
type BillingCycle = 'monthly' | 'yearly';

type CustomMembership = {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  isActive?: boolean;
  stripePriceId?: string;
  features?: Record<string, unknown>;
};

type Assignment = {
  id: string;
  membershipId: string;
  userId: string;
  tenantId: string;
  status: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  tenantName?: string;
  membershipName?: string;
  planKind?: PlanKind;
  stripeSubscriptionId?: string;
  assignedAt?: string;
};

type UserOption = {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  tenantId?: string;
};

type DealerOption = {
  id: string;
  name?: string;
  companyName?: string;
  email?: string;
  tenantId?: string;
};

type FeatureState = {
  maxInventory: string;
  maxSellers: string;
  maxCampaigns: string;
  maxPromotions: string;
  maxLeadsPerMonth: string;
  maxAppointmentsPerMonth: string;
  maxStorageGB: string;
  maxCorporateEmails: string;
  maxDealers: string;
  maxCustomerDocumentRequestsPerMonth: string;
  dealerNamesText: string;
  customSubdomain: boolean;
  customDomain: boolean;
  marketplaceEnabled: boolean;
  marketplaceFeatured: boolean;
  aiEnabled: boolean;
  aiAutoResponses: boolean;
  aiContentGeneration: boolean;
  aiLeadClassification: boolean;
  socialMediaEnabled: boolean;
  socialMediaScheduling: boolean;
  socialMediaAnalytics: boolean;
  advancedReports: boolean;
  customReports: boolean;
  exportData: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  ssoEnabled: boolean;
  multiLanguage: boolean;
  customTemplates: boolean;
  emailMarketing: boolean;
  smsMarketing: boolean;
  whatsappMarketing: boolean;
  videoUploads: boolean;
  virtualTours: boolean;
  liveChat: boolean;
  appointmentScheduling: boolean;
  paymentProcessing: boolean;
  inventorySync: boolean;
  crmAdvanced: boolean;
  leadScoring: boolean;
  automationWorkflows: boolean;
  integrationsUnlimited: boolean;
  prioritySupport: boolean;
  dedicatedManager: boolean;
  trainingSessions: boolean;
  customBranding: boolean;
  mobileApp: boolean;
  offlineMode: boolean;
  dataBackup: boolean;
  complianceTools: boolean;
  analyticsAdvanced: boolean;
  aBTesting: boolean;
  seoTools: boolean;
  customIntegrations: boolean;
  freePromotionsOnLanding: boolean;
  fiModule: boolean;
  fiMultipleManagers: boolean;
  corporateEmailEnabled: boolean;
  emailSignatureBasic: boolean;
  emailSignatureAdvanced: boolean;
  emailAliases: boolean;
  customerDocumentRequestsEnabled: boolean;
  voiceAIEnabled: boolean;
  voiceInboundEnabled: boolean;
  voiceOutboundEnabled: boolean;
  voiceServiceCallsEnabled: boolean;
  voiceCampaignsEnabled: boolean;
  overageBillingEnabled: boolean;
  compensationPortalEnabled: boolean;
  publicApiEnabled: boolean;
  vin_camera_scan: boolean;
  share_landing: boolean;
  photo_guide: boolean;
  bg_remover: boolean;
  dynamic_scenes: boolean;
  daco_labels: boolean;
  dealer_site_builder: boolean;
  inventory_alliances: boolean;
  inventory_feed_sync: boolean;
};

const PLAN_LABELS: Record<PlanKind, string> = {
  seller: 'Vendedor',
  dealer: 'Dealer',
  multi_dealer: 'Multi Dealer',
};

const BOOLEAN_FEATURES: Array<{ key: keyof FeatureState; label: string; group: string }> = [
  { key: 'customSubdomain', label: 'Subdominio propio', group: 'Web y marketplace' },
  { key: 'customDomain', label: 'Dominio propio', group: 'Web y marketplace' },
  { key: 'marketplaceEnabled', label: 'Marketplace activo', group: 'Web y marketplace' },
  { key: 'marketplaceFeatured', label: 'Destacado en marketplace', group: 'Web y marketplace' },
  { key: 'freePromotionsOnLanding', label: 'Promociones gratis en landing', group: 'Web y marketplace' },
  { key: 'aiEnabled', label: 'IA habilitada', group: 'IA y automatización' },
  { key: 'aiAutoResponses', label: 'Respuestas automáticas IA', group: 'IA y automatización' },
  { key: 'aiContentGeneration', label: 'Generación de contenido IA', group: 'IA y automatización' },
  { key: 'aiLeadClassification', label: 'Clasificación de leads IA', group: 'IA y automatización' },
  { key: 'automationWorkflows', label: 'Workflows automatizados', group: 'IA y automatización' },
  { key: 'socialMediaEnabled', label: 'Redes sociales', group: 'Marketing' },
  { key: 'socialMediaScheduling', label: 'Programar publicaciones', group: 'Marketing' },
  { key: 'socialMediaAnalytics', label: 'Analytics de redes', group: 'Marketing' },
  { key: 'emailMarketing', label: 'Email marketing', group: 'Marketing' },
  { key: 'smsMarketing', label: 'SMS marketing', group: 'Marketing' },
  { key: 'whatsappMarketing', label: 'WhatsApp marketing', group: 'Marketing' },
  { key: 'advancedReports', label: 'Reportes avanzados', group: 'Reportes y datos' },
  { key: 'customReports', label: 'Reportes personalizados', group: 'Reportes y datos' },
  { key: 'exportData', label: 'Exportar data', group: 'Reportes y datos' },
  { key: 'analyticsAdvanced', label: 'Analytics avanzados', group: 'Reportes y datos' },
  { key: 'aBTesting', label: 'Pruebas A/B', group: 'Reportes y datos' },
  { key: 'crmAdvanced', label: 'CRM avanzado', group: 'CRM y ventas' },
  { key: 'leadScoring', label: 'Lead scoring', group: 'CRM y ventas' },
  { key: 'liveChat', label: 'Chat en vivo', group: 'CRM y ventas' },
  { key: 'appointmentScheduling', label: 'Sistema de citas', group: 'CRM y ventas' },
  { key: 'videoUploads', label: 'Videos de vehículos', group: 'Inventario' },
  { key: 'virtualTours', label: 'Tours virtuales', group: 'Inventario' },
  { key: 'inventorySync', label: 'Sincronización de inventario', group: 'Inventario' },
  { key: 'fiModule', label: 'Módulo F&I', group: 'Dealer / F&I' },
  { key: 'fiMultipleManagers', label: 'Múltiples managers F&I', group: 'Dealer / F&I' },
  { key: 'corporateEmailEnabled', label: 'Email corporativo', group: 'Email corporativo' },
  { key: 'emailSignatureBasic', label: 'Firma básica', group: 'Email corporativo' },
  { key: 'emailSignatureAdvanced', label: 'Firma avanzada', group: 'Email corporativo' },
  { key: 'emailAliases', label: 'Aliases de email', group: 'Email corporativo' },
  { key: 'whiteLabel', label: 'White label', group: 'Personalización' },
  { key: 'customTemplates', label: 'Templates personalizados', group: 'Personalización' },
  { key: 'customBranding', label: 'Branding personalizado', group: 'Personalización' },
  { key: 'apiAccess', label: 'API access', group: 'Integraciones' },
  { key: 'webhooks', label: 'Webhooks', group: 'Integraciones' },
  { key: 'customIntegrations', label: 'Integraciones custom', group: 'Integraciones' },
  { key: 'integrationsUnlimited', label: 'Integraciones ilimitadas', group: 'Integraciones' },
  { key: 'ssoEnabled', label: 'SSO', group: 'Enterprise' },
  { key: 'multiLanguage', label: 'Multi idioma', group: 'Enterprise' },
  { key: 'mobileApp', label: 'App móvil', group: 'Enterprise' },
  { key: 'offlineMode', label: 'Modo offline', group: 'Enterprise' },
  { key: 'dataBackup', label: 'Backup automático', group: 'Enterprise' },
  { key: 'complianceTools', label: 'Compliance tools', group: 'Enterprise' },
  { key: 'prioritySupport', label: 'Soporte prioritario', group: 'Soporte' },
  { key: 'dedicatedManager', label: 'Manager dedicado', group: 'Soporte' },
  { key: 'trainingSessions', label: 'Entrenamientos', group: 'Soporte' },
  { key: 'customerDocumentRequestsEnabled', label: 'Solicitudes de documentos', group: 'Expediente CRM' },
  { key: 'voiceAIEnabled', label: 'Agente de Voz IA', group: 'Voz / DMS' },
  { key: 'voiceInboundEnabled', label: 'Llamadas entrantes IA', group: 'Voz / DMS' },
  { key: 'voiceOutboundEnabled', label: 'Llamadas salientes IA', group: 'Voz / DMS' },
  { key: 'voiceServiceCallsEnabled', label: 'Citas de servicio por voz', group: 'Voz / DMS' },
  { key: 'voiceCampaignsEnabled', label: 'Campañas de llamadas', group: 'Voz / DMS' },
  { key: 'overageBillingEnabled', label: 'Facturación de excesos', group: 'Voz / DMS' },
  { key: 'compensationPortalEnabled', label: 'Portal Mi Compensación', group: 'Voz / DMS' },
  { key: 'publicApiEnabled', label: 'API pública', group: 'Integraciones' },
  { key: 'vin_camera_scan', label: 'Escaneo VIN', group: 'Inventario competitivo' },
  { key: 'share_landing', label: 'Landing + QR', group: 'Inventario competitivo' },
  { key: 'photo_guide', label: 'Guía de fotos', group: 'Inventario competitivo' },
  { key: 'bg_remover', label: 'Quitar fondo', group: 'Inventario competitivo' },
  { key: 'dynamic_scenes', label: 'Escenas dinámicas', group: 'Inventario competitivo' },
  { key: 'daco_labels', label: 'Etiquetas DACO', group: 'Inventario competitivo' },
  { key: 'dealer_site_builder', label: 'Constructor sitio dealer', group: 'Inventario competitivo' },
  { key: 'inventory_alliances', label: 'Alianzas inventario', group: 'Inventario competitivo' },
  { key: 'inventory_feed_sync', label: 'Sync feed URL', group: 'Inventario competitivo' },
];

const EMPTY_FEATURES: FeatureState = {
  maxInventory: '50',
  maxSellers: '',
  maxCampaigns: '',
  maxPromotions: '',
  maxLeadsPerMonth: '',
  maxAppointmentsPerMonth: '',
  maxStorageGB: '',
  maxCorporateEmails: '',
  maxDealers: '',
  maxCustomerDocumentRequestsPerMonth: '',
  dealerNamesText: '',
  customSubdomain: true,
  customDomain: false,
  marketplaceEnabled: true,
  marketplaceFeatured: false,
  aiEnabled: false,
  aiAutoResponses: false,
  aiContentGeneration: false,
  aiLeadClassification: false,
  socialMediaEnabled: true,
  socialMediaScheduling: false,
  socialMediaAnalytics: false,
  advancedReports: true,
  customReports: false,
  exportData: true,
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
  crmAdvanced: true,
  leadScoring: false,
  automationWorkflows: false,
  integrationsUnlimited: false,
  prioritySupport: true,
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
  corporateEmailEnabled: false,
  emailSignatureBasic: false,
  emailSignatureAdvanced: false,
  emailAliases: false,
  customerDocumentRequestsEnabled: true,
  voiceAIEnabled: false,
  voiceInboundEnabled: false,
  voiceOutboundEnabled: false,
  voiceServiceCallsEnabled: false,
  voiceCampaignsEnabled: false,
  overageBillingEnabled: false,
  compensationPortalEnabled: true,
  publicApiEnabled: false,
  vin_camera_scan: true,
  share_landing: true,
  photo_guide: true,
  bg_remover: true,
  dynamic_scenes: true,
  daco_labels: true,
  dealer_site_builder: true,
  inventory_alliances: true,
  inventory_feed_sync: true,
};

function planKindFromMembership(membership: Pick<CustomMembership, 'type' | 'features'>): PlanKind {
  const kind = membership.features?.customMembershipKind;
  if (kind === 'multi_dealer') return 'multi_dealer';
  if (membership.type === 'dealer' && membership.features?.multiDealerEnabled === true) return 'multi_dealer';
  return membership.type === 'dealer' ? 'dealer' : 'seller';
}

function numberOrNull(value: string): number | null | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildFeatures(input: FeatureState, planKind: PlanKind): Record<string, unknown> {
  const features: Record<string, unknown> = {
    customMembershipKind: planKind,
    maxInventory: numberOrNull(input.maxInventory),
    maxSellers: planKind === 'seller' ? undefined : numberOrNull(input.maxSellers),
    maxCampaigns: numberOrNull(input.maxCampaigns),
    maxPromotions: numberOrNull(input.maxPromotions),
    maxLeadsPerMonth: numberOrNull(input.maxLeadsPerMonth),
    maxAppointmentsPerMonth: numberOrNull(input.maxAppointmentsPerMonth),
    maxStorageGB: numberOrNull(input.maxStorageGB),
    maxCorporateEmails: input.corporateEmailEnabled ? numberOrNull(input.maxCorporateEmails) : undefined,
    maxCustomerDocumentRequestsPerMonth: numberOrNull(input.maxCustomerDocumentRequestsPerMonth),
    dealerNames:
      planKind === 'multi_dealer'
        ? input.dealerNamesText
            .split('\n')
            .map((name) => name.trim())
            .filter(Boolean)
        : [],
    multiDealerEnabled: planKind === 'multi_dealer',
    multipleDealers: planKind === 'multi_dealer',
    maxDealers: planKind === 'multi_dealer' ? numberOrNull(input.maxDealers) : undefined,
    requiresAdminApproval: planKind === 'multi_dealer',
  };

  for (const item of BOOLEAN_FEATURES) {
    features[item.key] = Boolean(input[item.key]);
  }

  return features;
}

function featuresToState(features?: Record<string, unknown>): FeatureState {
  const read = (key: keyof FeatureState) => features?.[key];
  const bool = (key: keyof FeatureState) => read(key) === true;
  const text = (key: keyof FeatureState) => {
    const value = read(key);
    return typeof value === 'number' ? String(value) : value === null ? '' : String(value ?? '');
  };

  return {
    ...EMPTY_FEATURES,
    maxInventory: text('maxInventory') || EMPTY_FEATURES.maxInventory,
    maxSellers: text('maxSellers'),
    maxCampaigns: text('maxCampaigns'),
    maxPromotions: text('maxPromotions'),
    maxLeadsPerMonth: text('maxLeadsPerMonth'),
    maxAppointmentsPerMonth: text('maxAppointmentsPerMonth'),
    maxStorageGB: text('maxStorageGB'),
    maxCorporateEmails: text('maxCorporateEmails'),
    maxDealers: text('maxDealers'),
    maxCustomerDocumentRequestsPerMonth: text('maxCustomerDocumentRequestsPerMonth'),
    dealerNamesText: Array.isArray(features?.dealerNames)
      ? (features?.dealerNames as unknown[]).map((name) => String(name)).join('\n')
      : '',
    ...Object.fromEntries(BOOLEAN_FEATURES.map((item) => [item.key, bool(item.key)])),
  } as FeatureState;
}

function featureSummary(membership: CustomMembership): string {
  const features = membership.features || {};
  const parts = [
    features.maxInventory ? `${features.maxInventory} vehículos` : '',
    features.maxSellers ? `${features.maxSellers} vendedores` : '',
    features.maxDealers ? `${features.maxDealers} dealers` : '',
    features.aiEnabled ? 'IA' : '',
    features.fiModule ? 'F&I' : '',
    features.corporateEmailEnabled ? 'email corporativo' : '',
    features.prioritySupport ? 'soporte prioritario' : '',
  ].filter(Boolean);
  return parts.join(' · ') || 'Configurable por admin';
}

export default function CustomMembershipsPage() {
  const [memberships, setMemberships] = useState<CustomMembership[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [activeKind, setActiveKind] = useState<PlanKind>('seller');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showCancelledAssignments, setShowCancelledAssignments] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    planKind: 'seller' as PlanKind,
    price: '99',
    currency: 'USD',
    billingCycle: 'monthly' as BillingCycle,
    isActive: true,
  });
  const [features, setFeatures] = useState<FeatureState>(EMPTY_FEATURES);
  const [assignmentMode, setAssignmentMode] = useState<'existing' | 'new'>('existing');
  const [assignmentForm, setAssignmentForm] = useState({
    membershipId: '',
    userId: '',
    dealerId: '',
    newAccount: {
      name: '',
      email: '',
      password: '',
      phone: '',
      companyName: '',
      businessName: '',
      contactEmail: '',
      contactPhone: '',
      whatsapp: '',
      taxId: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Puerto Rico',
      website: '',
      subdomain: '',
    },
  });

  const filteredMemberships = useMemo(
    () => memberships.filter((membership) => planKindFromMembership(membership) === activeKind),
    [memberships, activeKind]
  );

  const visibleAssignments = useMemo(
    () =>
      showCancelledAssignments
        ? assignments
        : assignments.filter((assignment) => assignment.status !== 'cancelled'),
    [assignments, showCancelledAssignments]
  );

  const selectedMembership = memberships.find((m) => m.id === assignmentForm.membershipId);
  const selectedKind = selectedMembership ? planKindFromMembership(selectedMembership) : activeKind;
  const userRoleFilter = selectedKind === 'seller' ? 'seller' : 'dealer';

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const [membershipsRes, assignmentsRes] = await Promise.all([
        fetchWithAuth('/api/admin/custom-memberships'),
        fetchWithAuth('/api/admin/custom-memberships/assignments'),
      ]);
      const membershipsData = await membershipsRes.json().catch(() => ({}));
      const assignmentsData = await assignmentsRes.json().catch(() => ({}));
      if (!membershipsRes.ok) throw new Error(membershipsData.error || 'No se pudieron cargar las membresías.');
      if (!assignmentsRes.ok) throw new Error(assignmentsData.error || 'No se pudieron cargar las asignaciones.');
      const list = Array.isArray(membershipsData.memberships) ? membershipsData.memberships : [];
      setMemberships(list);
      setAssignments(Array.isArray(assignmentsData.assignments) ? assignmentsData.assignments : []);
      setAssignmentForm((prev) => ({ ...prev, membershipId: prev.membershipId || list[0]?.id || '' }));
    } catch (error) {
      setMessage({ type: 'err', text: error instanceof Error ? error.message : 'Error cargando datos.' });
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers(search = userSearch, role = userRoleFilter) {
    try {
      const params = new URLSearchParams({ role });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetchWithAuth(`/api/admin/users?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      setUsers(Array.isArray(data.users) ? data.users.slice(0, 50) : []);
    } catch {
      setUsers([]);
    }
  }

  async function loadDealers() {
    try {
      const res = await fetchWithAuth('/api/admin/users?role=dealer');
      const data = await res.json().catch(() => ({}));
      setDealers(Array.isArray(data.users) ? data.users : []);
    } catch {
      setDealers([]);
    }
  }

  useEffect(() => {
    void load();
    void loadDealers();
  }, []);

  useEffect(() => {
    void searchUsers('', userRoleFilter);
  }, [userRoleFilter]);

  function resetForm(planKind: PlanKind = activeKind) {
    setEditingId(null);
    setForm({
      name: '',
      planKind,
      price: '99',
      currency: 'USD',
      billingCycle: 'monthly',
      isActive: true,
    });
    setFeatures({
      ...EMPTY_FEATURES,
      maxSellers: planKind === 'seller' ? '' : '5',
      maxDealers: planKind === 'multi_dealer' ? '3' : '',
      dealerNamesText: planKind === 'multi_dealer' ? '' : '',
      fiModule: planKind !== 'seller',
      maxInventory: planKind === 'seller' ? '50' : '150',
    });
  }

  function editMembership(membership: CustomMembership) {
    const planKind = planKindFromMembership(membership);
    setEditingId(membership.id);
    setActiveKind(planKind);
    setForm({
      name: membership.name || '',
      planKind,
      price: String(membership.price || 0),
      currency: membership.currency || 'USD',
      billingCycle: membership.billingCycle || 'monthly',
      isActive: membership.isActive !== false,
    });
    setFeatures(featuresToState(membership.features));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveMembership(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const planKind = form.planKind;
      if (planKind === 'multi_dealer') {
        const names = features.dealerNamesText
          .split('\n')
          .map((name) => name.trim())
          .filter(Boolean);
        const maxDealers = Number(features.maxDealers);
        if (!Number.isFinite(maxDealers) || maxDealers <= 0) {
          throw new Error('En Multi Dealer debes colocar cuántos dealers podrá manejar.');
        }
        if (names.length === 0) {
          throw new Error('En Multi Dealer debes colocar los nombres de los dealers que operarán bajo la membresía.');
        }
        if (names.length > maxDealers) {
          throw new Error(`Colocaste ${names.length} dealers, pero el límite configurado es ${maxDealers}.`);
        }
      }
      const res = await fetchWithAuth('/api/admin/custom-memberships', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: form.name,
          planKind,
          type: planKind === 'seller' ? 'seller' : 'dealer',
          price: Number(form.price),
          currency: form.currency,
          billingCycle: form.billingCycle,
          isActive: form.isActive,
          features: buildFeatures(features, planKind),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
      setMessage({
        type: 'ok',
        text: editingId ? 'Membresía custom actualizada.' : 'Membresía custom creada y sincronizada con Stripe.',
      });
      resetForm(planKind);
      setActiveKind(planKind);
      await load();
    } catch (error) {
      setMessage({ type: 'err', text: error instanceof Error ? error.message : 'Error guardando.' });
    } finally {
      setSaving(false);
    }
  }

  async function assignMembership(event: React.FormEvent) {
    event.preventDefault();
    setAssigning(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth('/api/admin/custom-memberships/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId: assignmentForm.membershipId,
          dealerId: selectedKind === 'seller' ? assignmentForm.dealerId || undefined : undefined,
          ...(assignmentMode === 'existing'
            ? { userId: assignmentForm.userId }
            : { newAccount: assignmentForm.newAccount }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo asignar.');
      setMessage({
        type: data.setupRequired ? 'err' : 'ok',
        text: data.setupRequired
          ? `Asignación creada, pero Stripe quedó pendiente de pago. La cuenta seguirá bloqueada hasta que Stripe confirme.${
              data.paymentEmailSent ? ' Enviamos el link de Stripe por email.' : ' No se pudo confirmar envío de email.'
            }${
              data.paymentUrl ? ` Enlace de pago: ${data.paymentUrl}` : ''
            }`
          : 'Membresía custom asignada y activa.',
      });
      setAssignmentForm((prev) => ({
        ...prev,
        userId: '',
        newAccount: {
          name: '',
          email: '',
          password: '',
          phone: '',
          companyName: '',
          businessName: '',
          contactEmail: '',
          contactPhone: '',
          whatsapp: '',
          taxId: '',
          address: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'Puerto Rico',
          website: '',
          subdomain: '',
        },
      }));
      await load();
    } catch (error) {
      setMessage({ type: 'err', text: error instanceof Error ? error.message : 'Error asignando.' });
    } finally {
      setAssigning(false);
    }
  }

  async function cancelAssignment(assignment: Assignment) {
    if (
      !confirm(
        `¿Cancelar la membresía custom de ${assignment.userName || assignment.userEmail || assignment.userId}? Se cancelará Stripe y se revocará acceso si esta era su membresía activa.`
      )
    ) {
      return;
    }
    setAssigning(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth('/api/admin/custom-memberships/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          cancelStripe: true,
          revokeAccess: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo cancelar la asignación.');
      setMessage({ type: 'ok', text: 'Asignación custom cancelada y acceso actualizado.' });
      await load();
    } catch (error) {
      setMessage({ type: 'err', text: error instanceof Error ? error.message : 'Error cancelando asignación.' });
    } finally {
      setAssigning(false);
    }
  }

  const groupedFeatures = BOOLEAN_FEATURES.reduce<Record<string, typeof BOOLEAN_FEATURES>>((acc, item) => {
    acc[item.group] = acc[item.group] || [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Membresías Custom</h1>
        <p className="text-gray-600 mt-1">
          Crea, edita, configura y asigna membresías especiales para vendedores, dealers y multi-dealers.
        </p>
      </div>

      {message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(PLAN_LABELS) as PlanKind[]).map((kind) => (
            <button
              key={kind}
              onClick={() => {
                setActiveKind(kind);
                resetForm(kind);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeKind === kind ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {PLAN_LABELS[kind]} ({memberships.filter((m) => planKindFromMembership(m) === kind).length})
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Planes {PLAN_LABELS[activeKind]}</h2>
              <p className="text-sm text-gray-500">Custom, asignables solo desde admin y ocultos del registro público.</p>
            </div>
            <button onClick={() => void load()} className="text-sm text-primary-700 underline">
              Refrescar
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : filteredMemberships.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              No hay membresías custom de tipo {PLAN_LABELS[activeKind]}.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMemberships.map((membership) => (
                <div key={membership.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{membership.name}</h3>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {PLAN_LABELS[planKindFromMembership(membership)]}
                        </span>
                        <span className={membership.isActive === false ? 'text-xs text-red-700' : 'text-xs text-green-700'}>
                          {membership.isActive === false ? 'Inactiva' : 'Activa'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{featureSummary(membership)}</p>
                      <p className="mt-1 font-mono text-xs text-gray-500">{membership.stripePriceId || 'sin Stripe price'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${Number(membership.price || 0).toFixed(2)} {membership.currency}
                      </p>
                      <p className="text-xs text-gray-500">{membership.billingCycle === 'yearly' ? 'anual' : 'mensual'}</p>
                      <button onClick={() => editMembership(membership)} className="mt-2 text-sm text-primary-700 hover:underline">
                        Editar y configurar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingId ? 'Editar membresía custom' : 'Crear membresía custom'}
          </h2>
          <form onSubmit={saveMembership} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block text-sm">
                Nombre de la membresía
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full rounded border px-3 py-2"
                  required
                />
              </label>
              <label className="block text-sm">
                Tipo
                <select
                  value={form.planKind}
                  onChange={(e) => {
                    const next = e.target.value as PlanKind;
                    setForm((prev) => ({ ...prev, planKind: next }));
                    setActiveKind(next);
                    setFeatures((prev) => ({
                      ...prev,
                      maxSellers: next === 'seller' ? '' : prev.maxSellers || '5',
                      maxDealers: next === 'multi_dealer' ? prev.maxDealers || '3' : '',
                      dealerNamesText: next === 'multi_dealer' ? prev.dealerNamesText : '',
                      fiModule: next === 'seller' ? false : prev.fiModule,
                    }));
                  }}
                  className="mt-1 w-full rounded border px-3 py-2"
                >
                  <option value="seller">Vendedor</option>
                  <option value="dealer">Dealer</option>
                  <option value="multi_dealer">Multi Dealer</option>
                </select>
              </label>
              <label className="block text-sm">
                Precio definido por admin
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="mt-1 w-full rounded border px-3 py-2"
                  required
                />
              </label>
              <label className="block text-sm">
                Ciclo
                <select
                  value={form.billingCycle}
                  onChange={(e) => setForm((prev) => ({ ...prev, billingCycle: e.target.value as BillingCycle }))}
                  className="mt-1 w-full rounded border px-3 py-2"
                >
                  <option value="monthly">Mensual</option>
                  <option value="yearly">Anual</option>
                </select>
              </label>
              <label className="block text-sm">
                Moneda
                <input
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="mt-6 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Activa
              </label>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-gray-900">Límites</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['maxInventory', 'Vehículos'],
                  ['maxSellers', 'Vendedores'],
                  ['maxDealers', 'Dealers asociados'],
                  ['maxCampaigns', 'Campañas'],
                  ['maxPromotions', 'Promociones'],
                  ['maxLeadsPerMonth', 'Leads/mes'],
                  ['maxAppointmentsPerMonth', 'Citas/mes'],
                  ['maxStorageGB', 'Storage GB'],
                  ['maxCorporateEmails', 'Emails corporativos'],
                  ['maxCustomerDocumentRequestsPerMonth', 'Solicitudes docs/mes'],
                ].map(([key, label]) => {
                  const disabled =
                    (key === 'maxSellers' && form.planKind === 'seller') ||
                    (key === 'maxDealers' && form.planKind !== 'multi_dealer') ||
                    (key === 'maxCorporateEmails' && !features.corporateEmailEnabled);
                  return (
                    <label key={key} className="block text-sm">
                      {label}
                      <input
                        type="number"
                        min="0"
                        value={features[key as keyof FeatureState] as string}
                        disabled={disabled}
                        placeholder="Vacío = ilimitado"
                        onChange={(e) =>
                          setFeatures((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="mt-1 w-full rounded border px-3 py-2 disabled:bg-gray-100"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {form.planKind === 'multi_dealer' ? (
              <div className="rounded-lg border border-primary-100 bg-primary-50 p-3">
                <h3 className="font-semibold text-primary-950">Dealers que operarán bajo esta membresía</h3>
                <p className="mt-1 text-sm text-primary-800">
                  Escribe un nombre por línea. El sistema guarda este roster inicial para reconocer la red multi-dealer y luego asociar cada nombre a su tenant.
                </p>
                <textarea
                  value={features.dealerNamesText}
                  onChange={(e) => setFeatures((prev) => ({ ...prev, dealerNamesText: e.target.value }))}
                  rows={5}
                  className="mt-3 w-full rounded border px-3 py-2 text-sm"
                  placeholder={'Dealer Principal\nDealer Bayamón\nDealer Ponce'}
                />
                <p className="mt-2 text-xs text-primary-700">
                  Nombres colocados:{' '}
                  {
                    features.dealerNamesText
                      .split('\n')
                      .map((name) => name.trim())
                      .filter(Boolean).length
                  }{' '}
                  / {features.maxDealers || 'sin límite configurado'}
                </p>
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 font-semibold text-gray-900">Beneficios</h3>
              <div className="max-h-[520px] space-y-4 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {Object.entries(groupedFeatures).map(([group, items]) => (
                  <div key={group}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{group}</p>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {items.map((item) => (
                        <label key={String(item.key)} className="flex items-center gap-2 rounded p-2 text-sm hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={Boolean(features[item.key])}
                            onChange={(e) => setFeatures((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button disabled={saving} className="rounded bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear membresía y Stripe'}
              </button>
              {editingId ? (
                <button type="button" onClick={() => resetForm(activeKind)} className="rounded border px-4 py-2 text-sm">
                  Cancelar edición
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow">
        <h2 className="text-xl font-semibold text-gray-900">Asignar membresía custom</h2>
        <p className="mt-1 text-sm text-gray-500">
          Selecciona la membresía y busca el usuario. El sistema valida si debe ser vendedor, dealer o multi-dealer.
        </p>
        <form onSubmit={assignMembership} className="mt-4 space-y-4">
          <label className="block text-sm">
            Membresía
            <select
              value={assignmentForm.membershipId}
              onChange={(e) =>
                setAssignmentForm((prev) => ({ ...prev, membershipId: e.target.value, userId: '' }))
              }
              className="mt-1 w-full rounded border px-3 py-2"
              required
            >
              <option value="">Seleccionar</option>
              {memberships.map((membership) => (
                <option key={membership.id} value={membership.id}>
                  {membership.name} - {PLAN_LABELS[planKindFromMembership(membership)]} (${membership.price})
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAssignmentMode('existing')}
              className={`rounded px-3 py-2 text-sm font-semibold ${
                assignmentMode === 'existing' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Usuario existente
            </button>
            <button
              type="button"
              onClick={() => setAssignmentMode('new')}
              className={`rounded px-3 py-2 text-sm font-semibold ${
                assignmentMode === 'new' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Crear cuenta nueva
            </button>
          </div>

          {assignmentMode === 'existing' ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="block text-sm">
                Buscar usuario ({userRoleFilter})
                <div className="mt-1 flex gap-2">
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Nombre o email"
                  />
                  <button type="button" onClick={() => void searchUsers()} className="rounded border px-3 py-2 text-sm">
                    Buscar
                  </button>
                </div>
              </label>
              <label className="block text-sm">
                Asignar a
                <select
                  value={assignmentForm.userId}
                  onChange={(e) => setAssignmentForm((prev) => ({ ...prev, userId: e.target.value }))}
                  className="mt-1 w-full rounded border px-3 py-2"
                  required={assignmentMode === 'existing'}
                >
                  <option value="">Seleccionar usuario</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {(user.displayName || user.name || user.email || user.id) as string} - {user.email || user.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
              <label className="block text-sm">
                Nombre
                <input
                  value={assignmentForm.newAccount.name}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, name: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                  required={assignmentMode === 'new'}
                />
              </label>
              <label className="block text-sm">
                Email
                <input
                  type="email"
                  value={assignmentForm.newAccount.email}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, email: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                  required={assignmentMode === 'new'}
                />
              </label>
              <label className="block text-sm">
                Contraseña temporal
                <input
                  type="password"
                  minLength={6}
                  value={assignmentForm.newAccount.password}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, password: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                  required={assignmentMode === 'new'}
                />
              </label>
              <label className="block text-sm">
                Teléfono
                <input
                  value={assignmentForm.newAccount.phone}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, phone: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                Nombre del negocio
                <input
                  value={assignmentForm.newAccount.businessName}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, businessName: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                  placeholder="Nombre público/comercial"
                />
              </label>
              <label className="block text-sm">
                Email de contacto
                <input
                  type="email"
                  value={assignmentForm.newAccount.contactEmail}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, contactEmail: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                  placeholder="Si es diferente al email de login"
                />
              </label>
              <label className="block text-sm">
                Teléfono público
                <input
                  value={assignmentForm.newAccount.contactPhone}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, contactPhone: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                WhatsApp
                <input
                  value={assignmentForm.newAccount.whatsapp}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, whatsapp: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                Tax ID / EIN
                <input
                  value={assignmentForm.newAccount.taxId}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, taxId: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              {selectedKind !== 'seller' ? (
                <label className="block text-sm md:col-span-2">
                  Nombre legal/comercial del dealer
                  <input
                    value={assignmentForm.newAccount.companyName}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({
                        ...prev,
                        newAccount: { ...prev.newAccount, companyName: e.target.value },
                      }))
                    }
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </label>
              ) : null}
              <label className="block text-sm md:col-span-2">
                Dirección
                <input
                  value={assignmentForm.newAccount.address}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, address: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                Ciudad
                <input
                  value={assignmentForm.newAccount.city}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, city: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                Estado/Región
                <input
                  value={assignmentForm.newAccount.state}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, state: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                Código postal
                <input
                  value={assignmentForm.newAccount.postalCode}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, postalCode: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                País
                <input
                  value={assignmentForm.newAccount.country}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, country: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                Website
                <input
                  value={assignmentForm.newAccount.website}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, website: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                  placeholder="https://..."
                />
              </label>
              <label className="block text-sm">
                Subdominio solicitado
                <input
                  value={assignmentForm.newAccount.subdomain}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      newAccount: { ...prev.newAccount, subdomain: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                  placeholder="ej. dealercentral"
                />
              </label>
              <p className="text-xs text-gray-500 md:col-span-2">
                Branding, logo, colores e imágenes son opcionales y se pueden completar luego desde la cuenta.
              </p>
            </div>
          )}

          {selectedKind === 'seller' ? (
            <label className="block text-sm">
              Dealer al que pertenece este vendedor
              <select
                value={assignmentForm.dealerId}
                onChange={(e) => setAssignmentForm((prev) => ({ ...prev, dealerId: e.target.value }))}
                className="mt-1 w-full rounded border px-3 py-2"
              >
                <option value="">Sin dealer / vendedor independiente</option>
                {dealers.map((dealer) => (
                  <option key={dealer.id} value={dealer.tenantId || dealer.id}>
                    {(dealer.companyName || dealer.name || dealer.email || dealer.id) as string}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-gray-500">
                Si seleccionas un dealer, el vendedor queda vinculado a ese dealer. Luego puede moverse a otro dealer desde las acciones de transferencia.
              </span>
            </label>
          ) : null}

          <button
            disabled={
              assigning ||
              !selectedMembership ||
              (assignmentMode === 'existing' && !assignmentForm.userId)
            }
            className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {assigning ? 'Asignando...' : 'Asignar'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900">A quién pertenece cada membresía</h2>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showCancelledAssignments}
              onChange={(e) => setShowCancelledAssignments(e.target.checked)}
              className="rounded border-gray-300"
            />
            Mostrar canceladas
          </label>
        </div>
        {visibleAssignments.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            {assignments.length === 0
              ? 'Aún no hay asignaciones custom.'
              : 'No hay asignaciones activas. Activa "Mostrar canceladas" para ver las revocadas.'}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Dueño asignado</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Tenant</th>
                  <th className="px-3 py-2">Membresía</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Stripe</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900">{assignment.userName || assignment.userId}</div>
                      <div className="text-xs text-gray-500">{assignment.userEmail || assignment.userId}</div>
                      <div className="font-mono text-[11px] text-gray-400">UID: {assignment.userId}</div>
                    </td>
                    <td className="px-3 py-3">{PLAN_LABELS[(assignment.planKind || 'seller') as PlanKind] || assignment.userRole}</td>
                    <td className="px-3 py-3">
                      <div>{assignment.tenantName || '-'}</div>
                      <div className="font-mono text-xs text-gray-500">{assignment.tenantId}</div>
                    </td>
                    <td className="px-3 py-3">{assignment.membershipName || assignment.membershipId}</td>
                    <td className="px-3 py-3">
                      <span className={assignment.status === 'active' ? 'text-green-700' : 'text-amber-700'}>
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{assignment.stripeSubscriptionId || '-'}</td>
                    <td className="px-3 py-3">
                      {assignment.status !== 'cancelled' ? (
                        <button
                          type="button"
                          disabled={assigning}
                          onClick={() => void cancelAssignment(assignment)}
                          className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                        >
                          Cancelar / revocar
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Cancelada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
