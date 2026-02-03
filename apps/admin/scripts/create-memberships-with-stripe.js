/**
 * Script COMPLETO para crear las 6 membresías por defecto
 * - Crea membresías en Firestore
 * - Crea productos y precios en Stripe automáticamente
 * - Vincula todo automáticamente
 */

// Cargar variables de entorno manualmente si dotenv no está disponible
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv no disponible, usar variables de entorno del sistema
}

const { initializeFirebase, getFirestore } = require('@autodealers/core');
const admin = require('firebase-admin');

// Stripe solo si está configurado
let Stripe = null;
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });
  } catch (e) {
    console.warn('⚠️  Stripe no disponible, creando membresías sin Stripe');
  }
}

// Inicializar Firebase
initializeFirebase();
const db = getFirestore();

const memberships = [
  // ========== DEALERS ==========
  {
    name: 'Dealer Básico',
    type: 'dealer',
    price: 99,
    currency: 'USD',
    billingCycle: 'monthly',
    isActive: true,
    features: {
      maxSellers: 2,
      maxInventory: 50,
      maxCampaigns: 5,
      maxPromotions: 10,
      maxLeadsPerMonth: 100,
      maxAppointmentsPerMonth: 50,
      maxStorageGB: 10,
      maxApiCallsPerMonth: 1000,
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
      maxSellers: 10,
      maxInventory: 200,
      maxCampaigns: 20,
      maxPromotions: 50,
      maxLeadsPerMonth: 500,
      maxAppointmentsPerMonth: 200,
      maxStorageGB: 50,
      maxApiCallsPerMonth: 5000,
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
      marketplaceFeatured: false,
      advancedReports: true,
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
      maxSellers: null,
      maxInventory: null,
      maxCampaigns: null,
      maxPromotions: null,
      maxLeadsPerMonth: null,
      maxAppointmentsPerMonth: null,
      maxStorageGB: null,
      maxApiCallsPerMonth: null,
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
      whiteLabel: true,
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
      dedicatedManager: true,
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
      maxSellers: null,
      maxInventory: 25,
      maxCampaigns: 3,
      maxPromotions: 5,
      maxLeadsPerMonth: 50,
      maxAppointmentsPerMonth: 30,
      maxStorageGB: 5,
      maxApiCallsPerMonth: 500,
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
      maxSellers: null,
      maxInventory: 100,
      maxCampaigns: 15,
      maxPromotions: 30,
      maxLeadsPerMonth: 300,
      maxAppointmentsPerMonth: 150,
      maxStorageGB: 25,
      maxApiCallsPerMonth: 3000,
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
      marketplaceFeatured: false,
      advancedReports: true,
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
      maxSellers: null,
      maxInventory: null,
      maxCampaigns: null,
      maxPromotions: null,
      maxLeadsPerMonth: null,
      maxAppointmentsPerMonth: null,
      maxStorageGB: null,
      maxApiCallsPerMonth: null,
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
      whiteLabel: true,
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
      dedicatedManager: true,
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
  console.log('🚀 Creando 6 membresías con Stripe...\n');

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY no configurado en .env.local');
    console.log('⚠️  Creando membresías sin Stripe. Puedes vincularlas después desde el admin.');
  }

  for (const membership of memberships) {
    try {
      let stripePriceId = '';

      // Crear en Stripe si está configurado
      if (stripe && process.env.STRIPE_SECRET_KEY) {
        try {
          // Crear producto en Stripe
          const product = await stripe.products.create({
            name: `${membership.name} - ${membership.type === 'dealer' ? 'Dealer' : 'Vendedor'}`,
            description: `Plan de membresía ${membership.name} para ${membership.type === 'dealer' ? 'dealers' : 'vendedores'}`,
            metadata: {
              type: membership.type,
              managedBy: 'autodealers',
            },
          });

          // Crear precio en Stripe
          const stripePrice = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(membership.price * 100), // Convertir a centavos
            currency: membership.currency.toLowerCase(),
            recurring: {
              interval: membership.billingCycle === 'monthly' ? 'month' : 'year',
            },
          });

          stripePriceId = stripePrice.id;
          console.log(`💳 Stripe: ${product.name} - Precio: ${stripePrice.id}`);
        } catch (stripeError) {
          console.warn(`⚠️  Error creando en Stripe para ${membership.name}:`, stripeError.message);
        }
      }

      // Verificar si ya existe en Firestore
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
          stripePriceId: stripePriceId || existing.docs[0].data().stripePriceId || '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Actualizada: ${membership.name} (${membership.type}) - $${membership.price}/${membership.billingCycle}`);
      } else {
        const docRef = db.collection('memberships').doc();
        await docRef.set({
          ...membership,
          stripePriceId: stripePriceId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Creada: ${membership.name} (${membership.type}) - $${membership.price}/${membership.billingCycle}`);
      }
    } catch (error) {
      console.error(`❌ Error creando ${membership.name}:`, error.message);
    }
  }

  console.log('\n✅ Proceso completado!');
  console.log('\n📋 Resumen:');
  console.log('   Dealers: 3 membresías');
  console.log('   Sellers: 3 membresías');
  console.log('\n💡 Las membresías están listas y el sistema detectará automáticamente las features.');
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

