export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase, getFirestore } from '@autodealers/shared';
import { verifyAuth } from '@/lib/auth';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Inicializar Firebase
let db: admin.firestore.Firestore | null = null;

function getDb() {
  if (!db) {
    try {
      initializeFirebase();
      db = getFirestore();
    } catch (error) {
      console.error('Error inicializando Firebase:', error);
      throw error;
    }
  }
  return db;
}

// Stripe se inicializará dinámicamente cuando sea necesario

const memberships = [
  // ========== DEALERS ==========
  {
    name: 'Dealer Básico',
    type: 'dealer' as const,
    price: 99,
    currency: 'USD',
    billingCycle: 'monthly' as const,
    isActive: true,
    features: {
      // Límites básicos
      maxSellers: 2,
      maxInventory: 50,
      maxCampaigns: null, // Ilimitado - todos pagan por redes sociales
      maxPromotions: 10,
      maxAppointmentsPerMonth: 50,
      maxStorageGB: 10,
      maxApiCallsPerMonth: 1000,
      
      // Features REALMENTE implementadas
      customSubdomain: true, // ✅ Página web con subdominio
      customDomain: false, // ❌ No implementado
      aiEnabled: false, // ❌ Solo parcial, no completo
      aiAutoResponses: false, // ❌ No implementado
      aiContentGeneration: false, // ❌ Solo parcial
      aiLeadClassification: false, // ❌ No implementado
      socialMediaEnabled: true, // ✅ Publicaciones sociales implementadas
      socialMediaScheduling: false, // ❌ No implementado completamente
      socialMediaAnalytics: false, // ❌ No implementado
      marketplaceEnabled: false, // ❌ No implementado
      marketplaceFeatured: false, // ❌ No implementado
      advancedReports: false, // ❌ Solo reportes básicos implementados
      customReports: false, // ❌ No implementado
      exportData: false, // ❌ No implementado
      whiteLabel: false, // ❌ Solo branding básico
      apiAccess: false, // ❌ No implementado
      webhooks: false, // ❌ No implementado
      ssoEnabled: false, // ❌ No implementado
      multiLanguage: false, // ❌ No implementado
      customTemplates: true, // ✅ Templates implementados
      emailMarketing: false, // ❌ No implementado
      smsMarketing: false, // ❌ No implementado
      whatsappMarketing: false, // ❌ No implementado
      videoUploads: true, // ✅ Subida de videos implementada
      virtualTours: false, // ❌ No implementado
      liveChat: true, // ✅ Chat público implementado
      appointmentScheduling: true, // ✅ Citas implementadas
      paymentProcessing: false, // ❌ No implementado
      inventorySync: false, // ❌ No implementado
      crmAdvanced: true, // ✅ CRM completo implementado (leads, mensajes, citas, recordatorios, reseñas, casos)
      leadScoring: false, // ❌ No implementado
      automationWorkflows: false, // ❌ No implementado
      integrationsUnlimited: false, // ❌ No aplica
      prioritySupport: false, // ❌ No implementado
      dedicatedManager: false, // ❌ No implementado
      trainingSessions: false, // ❌ No implementado
      customBranding: true, // ✅ Branding implementado
      mobileApp: false, // ❌ Solo estructura base, no funcional
      offlineMode: false, // ❌ No implementado
      dataBackup: false, // ❌ No implementado
      complianceTools: false, // ❌ No implementado
      analyticsAdvanced: false, // ❌ No implementado
      aBTesting: false, // ❌ No implementado
      seoTools: false, // ❌ No implementado
      customIntegrations: false, // ❌ No implementado
      freePromotionsOnLanding: false, // ❌ No implementado por defecto
      // Email corporativo
      corporateEmailEnabled: false,
      maxCorporateEmails: null,
      emailSignatureBasic: false,
      emailSignatureAdvanced: false,
      emailAliases: false,
      // Multi Dealer
      multiDealerEnabled: false,
      maxDealers: null,
      requiresAdminApproval: false,
    },
  },
  {
    name: 'Dealer Professional',
    type: 'dealer' as const,
    price: 249,
    currency: 'USD',
    billingCycle: 'monthly' as const,
    isActive: true,
    features: {
      // Límites aumentados
      maxSellers: 10,
      maxInventory: 200,
      maxCampaigns: null, // Ilimitado - todos pagan por redes sociales
      maxPromotions: 50,
      maxAppointmentsPerMonth: 200,
      maxStorageGB: 50,
      maxApiCallsPerMonth: 5000,
      
      // Features REALMENTE implementadas + algunas mejoras
      customSubdomain: true, // ✅ Página web
      customDomain: false, // ❌ No implementado (mantener false)
      aiEnabled: false, // ❌ Solo parcial, no completo aún
      aiAutoResponses: false, // ❌ No implementado
      aiContentGeneration: false, // ❌ Solo parcial
      aiLeadClassification: false, // ❌ No implementado
      socialMediaEnabled: true, // ✅ Redes sociales
      socialMediaScheduling: false, // ❌ No implementado completamente
      socialMediaAnalytics: false, // ❌ No implementado
      marketplaceEnabled: false, // ❌ No implementado
      marketplaceFeatured: false, // ❌ No implementado
      advancedReports: false, // ❌ Solo reportes básicos
      customReports: false, // ❌ No implementado
      exportData: false, // ❌ No implementado
      whiteLabel: false, // ❌ Solo branding básico
      apiAccess: false, // ❌ No implementado
      webhooks: false, // ❌ No implementado
      ssoEnabled: false, // ❌ No implementado
      multiLanguage: false, // ❌ No implementado
      customTemplates: true, // ✅ Templates
      emailMarketing: false, // ❌ No implementado
      smsMarketing: false, // ❌ No implementado
      whatsappMarketing: false, // ❌ No implementado
      videoUploads: true, // ✅ Videos
      virtualTours: false, // ❌ No implementado
      liveChat: true, // ✅ Chat
      appointmentScheduling: true, // ✅ Citas
      paymentProcessing: false, // ❌ No implementado
      inventorySync: false, // ❌ No implementado
      crmAdvanced: true, // ✅ CRM completo
      leadScoring: false, // ❌ No implementado
      automationWorkflows: false, // ❌ No implementado
      integrationsUnlimited: false, // ❌ No aplica
      prioritySupport: false, // ❌ No implementado
      dedicatedManager: false, // ❌ No implementado
      trainingSessions: false, // ❌ No implementado
      customBranding: true, // ✅ Branding
      mobileApp: false, // ❌ Solo estructura base
      offlineMode: false, // ❌ No implementado
      dataBackup: false, // ❌ No implementado
      complianceTools: false, // ❌ No implementado
      analyticsAdvanced: false, // ❌ No implementado
      aBTesting: false, // ❌ No implementado
      seoTools: false, // ❌ No implementado
      customIntegrations: false, // ❌ No implementado
      freePromotionsOnLanding: false, // ❌ No implementado por defecto
      // Email corporativo
      corporateEmailEnabled: true, // ✅ Email corporativo habilitado
      maxCorporateEmails: 5, // 5 emails corporativos
      emailSignatureBasic: true, // ✅ Firma básica
      emailSignatureAdvanced: false,
      emailAliases: false,
      // Multi Dealer
      multiDealerEnabled: false,
      maxDealers: null,
      requiresAdminApproval: false,
    },
  },
  {
    name: 'Dealer Enterprise',
    type: 'dealer' as const,
    price: 599,
    currency: 'USD',
    billingCycle: 'monthly' as const,
    isActive: true,
    features: {
      // Todo ilimitado (solo límites)
      maxSellers: null,
      maxInventory: null,
      maxCampaigns: null,
      maxPromotions: null,
      maxAppointmentsPerMonth: null,
      maxStorageGB: null,
      maxApiCallsPerMonth: null,
      
      // Features REALMENTE implementadas (mismo que Professional, solo ilimitado)
      customSubdomain: true, // ✅ Página web
      customDomain: false, // ❌ No implementado
      aiEnabled: false, // ❌ Solo parcial
      aiAutoResponses: false, // ❌ No implementado
      aiContentGeneration: false, // ❌ Solo parcial
      aiLeadClassification: false, // ❌ No implementado
      socialMediaEnabled: true, // ✅ Redes sociales
      socialMediaScheduling: false, // ❌ No implementado
      socialMediaAnalytics: false, // ❌ No implementado
      marketplaceEnabled: false, // ❌ No implementado
      marketplaceFeatured: false, // ❌ No implementado
      advancedReports: false, // ❌ Solo básicos
      customReports: false, // ❌ No implementado
      exportData: false, // ❌ No implementado
      whiteLabel: false, // ❌ Solo branding básico
      apiAccess: false, // ❌ No implementado
      webhooks: false, // ❌ No implementado
      ssoEnabled: false, // ❌ No implementado
      multiLanguage: false, // ❌ No implementado
      customTemplates: true, // ✅ Templates
      emailMarketing: false, // ❌ No implementado
      smsMarketing: false, // ❌ No implementado
      whatsappMarketing: false, // ❌ No implementado
      videoUploads: true, // ✅ Videos
      virtualTours: false, // ❌ No implementado
      liveChat: true, // ✅ Chat
      appointmentScheduling: true, // ✅ Citas
      paymentProcessing: false, // ❌ No implementado
      inventorySync: false, // ❌ No implementado
      crmAdvanced: true, // ✅ CRM completo
      leadScoring: false, // ❌ No implementado
      automationWorkflows: false, // ❌ No implementado
      integrationsUnlimited: false, // ❌ No aplica
      prioritySupport: false, // ❌ No implementado
      dedicatedManager: false, // ❌ No implementado
      trainingSessions: false, // ❌ No implementado
      customBranding: true, // ✅ Branding
      mobileApp: false, // ❌ Solo estructura base
      offlineMode: false, // ❌ No implementado
      dataBackup: false, // ❌ No implementado
      complianceTools: false, // ❌ No implementado
      analyticsAdvanced: false, // ❌ No implementado
      aBTesting: false, // ❌ No implementado
      seoTools: false, // ❌ No implementado
      customIntegrations: false, // ❌ No implementado
      freePromotionsOnLanding: false, // ❌ No implementado por defecto
      // Email corporativo
      corporateEmailEnabled: true, // ✅ Email corporativo habilitado
      maxCorporateEmails: null, // Ilimitado
      emailSignatureBasic: true, // ✅ Firma básica
      emailSignatureAdvanced: true, // ✅ Firma avanzada
      emailAliases: true, // ✅ Aliases
      // Multi Dealer
      multiDealerEnabled: false,
      maxDealers: null,
      requiresAdminApproval: false,
    },
  },
  
  // ========== MULTI DEALER ==========
  {
    name: 'Multi Dealer 1',
    type: 'dealer' as const,
    price: 399,
    currency: 'USD',
    billingCycle: 'monthly' as const,
    isActive: true,
    features: {
      // Límites básicos por dealer
      maxSellers: 5,
      maxInventory: 100,
      maxCampaigns: null,
      maxPromotions: 20,
      maxAppointmentsPerMonth: 100,
      maxStorageGB: 25,
      maxApiCallsPerMonth: 2000,
      // Features básicas
      customSubdomain: true,
      customDomain: false,
      aiEnabled: false,
      aiAutoResponses: false,
      aiContentGeneration: false,
      aiLeadClassification: false,
      socialMediaEnabled: true,
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
      customTemplates: true,
      emailMarketing: false,
      smsMarketing: false,
      whatsappMarketing: false,
      videoUploads: true,
      virtualTours: false,
      liveChat: true,
      appointmentScheduling: true,
      paymentProcessing: false,
      inventorySync: false,
      crmAdvanced: true,
      leadScoring: false,
      automationWorkflows: false,
      integrationsUnlimited: false,
      prioritySupport: false,
      dedicatedManager: false,
      trainingSessions: false,
      customBranding: true,
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
      corporateEmailEnabled: true,
      maxCorporateEmails: 3,
      emailSignatureBasic: true,
      emailSignatureAdvanced: false,
      emailAliases: true,
      // Multi Dealer
      multiDealerEnabled: true,
      maxDealers: 1,
      requiresAdminApproval: true,
    },
  },
  {
    name: 'Multi Dealer 2',
    type: 'dealer' as const,
    price: 699,
    currency: 'USD',
    billingCycle: 'monthly' as const,
    isActive: true,
    features: {
      // Límites aumentados por dealer
      maxSellers: 10,
      maxInventory: 200,
      maxCampaigns: null,
      maxPromotions: 50,
      maxAppointmentsPerMonth: 200,
      maxStorageGB: 50,
      maxApiCallsPerMonth: 5000,
      // Features mejoradas
      customSubdomain: true,
      customDomain: false,
      aiEnabled: false,
      aiAutoResponses: false,
      aiContentGeneration: false,
      aiLeadClassification: false,
      socialMediaEnabled: true,
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
      customTemplates: true,
      emailMarketing: false,
      smsMarketing: false,
      whatsappMarketing: false,
      videoUploads: true,
      virtualTours: false,
      liveChat: true,
      appointmentScheduling: true,
      paymentProcessing: false,
      inventorySync: false,
      crmAdvanced: true,
      leadScoring: false,
      automationWorkflows: false,
      integrationsUnlimited: false,
      prioritySupport: false,
      dedicatedManager: false,
      trainingSessions: false,
      customBranding: true,
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
      corporateEmailEnabled: true,
      maxCorporateEmails: 5,
      emailSignatureBasic: true,
      emailSignatureAdvanced: true,
      emailAliases: true,
      // Multi Dealer
      multiDealerEnabled: true,
      maxDealers: 2,
      requiresAdminApproval: true,
    },
  },
  {
    name: 'Multi Dealer 3',
    type: 'dealer' as const,
    price: 999,
    currency: 'USD',
    billingCycle: 'monthly' as const,
    isActive: true,
    features: {
      // Todo ilimitado por dealer
      maxSellers: null,
      maxInventory: null,
      maxCampaigns: null,
      maxPromotions: null,
      maxAppointmentsPerMonth: null,
      maxStorageGB: null,
      maxApiCallsPerMonth: null,
      // Features completas
      customSubdomain: true,
      customDomain: false,
      aiEnabled: false,
      aiAutoResponses: false,
      aiContentGeneration: false,
      aiLeadClassification: false,
      socialMediaEnabled: true,
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
      customTemplates: true,
      emailMarketing: false,
      smsMarketing: false,
      whatsappMarketing: false,
      videoUploads: true,
      virtualTours: false,
      liveChat: true,
      appointmentScheduling: true,
      paymentProcessing: false,
      inventorySync: false,
      crmAdvanced: true,
      leadScoring: false,
      automationWorkflows: false,
      integrationsUnlimited: false,
      prioritySupport: false,
      dedicatedManager: false,
      trainingSessions: false,
      customBranding: true,
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
      corporateEmailEnabled: true,
      maxCorporateEmails: null, // Ilimitado
      emailSignatureBasic: true,
      emailSignatureAdvanced: true,
      emailAliases: true,
      // Multi Dealer
      multiDealerEnabled: true,
      maxDealers: null, // Ilimitado
      requiresAdminApproval: true,
    },
  },
  
  // ========== SELLERS ==========
  {
    name: 'Vendedor Básico',
    type: 'seller' as const,
    price: 49,
    currency: 'USD',
    billingCycle: 'monthly' as const,
    isActive: true,
    features: {
      // Límites para vendedor individual (menores que dealer)
      maxSellers: null, // No aplica para sellers
      maxInventory: 25,
      maxCampaigns: null, // Ilimitado - todos pagan por redes sociales
      maxPromotions: 5,
      maxAppointmentsPerMonth: 30,
      maxStorageGB: 5,
      maxApiCallsPerMonth: 500,
      
      // Features REALMENTE implementadas (mismo que dealer básico)
      customSubdomain: true, // ✅ Página web
      customDomain: false, // ❌ No implementado
      aiEnabled: false, // ❌ Solo parcial
      aiAutoResponses: false, // ❌ No implementado
      aiContentGeneration: false, // ❌ Solo parcial
      aiLeadClassification: false, // ❌ No implementado
      socialMediaEnabled: true, // ✅ Redes sociales
      socialMediaScheduling: false, // ❌ No implementado
      socialMediaAnalytics: false, // ❌ No implementado
      marketplaceEnabled: false, // ❌ No implementado
      marketplaceFeatured: false, // ❌ No implementado
      advancedReports: false, // ❌ Solo básicos
      customReports: false, // ❌ No implementado
      exportData: false, // ❌ No implementado
      whiteLabel: false, // ❌ Solo branding básico
      apiAccess: false, // ❌ No implementado
      webhooks: false, // ❌ No implementado
      ssoEnabled: false, // ❌ No implementado
      multiLanguage: false, // ❌ No implementado
      customTemplates: true, // ✅ Templates
      emailMarketing: false, // ❌ No implementado
      smsMarketing: false, // ❌ No implementado
      whatsappMarketing: false, // ❌ No implementado
      videoUploads: true, // ✅ Videos
      virtualTours: false, // ❌ No implementado
      liveChat: true, // ✅ Chat
      appointmentScheduling: true, // ✅ Citas
      paymentProcessing: false, // ❌ No implementado
      inventorySync: false, // ❌ No implementado
      crmAdvanced: true, // ✅ CRM completo
      leadScoring: false, // ❌ No implementado
      automationWorkflows: false, // ❌ No implementado
      integrationsUnlimited: false, // ❌ No aplica
      prioritySupport: false, // ❌ No implementado
      dedicatedManager: false, // ❌ No implementado
      trainingSessions: false, // ❌ No implementado
      customBranding: true, // ✅ Branding
      mobileApp: false, // ❌ Solo estructura base
      offlineMode: false, // ❌ No implementado
      dataBackup: false, // ❌ No implementado
      complianceTools: false, // ❌ No implementado
      analyticsAdvanced: false, // ❌ No implementado
      aBTesting: false, // ❌ No implementado
      seoTools: false, // ❌ No implementado
      customIntegrations: false, // ❌ No implementado
      freePromotionsOnLanding: false, // ❌ No implementado por defecto
      // Email corporativo
      corporateEmailEnabled: false,
      maxCorporateEmails: null,
      emailSignatureBasic: false,
      emailSignatureAdvanced: false,
      emailAliases: false,
      // Multi Dealer (no aplica para sellers)
      multiDealerEnabled: false,
      maxDealers: null,
      requiresAdminApproval: false,
    },
  },
  {
    name: 'Vendedor Professional',
    type: 'seller' as const,
    price: 129,
    currency: 'USD',
    billingCycle: 'monthly' as const,
    isActive: true,
    features: {
      // Límites aumentados
      maxSellers: null,
      maxInventory: 100,
      maxCampaigns: null, // Ilimitado - todos pagan por redes sociales
      maxPromotions: 30,
      maxAppointmentsPerMonth: 150,
      maxStorageGB: 25,
      maxApiCallsPerMonth: 3000,
      
      // Features REALMENTE implementadas (mismo que dealer professional)
      customSubdomain: true, // ✅ Página web
      customDomain: false, // ❌ No implementado
      aiEnabled: false, // ❌ Solo parcial
      aiAutoResponses: false, // ❌ No implementado
      aiContentGeneration: false, // ❌ Solo parcial
      aiLeadClassification: false, // ❌ No implementado
      socialMediaEnabled: true, // ✅ Redes sociales
      socialMediaScheduling: false, // ❌ No implementado
      socialMediaAnalytics: false, // ❌ No implementado
      marketplaceEnabled: false, // ❌ No implementado
      marketplaceFeatured: false, // ❌ No implementado
      advancedReports: false, // ❌ Solo básicos
      customReports: false, // ❌ No implementado
      exportData: false, // ❌ No implementado
      whiteLabel: false, // ❌ Solo branding básico
      apiAccess: false, // ❌ No implementado
      webhooks: false, // ❌ No implementado
      ssoEnabled: false, // ❌ No implementado
      multiLanguage: false, // ❌ No implementado
      customTemplates: true, // ✅ Templates
      emailMarketing: false, // ❌ No implementado
      smsMarketing: false, // ❌ No implementado
      whatsappMarketing: false, // ❌ No implementado
      videoUploads: true, // ✅ Videos
      virtualTours: false, // ❌ No implementado
      liveChat: true, // ✅ Chat
      appointmentScheduling: true, // ✅ Citas
      paymentProcessing: false, // ❌ No implementado
      inventorySync: false, // ❌ No implementado
      crmAdvanced: true, // ✅ CRM completo
      leadScoring: false, // ❌ No implementado
      automationWorkflows: false, // ❌ No implementado
      integrationsUnlimited: false, // ❌ No aplica
      prioritySupport: false, // ❌ No implementado
      dedicatedManager: false, // ❌ No implementado
      trainingSessions: false, // ❌ No implementado
      customBranding: true, // ✅ Branding
      mobileApp: false, // ❌ Solo estructura base
      offlineMode: false, // ❌ No implementado
      dataBackup: false, // ❌ No implementado
      complianceTools: false, // ❌ No implementado
      analyticsAdvanced: false, // ❌ No implementado
      aBTesting: false, // ❌ No implementado
      seoTools: false, // ❌ No implementado
      customIntegrations: false, // ❌ No implementado
      freePromotionsOnLanding: false, // ❌ No implementado por defecto
      // Email corporativo
      corporateEmailEnabled: true, // ✅ Email corporativo habilitado
      maxCorporateEmails: 1, // 1 email corporativo
      emailSignatureBasic: true, // ✅ Firma básica
      emailSignatureAdvanced: false,
      emailAliases: false,
      // Multi Dealer (no aplica para sellers)
      multiDealerEnabled: false,
      maxDealers: null,
      requiresAdminApproval: false,
    },
  },
  {
    name: 'Vendedor Premium',
    type: 'seller' as const,
    price: 299,
    currency: 'USD',
    billingCycle: 'monthly' as const,
    isActive: true,
    features: {
      // Todo ilimitado (solo límites)
      maxSellers: null,
      maxInventory: null,
      maxCampaigns: null,
      maxPromotions: null,
      maxAppointmentsPerMonth: null,
      maxStorageGB: null,
      maxApiCallsPerMonth: null,
      
      // Features REALMENTE implementadas (mismo que professional, solo ilimitado)
      customSubdomain: true, // ✅ Página web
      customDomain: false, // ❌ No implementado
      aiEnabled: false, // ❌ Solo parcial
      aiAutoResponses: false, // ❌ No implementado
      aiContentGeneration: false, // ❌ Solo parcial
      aiLeadClassification: false, // ❌ No implementado
      socialMediaEnabled: true, // ✅ Redes sociales
      socialMediaScheduling: false, // ❌ No implementado
      socialMediaAnalytics: false, // ❌ No implementado
      marketplaceEnabled: false, // ❌ No implementado
      marketplaceFeatured: false, // ❌ No implementado
      advancedReports: false, // ❌ Solo básicos
      customReports: false, // ❌ No implementado
      exportData: false, // ❌ No implementado
      whiteLabel: false, // ❌ Solo branding básico
      apiAccess: false, // ❌ No implementado
      webhooks: false, // ❌ No implementado
      ssoEnabled: false, // ❌ No implementado
      multiLanguage: false, // ❌ No implementado
      customTemplates: true, // ✅ Templates
      emailMarketing: false, // ❌ No implementado
      smsMarketing: false, // ❌ No implementado
      whatsappMarketing: false, // ❌ No implementado
      videoUploads: true, // ✅ Videos
      virtualTours: false, // ❌ No implementado
      liveChat: true, // ✅ Chat
      appointmentScheduling: true, // ✅ Citas
      paymentProcessing: false, // ❌ No implementado
      inventorySync: false, // ❌ No implementado
      crmAdvanced: true, // ✅ CRM completo
      leadScoring: false, // ❌ No implementado
      automationWorkflows: false, // ❌ No implementado
      integrationsUnlimited: false, // ❌ No aplica
      prioritySupport: false, // ❌ No implementado
      dedicatedManager: false, // ❌ No implementado
      trainingSessions: false, // ❌ No implementado
      customBranding: true, // ✅ Branding
      mobileApp: false, // ❌ Solo estructura base
      offlineMode: false, // ❌ No implementado
      dataBackup: false, // ❌ No implementado
      complianceTools: false, // ❌ No implementado
      analyticsAdvanced: false, // ❌ No implementado
      aBTesting: false, // ❌ No implementado
      seoTools: false, // ❌ No implementado
      customIntegrations: false, // ❌ No implementado
      // Email corporativo
      corporateEmailEnabled: true, // ✅ Email corporativo habilitado
      maxCorporateEmails: 1, // 1 email corporativo
      emailSignatureBasic: true, // ✅ Firma básica
      emailSignatureAdvanced: true, // ✅ Firma avanzada
      emailAliases: true, // ✅ Aliases
      // Multi Dealer (no aplica para sellers)
      multiDealerEnabled: false,
      maxDealers: null,
      requiresAdminApproval: false,
    },
  },
];

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/admin/memberships/create-default - Iniciando...');
  console.log('📋 Headers recibidos:', {
    authorization: request.headers.get('authorization') ? 'Presente' : 'Ausente',
    cookie: request.headers.get('cookie') ? 'Presente' : 'Ausente',
  });
  
  try {
    // Verificar autenticación admin
    console.log('🔐 Verificando autenticación...');
    const auth = await verifyAuth(request);
    
    if (!auth) {
      console.log('❌ verifyAuth retornó null - No hay token válido');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized', 
          details: 'No se encontró token de autenticación válido. Por favor, cierra sesión y vuelve a iniciar sesión.' 
        },
        { status: 401 }
      );
    }
    
    if (auth.role !== 'admin') {
      console.log('❌ Usuario no es admin:', { userId: auth.userId, role: auth.role, email: auth.email });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized', 
          details: `Se requiere rol de administrador. Tu rol actual es: ${auth.role}` 
        },
        { status: 403 }
      );
    }
    
    console.log('✅ Autenticación verificada:', { userId: auth.userId, role: auth.role, email: auth.email });

    console.log(`📋 Procesando ${memberships.length} membresías...`);
    
    const results = {
      created: [] as string[],
      updated: [] as string[],
      errors: [] as string[],
      stripeCreated: [] as string[],
      stripeErrors: [] as string[],
    };

    for (const membership of memberships) {
      console.log(`🔄 Procesando: ${membership.name} (${membership.type})...`);
      try {
        let stripePriceId = '';

        // Crear en Stripe si está configurado
        try {
          const { getStripeInstance } = await import('@autodealers/core');
          const stripe = await getStripeInstance();
          
          const product = await stripe.products.create({
            name: `${membership.name} - ${membership.type === 'dealer' ? 'Dealer' : 'Vendedor'}`,
            description: `Plan de membresía ${membership.name} para ${membership.type === 'dealer' ? 'dealers' : 'vendedores'}`,
            metadata: {
              type: membership.type,
              managedBy: 'autodealers',
            },
          });

          const stripePrice = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(membership.price * 100),
            currency: membership.currency.toLowerCase(),
            recurring: {
              interval: membership.billingCycle === 'monthly' ? 'month' : 'year',
            },
          });

          stripePriceId = stripePrice.id;
          results.stripeCreated.push(`${membership.name} - ${stripePrice.id}`);
        } catch (stripeError: any) {
          // Si Stripe no está configurado, continuar sin crear en Stripe
          if (stripeError.message?.includes('no está configurada')) {
            results.stripeErrors.push(`${membership.name}: Stripe no configurado (se creará sin Stripe)`);
          } else {
            results.stripeErrors.push(`${membership.name}: ${stripeError.message}`);
          }
        }

        // Verificar si ya existe en Firestore
        // Usar una estrategia más robusta: buscar por tipo primero, luego filtrar por nombre
        const dbInstance = getDb();
        if (!dbInstance) {
          throw new Error('Firestore no inicializado');
        }
        let existing: admin.firestore.QuerySnapshot;
        
        try {
          // Intentar buscar con índice compuesto primero
          existing = await dbInstance
            .collection('memberships')
            .where('name', '==', membership.name)
            .where('type', '==', membership.type)
            .limit(1)
            .get();
        } catch (indexError: any) {
          // Si falla por índice faltante, buscar por tipo y filtrar manualmente
          console.warn(`⚠️ Índice compuesto faltante para membresías, usando fallback: ${indexError.message}`);
          const allByType = await dbInstance
            .collection('memberships')
            .where('type', '==', membership.type)
            .get();
          
          // Filtrar manualmente por nombre
          const matching = allByType.docs.filter(doc => doc.data().name === membership.name);
          existing = {
            empty: matching.length === 0,
            docs: matching,
            size: matching.length,
          } as admin.firestore.QuerySnapshot;
        }

        // Función helper para limpiar valores undefined (Firestore no acepta undefined)
        // Convierte undefined a null para límites, y omite undefined para otros campos
        const cleanForFirestore = (obj: any): any => {
          if (obj === undefined) {
            return null; // Convertir undefined a null
          }
          if (obj === null) {
            return null; // Mantener null (significa ilimitado para límites)
          }
          if (Array.isArray(obj)) {
            return obj.map(cleanForFirestore);
          }
          if (typeof obj === 'object' && obj !== null) {
            const cleaned: any = {};
            for (const key in obj) {
              const value = obj[key];
              if (value !== undefined) {
                cleaned[key] = cleanForFirestore(value);
              }
              // Si es undefined, omitirlo (no agregar al objeto)
            }
            return cleaned;
          }
          return obj;
        };

        // Limpiar membership: TODOS los campos deben estar definidos explícitamente (nunca undefined)
        const cleanedMembership: any = {
          name: membership.name,
          type: membership.type,
          price: membership.price,
          currency: membership.currency,
          billingCycle: membership.billingCycle,
          isActive: membership.isActive,
          features: {
            // Límites: convertir undefined a null explícitamente (null = ilimitado)
            maxSellers: membership.features.maxSellers !== undefined ? membership.features.maxSellers : null,
            maxInventory: membership.features.maxInventory !== undefined ? membership.features.maxInventory : null,
            maxCampaigns: membership.features.maxCampaigns !== undefined ? membership.features.maxCampaigns : null,
            maxPromotions: membership.features.maxPromotions !== undefined ? membership.features.maxPromotions : null,
            maxLeadsPerMonth: (membership.features as any).maxLeadsPerMonth !== undefined ? (membership.features as any).maxLeadsPerMonth : null,
            maxAppointmentsPerMonth: membership.features.maxAppointmentsPerMonth !== undefined ? membership.features.maxAppointmentsPerMonth : null,
            maxStorageGB: membership.features.maxStorageGB !== undefined ? membership.features.maxStorageGB : null,
            maxApiCallsPerMonth: membership.features.maxApiCallsPerMonth !== undefined ? membership.features.maxApiCallsPerMonth : null,
            // Features booleanas: TODAS deben estar definidas explícitamente (false si no están implementadas)
            customSubdomain: membership.features.customSubdomain ?? false,
            customDomain: membership.features.customDomain ?? false,
            aiEnabled: membership.features.aiEnabled ?? false,
            aiAutoResponses: membership.features.aiAutoResponses ?? false,
            aiContentGeneration: membership.features.aiContentGeneration ?? false,
            aiLeadClassification: membership.features.aiLeadClassification ?? false,
            socialMediaEnabled: membership.features.socialMediaEnabled ?? false,
            socialMediaScheduling: membership.features.socialMediaScheduling ?? false,
            socialMediaAnalytics: membership.features.socialMediaAnalytics ?? false,
            marketplaceEnabled: membership.features.marketplaceEnabled ?? false,
            marketplaceFeatured: membership.features.marketplaceFeatured ?? false,
            advancedReports: membership.features.advancedReports ?? false,
            customReports: membership.features.customReports ?? false,
            exportData: membership.features.exportData ?? false,
            whiteLabel: membership.features.whiteLabel ?? false,
            apiAccess: membership.features.apiAccess ?? false,
            webhooks: membership.features.webhooks ?? false,
            ssoEnabled: membership.features.ssoEnabled ?? false,
            multiLanguage: membership.features.multiLanguage ?? false,
            customTemplates: membership.features.customTemplates ?? false,
            emailMarketing: membership.features.emailMarketing ?? false,
            smsMarketing: membership.features.smsMarketing ?? false,
            whatsappMarketing: membership.features.whatsappMarketing ?? false,
            videoUploads: membership.features.videoUploads ?? false,
            virtualTours: membership.features.virtualTours ?? false,
            liveChat: membership.features.liveChat ?? false,
            appointmentScheduling: membership.features.appointmentScheduling ?? false,
            paymentProcessing: membership.features.paymentProcessing ?? false,
            inventorySync: membership.features.inventorySync ?? false,
            crmAdvanced: membership.features.crmAdvanced ?? false,
            leadScoring: membership.features.leadScoring ?? false,
            automationWorkflows: membership.features.automationWorkflows ?? false,
            integrationsUnlimited: membership.features.integrationsUnlimited ?? false,
            prioritySupport: membership.features.prioritySupport ?? false,
            dedicatedManager: membership.features.dedicatedManager ?? false,
            trainingSessions: membership.features.trainingSessions ?? false,
            customBranding: membership.features.customBranding ?? false,
            mobileApp: membership.features.mobileApp ?? false,
            offlineMode: membership.features.offlineMode ?? false,
            dataBackup: membership.features.dataBackup ?? false,
            complianceTools: membership.features.complianceTools ?? false,
            analyticsAdvanced: membership.features.analyticsAdvanced ?? false,
            aBTesting: membership.features.aBTesting ?? false,
            seoTools: membership.features.seoTools ?? false,
            customIntegrations: membership.features.customIntegrations ?? false,
            freePromotionsOnLanding: membership.features.freePromotionsOnLanding ?? false,
            // Email corporativo
            corporateEmailEnabled: membership.features.corporateEmailEnabled ?? false,
            maxCorporateEmails: membership.features.maxCorporateEmails !== undefined ? membership.features.maxCorporateEmails : null,
            emailSignatureBasic: membership.features.emailSignatureBasic ?? false,
            emailSignatureAdvanced: membership.features.emailSignatureAdvanced ?? false,
            emailAliases: membership.features.emailAliases ?? false,
            // Multi Dealer
            multiDealerEnabled: membership.features.multiDealerEnabled ?? false,
            maxDealers: membership.features.maxDealers !== undefined ? membership.features.maxDealers : null,
            requiresAdminApproval: membership.features.requiresAdminApproval ?? false,
          },
        };

        // Función para limpiar completamente undefined de un objeto
        const removeUndefinedRecursive = (obj: any): any => {
          if (obj === undefined) {
            return null;
          }
          if (obj === null) {
            return null;
          }
          if (Array.isArray(obj)) {
            return obj.map(removeUndefinedRecursive);
          }
          if (typeof obj === 'object') {
            const cleaned: any = {};
            for (const key in obj) {
              const value = obj[key];
              if (value !== undefined) {
                cleaned[key] = removeUndefinedRecursive(value);
              }
            }
            return cleaned;
          }
          return obj;
        };

        // Limpiar completamente antes de guardar
        const finalMembership = removeUndefinedRecursive(cleanedMembership);

        if (!existing.empty) {
          const docId = existing.docs[0].id;
          const existingData = existing.docs[0].data();
          // Preservar isActive si ya existe (no sobrescribir con el valor por defecto)
          const preservedIsActive = existingData.isActive !== undefined ? existingData.isActive : membership.isActive;
          
          // Preservar createdAt si existe
          const preservedCreatedAt = existingData.createdAt || admin.firestore.FieldValue.serverTimestamp();
          
          console.log(`🔄 Actualizando membresía existente: ${membership.name} (${membership.type}) - ID: ${docId}`);
          console.log(`   Estado preservado: isActive=${preservedIsActive}`);
          
          const updateData = {
            ...finalMembership,
            isActive: preservedIsActive, // Preservar el estado actual
            stripePriceId: stripePriceId || existingData.stripePriceId || '',
            createdAt: preservedCreatedAt, // Preservar fecha de creación
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          
          console.log(`💾 Datos a actualizar:`, JSON.stringify(updateData, null, 2));
          
          await dbInstance.collection('memberships').doc(docId).update(updateData);
          
          // Verificar que se guardó correctamente - con múltiples intentos
          let verifyDoc = await dbInstance.collection('memberships').doc(docId).get();
          let attempts = 0;
          while (!verifyDoc.exists && attempts < 3) {
            attempts++;
            console.log(`⚠️ Intento ${attempts}: La membresía no existe, esperando 200ms...`);
            await new Promise(resolve => setTimeout(resolve, 200));
            verifyDoc = await dbInstance.collection('memberships').doc(docId).get();
          }
          
          if (verifyDoc.exists) {
            const verifyData = verifyDoc.data();
            console.log(`✅ Membresía actualizada y verificada: ${docId}`);
            console.log(`   Nombre: ${verifyData?.name}, Tipo: ${verifyData?.type}, Activa: ${verifyData?.isActive}`);
            
            // Verificar que los datos críticos estén presentes
            if (!verifyData?.name || !verifyData?.type || verifyData?.isActive === undefined) {
              console.error(`⚠️ ADVERTENCIA: La membresía ${docId} tiene datos incompletos:`, {
                name: verifyData?.name,
                type: verifyData?.type,
                isActive: verifyData?.isActive,
                price: verifyData?.price,
              });
            }
          } else {
            console.error(`❌ ERROR CRÍTICO: La membresía ${docId} no existe después de ${attempts} intentos!`);
          }
          
          results.updated.push(`${membership.name} (${membership.type})`);
        } else {
          console.log(`✨ Creando nueva membresía: ${membership.name} (${membership.type})`);
          const docRef = dbInstance.collection('memberships').doc();
          
          const newMembershipData = {
            ...finalMembership,
            isActive: membership.isActive ?? true, // Por defecto activa si es nueva
            stripePriceId: stripePriceId || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          
          console.log(`💾 Datos a crear:`, JSON.stringify(newMembershipData, null, 2));
          
          await docRef.set(newMembershipData);
          
          // Verificar que se guardó correctamente - con múltiples intentos
          let verifyDoc = await dbInstance.collection('memberships').doc(docRef.id).get();
          let attempts = 0;
          while (!verifyDoc.exists && attempts < 3) {
            attempts++;
            console.log(`⚠️ Intento ${attempts}: La membresía no existe, esperando 200ms...`);
            await new Promise(resolve => setTimeout(resolve, 200));
            verifyDoc = await dbInstance.collection('memberships').doc(docRef.id).get();
          }
          
          if (verifyDoc.exists) {
            const verifyData = verifyDoc.data();
            console.log(`✅ Membresía creada y verificada: ${docRef.id}`);
            console.log(`   Nombre: ${verifyData?.name}, Tipo: ${verifyData?.type}, Activa: ${verifyData?.isActive}`);
            
            // Verificar que los datos críticos estén presentes
            if (!verifyData?.name || !verifyData?.type || verifyData?.isActive === undefined) {
              console.error(`⚠️ ADVERTENCIA: La membresía ${docRef.id} tiene datos incompletos:`, {
                name: verifyData?.name,
                type: verifyData?.type,
                isActive: verifyData?.isActive,
                price: verifyData?.price,
              });
            }
          } else {
            console.error(`❌ ERROR CRÍTICO: La membresía ${docRef.id} no existe después de ${attempts} intentos!`);
          }
          
          results.created.push(`${membership.name} (${membership.type})`);
        }
      } catch (error: any) {
        results.errors.push(`${membership.name}: ${error.message}`);
      }
    }

    const summary = {
      total: memberships.length,
      created: results.created.length,
      updated: results.updated.length,
      errors: results.errors.length,
      stripeCreated: results.stripeCreated.length,
      stripeErrors: results.stripeErrors.length,
    };

    console.log('✅ Proceso completado:', summary);
    
    return NextResponse.json({
      success: true,
      message: 'Membresías creadas exitosamente',
      results,
      summary,
    });
  } catch (error: any) {
    console.error('❌ Error creando membresías:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear membresías',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

