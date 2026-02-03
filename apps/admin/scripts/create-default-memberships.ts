/**
 * Script para crear las 6 membresías por defecto
 * 3 para Dealers y 3 para Sellers
 * Con features que corresponden a funcionalidades REALMENTE implementadas
 */

import { initializeFirebase, getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

// Inicializar Firebase
initializeFirebase();
const db = getFirestore();

interface MembershipData {
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: any;
  isActive: boolean;
}

const memberships: MembershipData[] = [
  // ========== DEALERS ==========
  {
    name: 'Dealer Básico',
    type: 'dealer',
    price: 99,
    currency: 'USD',
    billingCycle: 'monthly',
    isActive: true,
    features: {
      // Límites
      maxSellers: 2,
      maxInventory: 50,
      maxCampaigns: 5,
      maxPromotions: 10,
      maxLeadsPerMonth: 100,
      maxAppointmentsPerMonth: 50,
      maxStorageGB: 10,
      maxApiCallsPerMonth: 1000,
      
      // Features básicas (implementadas)
      customSubdomain: true, // ✅ Página web con subdominio
      customDomain: false,
      aiEnabled: false, // ❌ No implementado aún
      aiAutoResponses: false,
      aiContentGeneration: false,
      aiLeadClassification: false,
      socialMediaEnabled: true, // ✅ Publicaciones sociales implementadas
      socialMediaScheduling: false, // ⚠️ Parcial
      socialMediaAnalytics: false,
      marketplaceEnabled: false,
      marketplaceFeatured: false,
      advancedReports: false, // Solo reportes básicos
      customReports: false,
      exportData: false,
      whiteLabel: false,
      apiAccess: false,
      webhooks: false,
      ssoEnabled: false,
      multiLanguage: false,
      customTemplates: true, // ✅ Templates implementados
      emailMarketing: false,
      smsMarketing: false,
      whatsappMarketing: false,
      videoUploads: true, // ✅ Subida de videos implementada
      virtualTours: false,
      liveChat: true, // ✅ Chat público implementado
      appointmentScheduling: true, // ✅ Citas implementadas
      paymentProcessing: false,
      inventorySync: false,
      crmAdvanced: true, // ✅ CRM completo implementado
      leadScoring: false,
      automationWorkflows: false,
      integrationsUnlimited: false,
      prioritySupport: false,
      dedicatedManager: false,
      trainingSessions: false,
      customBranding: true, // ✅ Branding implementado
      mobileApp: false,
      offlineMode: false,
      dataBackup: false,
      complianceTools: false,
      analyticsAdvanced: false,
      aBTesting: false,
      seoTools: false,
      customIntegrations: false,
    },
  },
  {
    name: 'Dealer Professional',
    type: 'dealer',
    price: 249,
    currency: 'USD',
    billingCycle: 'monthly',
    isActive: true,
    features: {
      // Límites aumentados
      maxSellers: 10,
      maxInventory: 200,
      maxCampaigns: 20,
      maxPromotions: 50,
      maxLeadsPerMonth: 500,
      maxAppointmentsPerMonth: 200,
      maxStorageGB: 50,
      maxApiCallsPerMonth: 5000,
      
      // Features mejoradas
      customSubdomain: true,
      customDomain: true, // ✅ Dominio propio
      aiEnabled: true, // ✅ IA habilitada
      aiAutoResponses: true,
      aiContentGeneration: true,
      aiLeadClassification: true,
      socialMediaEnabled: true,
      socialMediaScheduling: true, // ✅ Programación implementada
      socialMediaAnalytics: true,
      marketplaceEnabled: true,
      marketplaceFeatured: false,
      advancedReports: true, // ✅ Reportes avanzados
      customReports: true,
      exportData: true,
      whiteLabel: false,
      apiAccess: true,
      webhooks: true,
      ssoEnabled: false,
      multiLanguage: false,
      customTemplates: true,
      emailMarketing: true,
      smsMarketing: true,
      whatsappMarketing: true,
      videoUploads: true,
      virtualTours: true,
      liveChat: true,
      appointmentScheduling: true,
      paymentProcessing: true,
      inventorySync: true,
      crmAdvanced: true,
      leadScoring: true,
      automationWorkflows: true,
      integrationsUnlimited: true,
      prioritySupport: true,
      dedicatedManager: false,
      trainingSessions: true,
      customBranding: true,
      mobileApp: false,
      offlineMode: false,
      dataBackup: true,
      complianceTools: true,
      analyticsAdvanced: true,
      aBTesting: true,
      seoTools: true,
      customIntegrations: false,
    },
  },
  {
    name: 'Dealer Enterprise',
    type: 'dealer',
    price: 599,
    currency: 'USD',
    billingCycle: 'monthly',
    isActive: true,
    features: {
      // Todo ilimitado
      maxSellers: undefined, // Ilimitado
      maxInventory: undefined,
      maxCampaigns: undefined,
      maxPromotions: undefined,
      maxLeadsPerMonth: undefined,
      maxAppointmentsPerMonth: undefined,
      maxStorageGB: undefined,
      maxApiCallsPerMonth: undefined,
      
      // Todas las features
      customSubdomain: true,
      customDomain: true,
      aiEnabled: true,
      aiAutoResponses: true,
      aiContentGeneration: true,
      aiLeadClassification: true,
      socialMediaEnabled: true,
      socialMediaScheduling: true,
      socialMediaAnalytics: true,
      marketplaceEnabled: true,
      marketplaceFeatured: true,
      advancedReports: true,
      customReports: true,
      exportData: true,
      whiteLabel: true, // ✅ White label
      apiAccess: true,
      webhooks: true,
      ssoEnabled: true,
      multiLanguage: true,
      customTemplates: true,
      emailMarketing: true,
      smsMarketing: true,
      whatsappMarketing: true,
      videoUploads: true,
      virtualTours: true,
      liveChat: true,
      appointmentScheduling: true,
      paymentProcessing: true,
      inventorySync: true,
      crmAdvanced: true,
      leadScoring: true,
      automationWorkflows: true,
      integrationsUnlimited: true,
      prioritySupport: true,
      dedicatedManager: true, // ✅ Gerente dedicado
      trainingSessions: true,
      customBranding: true,
      mobileApp: true,
      offlineMode: true,
      dataBackup: true,
      complianceTools: true,
      analyticsAdvanced: true,
      aBTesting: true,
      seoTools: true,
      customIntegrations: true,
    },
  },
  
  // ========== SELLERS ==========
  {
    name: 'Vendedor Básico',
    type: 'seller',
    price: 49,
    currency: 'USD',
    billingCycle: 'monthly',
    isActive: true,
    features: {
      // Límites para vendedor individual
      maxSellers: undefined, // No aplica para sellers
      maxInventory: 25, // Menos inventario que dealer
      maxCampaigns: 3,
      maxPromotions: 5,
      maxLeadsPerMonth: 50,
      maxAppointmentsPerMonth: 30,
      maxStorageGB: 5,
      maxApiCallsPerMonth: 500,
      
      // Features básicas
      customSubdomain: true, // ✅ Página web propia
      customDomain: false,
      aiEnabled: false,
      aiAutoResponses: false,
      aiContentGeneration: false,
      aiLeadClassification: false,
      socialMediaEnabled: true, // ✅ Redes sociales
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
      customTemplates: true, // ✅ Templates
      emailMarketing: false,
      smsMarketing: false,
      whatsappMarketing: false,
      videoUploads: true, // ✅ Videos
      virtualTours: false,
      liveChat: true, // ✅ Chat
      appointmentScheduling: true, // ✅ Citas
      paymentProcessing: false,
      inventorySync: false,
      crmAdvanced: true, // ✅ CRM completo
      leadScoring: false,
      automationWorkflows: false,
      integrationsUnlimited: false,
      prioritySupport: false,
      dedicatedManager: false,
      trainingSessions: false,
      customBranding: true, // ✅ Branding básico
      mobileApp: false,
      offlineMode: false,
      dataBackup: false,
      complianceTools: false,
      analyticsAdvanced: false,
      aBTesting: false,
      seoTools: false,
      customIntegrations: false,
    },
  },
  {
    name: 'Vendedor Professional',
    type: 'seller',
    price: 129,
    currency: 'USD',
    billingCycle: 'monthly',
    isActive: true,
    features: {
      // Límites aumentados
      maxSellers: undefined,
      maxInventory: 100,
      maxCampaigns: 15,
      maxPromotions: 30,
      maxLeadsPerMonth: 300,
      maxAppointmentsPerMonth: 150,
      maxStorageGB: 25,
      maxApiCallsPerMonth: 3000,
      
      // Features mejoradas
      customSubdomain: true,
      customDomain: true, // ✅ Dominio propio
      aiEnabled: true, // ✅ IA habilitada
      aiAutoResponses: true,
      aiContentGeneration: true,
      aiLeadClassification: true,
      socialMediaEnabled: true,
      socialMediaScheduling: true, // ✅ Programación
      socialMediaAnalytics: true,
      marketplaceEnabled: true,
      marketplaceFeatured: false,
      advancedReports: true, // ✅ Reportes avanzados
      customReports: true,
      exportData: true,
      whiteLabel: false,
      apiAccess: true,
      webhooks: true,
      ssoEnabled: false,
      multiLanguage: false,
      customTemplates: true,
      emailMarketing: true,
      smsMarketing: true,
      whatsappMarketing: true,
      videoUploads: true,
      virtualTours: true,
      liveChat: true,
      appointmentScheduling: true,
      paymentProcessing: true,
      inventorySync: true,
      crmAdvanced: true,
      leadScoring: true,
      automationWorkflows: true,
      integrationsUnlimited: true,
      prioritySupport: true,
      dedicatedManager: false,
      trainingSessions: true,
      customBranding: true,
      mobileApp: false,
      offlineMode: false,
      dataBackup: true,
      complianceTools: true,
      analyticsAdvanced: true,
      aBTesting: true,
      seoTools: true,
      customIntegrations: false,
    },
  },
  {
    name: 'Vendedor Premium',
    type: 'seller',
    price: 299,
    currency: 'USD',
    billingCycle: 'monthly',
    isActive: true,
    features: {
      // Todo ilimitado
      maxSellers: undefined,
      maxInventory: undefined,
      maxCampaigns: undefined,
      maxPromotions: undefined,
      maxLeadsPerMonth: undefined,
      maxAppointmentsPerMonth: undefined,
      maxStorageGB: undefined,
      maxApiCallsPerMonth: undefined,
      
      // Todas las features
      customSubdomain: true,
      customDomain: true,
      aiEnabled: true,
      aiAutoResponses: true,
      aiContentGeneration: true,
      aiLeadClassification: true,
      socialMediaEnabled: true,
      socialMediaScheduling: true,
      socialMediaAnalytics: true,
      marketplaceEnabled: true,
      marketplaceFeatured: true,
      advancedReports: true,
      customReports: true,
      exportData: true,
      whiteLabel: true, // ✅ White label
      apiAccess: true,
      webhooks: true,
      ssoEnabled: true,
      multiLanguage: true,
      customTemplates: true,
      emailMarketing: true,
      smsMarketing: true,
      whatsappMarketing: true,
      videoUploads: true,
      virtualTours: true,
      liveChat: true,
      appointmentScheduling: true,
      paymentProcessing: true,
      inventorySync: true,
      crmAdvanced: true,
      leadScoring: true,
      automationWorkflows: true,
      integrationsUnlimited: true,
      prioritySupport: true,
      dedicatedManager: true, // ✅ Gerente dedicado
      trainingSessions: true,
      customBranding: true,
      mobileApp: true,
      offlineMode: true,
      dataBackup: true,
      complianceTools: true,
      analyticsAdvanced: true,
      aBTesting: true,
      seoTools: true,
      customIntegrations: true,
    },
  },
];

async function createMemberships() {
  console.log('🚀 Creando 6 membresías por defecto...\n');

  for (const membership of memberships) {
    try {
      // Verificar si ya existe
      const existing = await db
        .collection('memberships')
        .where('name', '==', membership.name)
        .where('type', '==', membership.type)
        .limit(1)
        .get();

      if (!existing.empty) {
        console.log(`⚠️  Membresía "${membership.name}" ya existe, actualizando...`);
        const docId = existing.docs[0].id;
        await db.collection('memberships').doc(docId).update({
          ...membership,
          stripePriceId: '', // Se creará en Stripe después
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Actualizada: ${membership.name} (${membership.type})`);
      } else {
        const docRef = db.collection('memberships').doc();
        await docRef.set({
          ...membership,
          stripePriceId: '', // Se creará en Stripe después
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Creada: ${membership.name} (${membership.type}) - $${membership.price}/${membership.billingCycle}`);
      }
    } catch (error) {
      console.error(`❌ Error creando ${membership.name}:`, error);
    }
  }

  console.log('\n✅ Proceso completado!');
  console.log('\n📋 Resumen:');
  console.log('   Dealers: 3 membresías');
  console.log('   Sellers: 3 membresías');
  console.log('\n💡 Nota: Las membresías se crearán en Stripe automáticamente cuando el admin las gestione.');
}

// Ejecutar
createMemberships()
  .then(() => {
    console.log('\n🎉 ¡Membresías creadas exitosamente!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });


