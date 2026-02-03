'use client';

import { useEffect } from 'react';

interface MembershipFeatures {
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
  // Multi Dealer
  multiDealerEnabled?: boolean;
  maxDealers?: number | null;
  requiresAdminApproval?: boolean;
}

interface Membership {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: MembershipFeatures;
  isActive: boolean;
}

interface MembershipCardProps {
  membership: Membership;
  isPopular?: boolean;
}

export default function MembershipCard({ membership, isPopular = false }: MembershipCardProps) {
  useEffect(() => {
    if (!membership || !membership.features) {
      console.error('❌ MembershipCard: membership o features no definidos', membership);
    }
  }, [membership]);

  if (!membership || !membership.features) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">Error: Datos de membresía incompletos</p>
      </div>
    );
  }

  const features = [];
  const limits = [];
  const exclusiveFeatures = [];

  // Límites numéricos
  if (membership.features.maxSellers !== undefined && membership.features.maxSellers !== null) {
    limits.push({ label: 'Vendedores', value: membership.features.maxSellers, icon: '👥' });
  } else if (membership.features.maxSellers === null) {
    limits.push({ label: 'Vendedores', value: '∞', icon: '👥', unlimited: true });
  }

  if (membership.features.maxInventory !== undefined && membership.features.maxInventory !== null) {
    limits.push({ label: 'Vehículos', value: membership.features.maxInventory, icon: '🚗' });
  } else if (membership.features.maxInventory === null) {
    limits.push({ label: 'Vehículos', value: '∞', icon: '🚗', unlimited: true });
  }

  // Campañas siempre ilimitadas (no mostrar en límites ya que todos las tienen ilimitadas)
  // if (membership.features.maxCampaigns !== undefined && membership.features.maxCampaigns !== null) {
  //   limits.push({ label: 'Campañas', value: membership.features.maxCampaigns, icon: '📢' });
  // } else if (membership.features.maxCampaigns === null) {
  //   limits.push({ label: 'Campañas', value: '∞', icon: '📢', unlimited: true });
  // }

  if (membership.features.maxStorageGB !== undefined && membership.features.maxStorageGB !== null) {
    limits.push({ label: 'Almacenamiento', value: `${membership.features.maxStorageGB} GB`, icon: '💾' });
  } else if (membership.features.maxStorageGB === null) {
    limits.push({ label: 'Almacenamiento', value: '∞', icon: '💾', unlimited: true });
  }

  // Features básicas (todos los planes)
  if (membership.features.customSubdomain) {
    features.push({ label: 'Página Web con Subdominio', icon: '🌐', included: true });
  }

  if (membership.features.crmAdvanced) {
    features.push({ label: 'CRM Completo', icon: '📊', included: true });
  }

  if (membership.features.socialMediaEnabled) {
    features.push({ label: 'Publicaciones en Redes Sociales', icon: '📱', included: true });
  }

  if (membership.features.videoUploads) {
    features.push({ label: 'Subida de Videos', icon: '🎥', included: true });
  }

  if (membership.features.liveChat) {
    features.push({ label: 'Chat en Vivo', icon: '💬', included: true });
  }

  if (membership.features.appointmentScheduling) {
    features.push({ label: 'Sistema de Citas', icon: '📅', included: true });
  }

  if (membership.features.customTemplates) {
    features.push({ label: 'Templates Personalizados', icon: '📝', included: true });
  }

  if (membership.features.customBranding) {
    features.push({ label: 'Branding Personalizado', icon: '🎨', included: true });
  }

  // Beneficio real: Promociones gratuitas en landing page (reemplaza campañas limitadas)
  if ((membership.features as any).freePromotionsOnLanding) {
    features.push({ label: 'Promociones Gratuitas en Landing Pública', icon: '🎁', included: true });
  }

  // Campañas siempre ilimitadas para todos (beneficio real)
  features.push({ label: 'Campañas Ilimitadas en Redes Sociales', icon: '📢', included: true });

  // Multi Dealer
  if (membership.features.multiDealerEnabled) {
    features.push({ label: 'Multi Dealer', icon: '🏢', included: true });
    
    if (membership.features.maxDealers !== undefined && membership.features.maxDealers !== null) {
      limits.push({ 
        label: 'Dealers Permitidos', 
        value: membership.features.maxDealers, 
        icon: '🏢' 
      });
    } else if (membership.features.maxDealers === null || membership.features.maxDealers === undefined) {
      limits.push({ 
        label: 'Dealers Permitidos', 
        value: '∞', 
        icon: '🏢', 
        unlimited: true 
      });
    }
    
    if (membership.features.requiresAdminApproval) {
      features.push({ label: 'Requiere Aprobación Admin', icon: '🔒', included: true });
    }
  }

  // Email corporativo
  if (membership.features.corporateEmailEnabled) {
    features.push({ label: 'Email Corporativo', icon: '📧', included: true });
    
    if (membership.features.maxCorporateEmails !== undefined && membership.features.maxCorporateEmails !== null) {
      limits.push({ 
        label: 'Emails Corporativos', 
        value: membership.features.maxCorporateEmails, 
        icon: '📧' 
      });
    } else if (membership.features.maxCorporateEmails === null || membership.features.maxCorporateEmails === undefined) {
      limits.push({ 
        label: 'Emails Corporativos', 
        value: '∞', 
        icon: '📧', 
        unlimited: true 
      });
    }
    
    if (membership.features.emailSignatureBasic) {
      features.push({ label: 'Firma Básica de Email', icon: '✍️', included: true });
    }
    
    if (membership.features.emailSignatureAdvanced) {
      features.push({ label: 'Firma Avanzada (HTML)', icon: '🎨', included: true });
    }
    
    if (membership.features.emailAliases) {
      features.push({ label: 'Aliases de Email', icon: '🔗', included: true });
    }
  }

  // NO agregar features que NO están implementadas
  // Solo mostrar límites aumentados como diferencia entre planes

  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 border-2 transition-all hover:shadow-xl ${
        isPopular
          ? 'border-blue-600 scale-105 bg-gradient-to-br from-blue-50 to-white'
          : membership.isActive === false
          ? 'border-red-300 opacity-75'
          : 'border-gray-200'
      }`}
    >
      {isPopular && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-xs font-semibold inline-block mb-4">
          ⭐ MÁS POPULAR
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-2xl font-bold text-gray-900">{membership.name}</h3>
        <p className="text-sm text-gray-600 capitalize mt-1">{membership.type === 'dealer' ? 'Para Concesionarios' : 'Para Vendedores'}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-gray-900">${membership.price}</span>
          <span className="text-lg text-gray-600 ml-2">
            /{membership.billingCycle === 'monthly' ? 'mes' : 'año'}
          </span>
        </div>
        {membership.billingCycle === 'yearly' && (
          <p className="text-xs text-green-600 mt-1">💰 Ahorra 2 meses al pagar anualmente</p>
        )}
      </div>

      {/* Límites */}
      {limits.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 Límites:</h4>
          <div className="grid grid-cols-2 gap-2">
            {limits.map((limit, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{limit.icon}</span>
                <div>
                  <span className="font-semibold text-gray-900">
                    {limit.unlimited ? '∞' : limit.value}
                  </span>
                  <span className="text-gray-600 text-xs ml-1">{limit.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features básicas */}
      {features.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">✅ Incluye:</h4>
          <ul className="space-y-2">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-700">{feature.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mensaje sobre límites - Solo mostrar si TODOS los límites relevantes son ilimitados */}
      {limits.length > 0 && limits.every(l => l.unlimited) && (
        <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <p className="text-xs font-semibold text-green-700 text-center">
            🎉 Todo Ilimitado - Sin Restricciones
          </p>
        </div>
      )}
    </div>
  );
}

