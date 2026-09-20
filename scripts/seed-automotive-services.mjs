#!/usr/bin/env node
/**
 * Sembrar categorías, planes Business, flags de servicios y publicar fichas.
 * Proyecto: autodealers-7f62e
 *
 * Uso: node scripts/seed-automotive-services.mjs
 */
import admin from 'firebase-admin';
import { seedAutomotiveSpecializations } from './seed-automotive-specializations.mjs';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';

const CATEGORIES = [
  { slug: 'talleres-mecanicos', name: 'Talleres mecánicos', description: 'Diagnóstico, motor, frenos y mantenimiento general', icon: '🔧', moduleKey: 'mechanic', seoTitle: 'Talleres mecánicos en Puerto Rico', seoDescription: 'Encuentra talleres mecánicos cerca de ti.', sortOrder: 1 },
  { slug: 'gomeras', name: 'Gomeras y gomas', description: 'Gomas, rotación, alineación y balanceo', icon: '🛞', moduleKey: 'tires', seoTitle: 'Gomeras cerca de ti', seoDescription: 'Gomeras y servicios de gomas.', sortOrder: 2 },
  { slug: 'detailing', name: 'Detailing y estética', description: 'Lavado, detailing y estética automotriz', icon: '✨', moduleKey: 'detailing', seoTitle: 'Detailing automotriz', seoDescription: 'Detailing y estética para tu vehículo.', sortOrder: 3 },
  { slug: 'hojalateria', name: 'Hojalatería y pintura', description: 'Reparación de colisión, pintura y enderezado', icon: '🎨', moduleKey: 'body', seoTitle: 'Hojalatería y pintura', seoDescription: 'Talleres de hojalatería y pintura.', sortOrder: 4 },
  { slug: 'tint-wrap', name: 'Tint, wrap y PPF', description: 'Tintado, wraps y protección de pintura', icon: '🪟', moduleKey: 'tint', seoTitle: 'Tint, wrap y PPF', seoDescription: 'Tintado, wraps y PPF.', sortOrder: 5 },
  { slug: 'piezas', name: 'Piezas y accesorios', description: 'Repuestos, accesorios y piezas usadas', icon: '🧩', moduleKey: 'parts', seoTitle: 'Piezas de auto', seoDescription: 'Piezas y accesorios automotrices.', sortOrder: 6 },
  { slug: 'gruas', name: 'Grúas y remolque', description: 'Remolque, grúas y asistencia en carretera', icon: '🚛', moduleKey: 'towing', seoTitle: 'Grúas y remolque', seoDescription: 'Servicio de grúas y remolque.', sortOrder: 7 },
  { slug: 'cristales', name: 'Cristales y parabrisas', description: 'Cambio y reparación de cristales', icon: '🪟', moduleKey: 'glass', seoTitle: 'Cristales y parabrisas', seoDescription: 'Reparación y cambio de cristales.', sortOrder: 8 },
  { slug: 'inspeccion', name: 'Inspección vehicular', description: 'Inspección, marbete y certificaciones', icon: '📋', moduleKey: 'inspection', seoTitle: 'Inspección vehicular', seoDescription: 'Centros de inspección vehicular.', sortOrder: 9 },
  { slug: 'seguros', name: 'Seguros de auto', description: 'Pólizas, cotizaciones y renovaciones', icon: '🛡️', moduleKey: 'insurance', seoTitle: 'Seguros de auto', seoDescription: 'Agentes y corredores de seguros de auto.', sortOrder: 10 },
  { slug: 'cambio-aceite', name: 'Cambio de aceite', description: 'Aceite, filtros y mantenimiento rápido', icon: '🛢️', moduleKey: 'mechanic', seoTitle: 'Cambio de aceite', seoDescription: 'Cambio de aceite y filtros.', sortOrder: 11 },
  { slug: 'baterias', name: 'Baterías', description: 'Prueba, carga y reemplazo de baterías', icon: '🔋', moduleKey: 'parts', seoTitle: 'Baterías de auto', seoDescription: 'Baterías y servicio eléctrico.', sortOrder: 12 },
  { slug: 'aire-acondicionado', name: 'Aire acondicionado', description: 'Recarga, diagnóstico y reparación de A/C', icon: '❄️', moduleKey: 'mechanic', seoTitle: 'Aire acondicionado automotriz', seoDescription: 'Servicio de A/C para vehículos.', sortOrder: 13 },
  { slug: 'frenos', name: 'Frenos', description: 'Pastillas, discos y sistema de frenos', icon: '🛑', moduleKey: 'mechanic', seoTitle: 'Servicio de frenos', seoDescription: 'Reparación de frenos.', sortOrder: 14 },
  { slug: 'alineacion', name: 'Alineación y balanceo', description: 'Alineación, balanceo y suspensión', icon: '⚙️', moduleKey: 'tires', seoTitle: 'Alineación y balanceo', seoDescription: 'Alineación y balanceo de gomas.', sortOrder: 15 },
  { slug: 'lavado', name: 'Lavado de autos', description: 'Lavado, encerado y cuidado exterior', icon: '🚿', moduleKey: 'detailing', seoTitle: 'Lavado de autos', seoDescription: 'Lavado y cuidado exterior.', sortOrder: 16 },
  { slug: 'audio', name: 'Audio y alarmas', description: 'Car audio, alarmas y accesorios electrónicos', icon: '🔊', moduleKey: 'parts', seoTitle: 'Audio y alarmas', seoDescription: 'Audio, alarmas y electrónica.', sortOrder: 17 },
  { slug: 'electrico', name: 'Eléctrico automotriz', description: 'Diagnóstico eléctrico y computadoras', icon: '⚡', moduleKey: 'mechanic', seoTitle: 'Eléctrico automotriz', seoDescription: 'Diagnóstico eléctrico.', sortOrder: 18 },
  { slug: 'transmision', name: 'Transmisión', description: 'Reparación y servicio de transmisión', icon: '🔁', moduleKey: 'mechanic', seoTitle: 'Transmisión automotriz', seoDescription: 'Servicio de transmisión.', sortOrder: 19 },
  { slug: 'escapes', name: 'Escapes', description: 'Sistema de escape y emisiones', icon: '💨', moduleKey: 'mechanic', seoTitle: 'Escapes', seoDescription: 'Reparación de escapes.', sortOrder: 20 },
  { slug: 'hibridos-ev', name: 'Híbridos y eléctricos', description: 'Servicio especializado EV e híbridos', icon: '🔌', moduleKey: 'mechanic', seoTitle: 'Servicio EV e híbridos', seoDescription: 'Talleres para híbridos y eléctricos.', sortOrder: 21 },
  { slug: 'motos', name: 'Motocicletas', description: 'Taller, gomas y piezas para motos', icon: '🏍️', moduleKey: 'general', seoTitle: 'Servicios para motos', seoDescription: 'Talleres y piezas para motocicletas.', sortOrder: 22 },
  { slug: 'flotas', name: 'Flotas', description: 'Mantenimiento de flotas comerciales', icon: '🚐', moduleKey: 'general', seoTitle: 'Mantenimiento de flotas', seoDescription: 'Servicios para flotas.', sortOrder: 23 },
  { slug: 'asistencia-vial', name: 'Asistencia vial', description: 'Auxilio en carretera y batería', icon: '🆘', moduleKey: 'towing', seoTitle: 'Asistencia vial', seoDescription: 'Asistencia vial y auxilio.', sortOrder: 24 },
  { slug: 'cerrajeria', name: 'Cerrajería automotriz', description: 'Llaves, chips y apertura de vehículos', icon: '🔑', moduleKey: 'general', seoTitle: 'Cerrajería automotriz', seoDescription: 'Cerrajería para autos.', sortOrder: 25 },
  { slug: 'radiadores', name: 'Radiadores', description: 'Enfriamiento, radiadores y mangueras', icon: '🌡️', moduleKey: 'mechanic', seoTitle: 'Radiadores', seoDescription: 'Servicio de radiadores.', sortOrder: 26 },
  { slug: 'emisiones', name: 'Emisiones', description: 'Pruebas y corrección de emisiones', icon: '🧪', moduleKey: 'inspection', seoTitle: 'Emisiones vehiculares', seoDescription: 'Pruebas de emisiones.', sortOrder: 27 },
];

const MEMBERSHIPS = [
  {
    name: 'Servicios Esencial',
    aliases: ['Servicios Esencial', 'Business Essential'],
    price: 29,
    description: 'Plan mensual para talleres, gomeras y servicios automotrices. Publica tu ficha y agenda citas.',
    features: {
      appointmentScheduling: true,
      crmAdvanced: false,
      socialMediaEnabled: false,
      paymentProcessing: false,
      aiEnabled: false,
      customSubdomain: false,
      customDomain: false,
      marketplaceEnabled: true,
    },
  },
  {
    name: 'Servicios Pro',
    aliases: ['Servicios Pro', 'Business Pro'],
    price: 59,
    description: 'Plan mensual para talleres y servicios automotrices con CRM y redes.',
    features: {
      appointmentScheduling: true,
      crmAdvanced: true,
      socialMediaEnabled: true,
      paymentProcessing: false,
      aiEnabled: true,
      customSubdomain: true,
      customDomain: false,
      marketplaceEnabled: true,
    },
  },
  {
    name: 'Servicios Premium',
    aliases: ['Servicios Premium', 'Business Premium'],
    price: 99,
    description: 'Plan mensual premium para talleres, gomeras y servicios automotrices con soporte prioritario.',
    features: {
      appointmentScheduling: true,
      crmAdvanced: true,
      socialMediaEnabled: true,
      paymentProcessing: true,
      aiEnabled: true,
      customSubdomain: true,
      customDomain: false,
      marketplaceEnabled: true,
      prioritySupport: true,
    },
  },
];

/** Klarna y Affirm están activos en Stripe; el seed no debe apagarlos. */
const FLAGS = [
  { dashboard: 'public', featureKey: 'automotive_businesses_enabled', featureName: 'Negocios automotrices', enabled: true },
  { dashboard: 'public', featureKey: 'services_public_section_enabled', featureName: 'Sección servicios en homepage', enabled: true },
  { dashboard: 'public', featureKey: 'business_registration_enabled', featureName: 'Registro de negocios', enabled: true },
  { dashboard: 'public', featureKey: 'my_garage_enabled', featureName: 'Mi garage', enabled: true },
  { dashboard: 'public', featureKey: 'vehicle_service_recommendations_enabled', featureName: 'Sugerencias de servicios', enabled: true },
  { dashboard: 'business', featureKey: 'automotive_businesses_enabled', featureName: 'Portal de negocio', enabled: true },
  { dashboard: 'business', featureKey: 'business_subscriptions_enabled', featureName: 'Membresías Business', enabled: true },
  { dashboard: 'business', featureKey: 'business_social_enabled', featureName: 'Social del negocio', enabled: true },
  { dashboard: 'business', featureKey: 'business_crm_enabled', featureName: 'CRM del negocio', enabled: true },
  { dashboard: 'business', featureKey: 'business_appointments_enabled', featureName: 'Citas del negocio', enabled: true },
  { dashboard: 'business', featureKey: 'business_estimates_enabled', featureName: 'Estimados', enabled: true },
  { dashboard: 'business', featureKey: 'business_invoices_enabled', featureName: 'Facturas de servicio', enabled: true },
  { dashboard: 'business', featureKey: 'autodealers_payments_enabled', featureName: 'AutoDealers Payments', enabled: true },
  { dashboard: 'business', featureKey: 'card_payments_enabled', featureName: 'Pagos con tarjeta', enabled: true },
  { dashboard: 'business', featureKey: 'klarna_enabled', featureName: 'Klarna', enabled: true },
  { dashboard: 'business', featureKey: 'affirm_enabled', featureName: 'Affirm', enabled: true },
  { dashboard: 'business', featureKey: 'business_reviews_enabled', featureName: 'Reseñas del negocio', enabled: true },
  { dashboard: 'business', featureKey: 'business_products_enabled', featureName: 'Productos del negocio', enabled: true },
  { dashboard: 'business', featureKey: 'business_inventory_enabled', featureName: 'Inventario de piezas', enabled: true },
  { dashboard: 'admin', featureKey: 'automotive_businesses_enabled', featureName: 'Admin negocios automotrices', enabled: true },
];

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

