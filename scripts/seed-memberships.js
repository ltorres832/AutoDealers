#!/usr/bin/env node

/**
 * Script para crear membresías iniciales
 * Uso: node scripts/seed-memberships.js
 */

const admin = require('firebase-admin');

async function seedMemberships() {
  try {
    // Inicializar Firebase Admin
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    const db = admin.firestore();

    const memberships = [
      {
        name: 'Dealer Básico',
        type: 'dealer',
        price: 99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: {
          maxSellers: 3,
          maxInventory: 50,
          customSubdomain: false,
          aiEnabled: false,
          socialMediaEnabled: false,
          marketplaceEnabled: false,
          advancedReports: false,
        },
        stripePriceId: '', // Configurar en Stripe
        isActive: true,
      },
      {
        name: 'Dealer Pro',
        type: 'dealer',
        price: 199,
        currency: 'USD',
        billingCycle: 'monthly',
        features: {
          maxSellers: 10,
          maxInventory: 200,
          customSubdomain: true,
          aiEnabled: true,
          socialMediaEnabled: true,
          marketplaceEnabled: false,
          advancedReports: true,
        },
        stripePriceId: '', // Configurar en Stripe
        isActive: true,
      },
      {
        name: 'Vendedor Básico',
        type: 'seller',
        price: 29,
        currency: 'USD',
        billingCycle: 'monthly',
        features: {
          maxInventory: 0,
          customSubdomain: false,
          aiEnabled: false,
          socialMediaEnabled: false,
          marketplaceEnabled: false,
          advancedReports: false,
        },
        stripePriceId: '', // Configurar en Stripe
        isActive: true,
      },
      {
        name: 'Vendedor Pro',
        type: 'seller',
        price: 49,
        currency: 'USD',
        billingCycle: 'monthly',
        features: {
          maxInventory: 0,
          customSubdomain: true,
          aiEnabled: true,
          socialMediaEnabled: true,
          marketplaceEnabled: false,
          advancedReports: true,
        },
        stripePriceId: '', // Configurar en Stripe
        isActive: true,
      },
    ];

    console.log('Creando membresías...');

    for (const membership of memberships) {
      const docRef = db.collection('memberships').doc();
      await docRef.set({
        ...membership,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Creada: ${membership.name} (${docRef.id})`);
    }

    console.log('\n✅ Todas las membresías creadas exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedMemberships();