async function seedCategories() {
  const existing = await db.collection('business_categories').get();
  const bySlug = new Map(existing.docs.map((d) => [String(d.data().slug || ''), d]));
  let created = 0;
  let updated = 0;
  for (const cat of CATEGORIES) {
    const payload = { ...cat, isActive: true, updatedAt: now };
    const found = bySlug.get(cat.slug);
    if (found) {
      await found.ref.set(payload, { merge: true });
      updated += 1;
    } else {
      await db.collection('business_categories').add({ ...payload, createdAt: now });
      created += 1;
    }
  }
  return { created, updated, total: CATEGORIES.length };
}

async function seedMemberships() {
  const existing = await db.collection('memberships').where('type', '==', 'business').get();
  const byName = new Map(existing.docs.map((d) => [String(d.data().name || ''), d]));
  const byPrice = new Map(
    existing.docs
      .filter((d) => Number(d.data().price) > 0)
      .map((d) => [Number(d.data().price), d])
  );
  let created = 0;
  let updated = 0;
  for (const plan of MEMBERSHIPS) {
    const payload = {
      name: plan.name,
      description: plan.description,
      type: 'business',
      audience: 'automotive_services',
      price: plan.price,
      currency: 'USD',
      billingCycle: 'monthly',
      isActive: true,
      features: plan.features,
      updatedAt: now,
    };
    const found =
      plan.aliases.map((alias) => byName.get(alias)).find(Boolean) || byPrice.get(plan.price);
    const dealerOnlyKeys = [
      'multiDealerEnabled',
      'multipleDealers',
      'requiresAdminApproval',
      'maxSellers',
      'maxDealers',
      'fiModule',
      'fiMultipleManagers',
      'compensationPortalEnabled',
    ];
    if (found) {
      const cleanedFeatures = { ...(found.data().features || {}), ...plan.features };
      for (const key of dealerOnlyKeys) delete cleanedFeatures[key];
      await found.ref.set(payload, { merge: true });
      await found.ref.update({ features: cleanedFeatures });
      updated += 1;
    } else {
      await db.collection('memberships').add({ ...payload, createdAt: now });
      created += 1;
    }
  }
  return { created, updated, total: MEMBERSHIPS.length };
}

async function seedFlags() {
  let created = 0;
  let updated = 0;
  for (const flag of FLAGS) {
    const snap = await db
      .collection('feature_flags')
      .where('dashboard', '==', flag.dashboard)
      .where('featureKey', '==', flag.featureKey)
      .limit(1)
      .get();
    const payload = {
      dashboard: flag.dashboard,
      featureKey: flag.featureKey,
      featureName: flag.featureName,
      enabled: flag.enabled,
      category: 'Servicios',
      updatedAt: now,
    };
    if (snap.empty) {
      await db.collection('feature_flags').add({ ...payload, createdAt: now });
      created += 1;
    } else {
      await snap.docs[0].ref.set(payload, { merge: true });
      updated += 1;
    }
  }
  return { created, updated, total: FLAGS.length, enabled: FLAGS.filter((f) => f.enabled).length };
}

async function publishBusinesses() {
  const snap = await db.collection('tenants').where('type', '==', 'automotive_business').get();
  let published = 0;
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (data.status && data.status !== 'active' && data.status !== 'pending') continue;
    await doc.ref.set(
      {
        published: true,
        status: 'active',
        updatedAt: now,
      },
      { merge: true }
    );
    published += 1;
  }
  return { found: snap.size, published };
}

async function seedFees() {
  await db.collection('platform_payment_fees').doc('default').set(
    {
      cardBps: 350,
      klarnaBps: 1000,
      affirmBps: 1000,
      updatedAt: now,
    },
    { merge: true }
  );
}

function flattenStripe(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}[${key}]` : key;
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      flattenStripe(value, next, out);
    } else if (value != null) {
      out[next] = String(value);
    }
  }
  return out;
}

async function stripeRequest(secret, method, path, body) {
  const headers = { Authorization: `Bearer ${secret}` };
  const init = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(flattenStripe(body)).toString();
  }
  const res = await fetch(`https://api.stripe.com/v1/${path}`, init);
  const json = await res.json();
  return { status: res.status, json };
}

async function syncBusinessStripe() {
  const creds = await db.collection('system_settings').doc('credentials').get();
  const secret = String(creds.data()?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secret.startsWith('sk_live_')) {
    throw new Error(
      `Se requiere Stripe LIVE (sk_live_). Actual=${secret.startsWith('sk_test_') ? 'test' : secret ? 'otro' : 'vacío'}`
    );
  }

  const snap = await db.collection('memberships').where('type', '==', 'business').get();
  const linked = [];
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const name = String(data.name || 'Servicios');
    const amount = Math.round(Number(data.price || 0) * 100);
    if (!(amount > 0)) continue;

    const productName = `${name} (regular) - Negocio automotriz`;
    const productDescription = String(
      data.description || `Membresía mensual para talleres, gomeras y servicios automotrices · ${name}`
    );
    let productId = String(data.stripeProductId || '').trim();
    let priceId = String(data.stripePriceId || '').trim();

    if (productId) {
      const existing = await stripeRequest(secret, 'GET', `products/${encodeURIComponent(productId)}`);
      if (existing.status !== 200 || !existing.json?.id) productId = '';
    }
    if (!productId) {
      const created = await stripeRequest(secret, 'POST', 'products', {
        name: productName,
        description: productDescription,
        metadata: { managedBy: 'autodealers', type: 'business', priceKind: 'regular', membershipId: doc.id },
      });
      if (!created.json?.id) throw new Error(created.json?.error?.message || 'No se pudo crear producto Stripe');
      productId = created.json.id;
    } else {
      await stripeRequest(secret, 'POST', `products/${encodeURIComponent(productId)}`, {
        name: productName,
        description: productDescription,
        metadata: { managedBy: 'autodealers', type: 'business', priceKind: 'regular', membershipId: doc.id },
      });
    }

    let priceOk = false;
    if (priceId) {
      const existingPrice = await stripeRequest(secret, 'GET', `prices/${encodeURIComponent(priceId)}`);
      priceOk =
        existingPrice.status === 200 &&
        existingPrice.json?.id === priceId &&
        existingPrice.json?.active !== false &&
        Number(existingPrice.json?.unit_amount) === amount;
    }
    if (!priceOk) {
      const createdPrice = await stripeRequest(secret, 'POST', 'prices', {
        product: productId,
        unit_amount: String(amount),
        currency: String(data.currency || 'USD').toLowerCase(),
        recurring: { interval: data.billingCycle === 'yearly' ? 'year' : 'month' },
        metadata: { managedBy: 'autodealers', type: 'business', priceKind: 'regular', membershipId: doc.id },
      });
      if (!createdPrice.json?.id) {
        throw new Error(createdPrice.json?.error?.message || 'No se pudo crear price Stripe');
      }
      priceId = createdPrice.json.id;
    }

    await doc.ref.set(
      {
        stripeProductId: productId,
        stripePriceId: priceId,
        updatedAt: now,
      },
      { merge: true }
    );
    linked.push({
      id: doc.id,
      name,
      price: data.price,
      stripeProductId: productId,
      stripePriceId: priceId,
    });
  }
  return { mode: 'live', count: linked.length, memberships: linked };
}

const categories = await seedCategories();
const specializations = await seedAutomotiveSpecializations(db);
const memberships = await seedMemberships();
const flags = await seedFlags();
const businesses = await publishBusinesses();
await seedFees();
const stripe = await syncBusinessStripe();

console.log(
  JSON.stringify({ ok: true, project: PROJECT_ID, categories, specializations, memberships, flags, businesses, stripe }, null, 2)
);
