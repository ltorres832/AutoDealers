/**
 * Pobla el dealer demo Caribe Motors con CRM, F&I, documentos, promociones, etc.
 * El inventario se mantiene con seed-demo-dealer.cjs.
 *
 * Uso: node scripts/seed-demo-dealer-full-data.cjs
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp();
const T = admin.firestore.Timestamp;

const DEALER_ID = 'UA0vfLzy8vUTwBXJCn3lnmsOY712';
const TENANT_ID = '5aqHmomoUxKwsVxGJjnV';
const DEALER_NAME = 'Ricardo Colón';
const DEALER_PHONE = '17875550288';

function daysAgo(n, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function hoursFromNow(h, minute = 0) {
  const d = new Date();
  d.setHours(d.getHours() + h, minute, 0, 0);
  return d;
}

function todayAt(hour, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysFromNow(n, hour = 11, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function deleteCollection(colRef, batchSize = 100) {
  const snap = await colRef.limit(batchSize).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size + (await deleteCollection(colRef, batchSize));
}

async function cleanupDemoCrmData() {
  const tenantRef = db.collection('tenants').doc(TENANT_ID);
  const subs = [
    'leads',
    'sales',
    'appointments',
    'messages',
    'tasks',
    'reviews',
    'campaigns',
    'vehicle_interest_signals',
    'public_chat_messages',
    'workflows',
    'fi_clients',
    'notifications',
    'promotions',
    'documents',
    'deals',
  ];
  for (const sub of subs) {
    const n = await deleteCollection(tenantRef.collection(sub));
    if (n > 0) console.log(`  🗑️  ${sub}: ${n} docs eliminados`);
  }
}

function leadScore(priority, automatic) {
  const now = new Date();
  return {
    automatic,
    combined: automatic,
    lastUpdated: now,
    history: [{ score: automatic, type: 'automatic', updatedAt: now }],
    aiClassification: {
      priority,
      sentiment: priority === 'high' ? 'positive' : 'neutral',
      intent: priority === 'high' ? 'compra_inmediata' : 'informacion',
    },
  };
}

const DEMO_FLAGS = { isDemo: true, isDemoSeedData: true, visibility: 'demo' };

async function main() {
  console.log('\n🌱 Poblando datos demo para Caribe Motors PR...\n');

  const tenantSnap = await db.collection('tenants').doc(TENANT_ID).get();
  if (!tenantSnap.exists) {
    throw new Error(
      `Tenant demo no encontrado: ${TENANT_ID}. Ejecuta primero node scripts/seed-demo-dealer.cjs`
    );
  }

  const vehSnap = await db.collection('tenants').doc(TENANT_ID).collection('vehicles').get();
  const vehicles = vehSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (vehicles.length === 0) {
    throw new Error('No hay vehículos del demo dealer. Ejecuta seed-demo-dealer.cjs primero.');
  }

  console.log('Limpiando datos CRM previos del tenant demo...');
  await cleanupDemoCrmData();

  const vLabel = (i) => {
    const v = vehicles[i % vehicles.length];
    return `${v.year} ${v.make} ${v.model}`;
  };
  const vId = (i) => vehicles[i % vehicles.length].id;

  const tenantRef = db.collection('tenants').doc(TENANT_ID);
  const leadIds = {};

  const LEADS = [
    { key: 'jose', name: 'José Pérez', phone: '7875552001', email: 'jose.perez@email.com', city: 'Guaynabo', status: 'new', source: 'web', vi: 0, days: 0, hours: 2, note: 'Interesado en RAV4 2022.', tags: ['pagina_publica'], score: 80, priority: 'high' },
    { key: 'laura', name: 'Laura Díaz', phone: '7875552002', email: 'laura.diaz@email.com', city: 'San Juan', status: 'contacted', source: 'whatsapp', vi: 1, days: 1, hours: 0, note: 'Financiamiento Accord.', tags: ['financiamiento'], score: 70, priority: 'medium' },
    { key: 'pedro', name: 'Pedro Núñez', phone: '7875552003', email: 'pedro.nunez@email.com', city: 'Bayamón', status: 'appointment', source: 'phone', vi: 2, days: 2, hours: 0, note: 'Cita test drive Explorer.', tags: ['cita'], score: 88, priority: 'high' },
    { key: 'ana', name: 'Ana Rivera', phone: '7875552004', email: 'ana.cliente@email.com', city: 'Carolina', status: 'qualified', source: 'facebook', vi: 3, days: 3, hours: 0, note: 'Silverado para trabajo.', tags: [], score: 75, priority: 'medium' },
    { key: 'miguel', name: 'Miguel Torres', phone: '7875552005', email: 'miguel.torres@email.com', city: 'Caguas', status: 'negotiation', source: 'web', vi: 4, days: 4, hours: 0, note: 'Negocia BMW 330i.', tags: ['negociacion'], score: 93, priority: 'high' },
    { key: 'sofia', name: 'Sofía Vega', phone: '7875552006', email: 'sofia.vega@email.com', city: 'Ponce', status: 'closed', source: 'whatsapp', vi: 5, days: 20, hours: 0, note: 'Compró Sportage.', tags: ['venta_cerrada'], score: 100, priority: 'high' },
    { key: 'diego', name: 'Diego Morales', phone: '7875552007', email: 'diego.morales@email.com', city: 'Mayagüez', status: 'lost', source: 'web', vi: 1, days: 18, hours: 0, note: 'Compró en otro dealer.', tags: ['perdido'], score: 25, priority: 'low' },
    { key: 'carmen', name: 'Carmen Ortiz', phone: '7875552008', email: 'carmen.ortiz@email.com', city: 'Humacao', status: 'new', source: 'instagram', vi: 0, days: 0, hours: 1, note: 'Lead fresco — RAV4.', tags: ['lead_reciente'], score: 82, priority: 'high' },
  ];

  console.log('\n📝 Creando leads...');
  for (const l of LEADS) {
    const createdAt = l.days === 0 && l.hours ? hoursFromNow(-l.hours) : daysAgo(l.days, 9);
    const ref = tenantRef.collection('leads').doc();
    leadIds[l.key] = ref.id;
    await ref.set({
      tenantId: TENANT_ID,
      assignedTo: DEALER_ID,
      source: l.source,
      status: l.status,
      contact: {
        name: l.name,
        phone: l.phone,
        email: l.email,
        preferredChannel: l.source === 'whatsapp' ? 'whatsapp' : l.source === 'phone' ? 'phone' : 'email',
        city: l.city,
      },
      vehicleId: vId(l.vi),
      vehicleInterest: vLabel(l.vi),
      notes: l.note,
      tags: l.tags,
      interactions: [{ id: 'int-1', type: 'note', content: l.note, userId: DEALER_ID, createdAt }],
      score: leadScore(l.priority, l.score),
      ...DEMO_FLAGS,
      createdAt: T.fromDate(createdAt),
      updatedAt: ts,
    });
  }
  console.log(`  ✅ ${LEADS.length} leads`);

  console.log('\n💰 Creando ventas...');
  const SALES = [
    { vi: 5, buyer: 'Sofía Vega', price: 27900, commission: 837, days: 20, leadKey: 'sofia' },
    { vi: 1, buyer: 'Héctor Ramos', price: 24900, commission: 747, days: 40, leadKey: null },
    { vi: 0, buyer: 'Inés Castro', price: 28900, commission: 867, days: 8, leadKey: null },
  ];
  for (const s of SALES) {
    const createdAt = daysAgo(s.days, 14);
    const vehicle = vehicles[s.vi % vehicles.length];
    await tenantRef.collection('sales').doc().set({
      tenantId: TENANT_ID,
      sellerId: DEALER_ID,
      vehicleId: vehicle.id,
      ...(s.leadKey && leadIds[s.leadKey] ? { leadId: leadIds[s.leadKey] } : {}),
      buyer: {
        fullName: s.buyer,
        phone: '7875552100',
        email: `${s.buyer.split(' ')[0].toLowerCase()}@email.com`,
        address: { city: 'Guaynabo', state: 'PR', country: 'PR' },
      },
      salePrice: s.price,
      vehiclePrice: s.price,
      total: s.price,
      currency: 'USD',
      vehicleCommissionRate: 3,
      vehicleCommission: s.commission,
      totalCommission: s.commission,
      paymentMethod: 'financing',
      status: 'completed',
      notes: `Venta demo — ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      completedAt: T.fromDate(createdAt),
      ...DEMO_FLAGS,
      createdAt: T.fromDate(createdAt),
    });
  }
  console.log(`  ✅ ${SALES.length} ventas`);

  console.log('\n📅 Creando citas...');
  const APPOINTMENTS = [
    { leadKey: 'pedro', type: 'test_drive', at: todayAt(10, 30), status: 'confirmed', vi: 2 },
    { leadKey: 'jose', type: 'consultation', at: todayAt(15, 0), status: 'scheduled', vi: 0 },
    { leadKey: 'miguel', type: 'test_drive', at: daysFromNow(1, 11), status: 'confirmed', vi: 4 },
    { leadKey: 'sofia', type: 'delivery', at: daysAgo(18, 11), status: 'completed', vi: 5 },
  ];
  for (const a of APPOINTMENTS) {
    await tenantRef.collection('appointments').doc().set({
      tenantId: TENANT_ID,
      leadId: leadIds[a.leadKey],
      assignedTo: DEALER_ID,
      vehicleIds: [vId(a.vi)],
      type: a.type,
      scheduledAt: T.fromDate(a.at),
      duration: 60,
      status: a.status,
      location: 'Caribe Motors PR — Carr. 165 Km 2.1, Guaynabo',
      notes: `Cita demo — ${a.type.replace('_', ' ')}`,
      reminders: [],
      ...DEMO_FLAGS,
      createdAt: ts,
      updatedAt: ts,
    });
  }
  console.log(`  ✅ ${APPOINTMENTS.length} citas`);

  console.log('\n💬 Creando mensajes...');
  const MSG_THREADS = [
    { leadKey: 'jose', msgs: [
      { dir: 'inbound', content: '¿El RAV4 2022 sigue disponible?', status: 'read', h: -3 },
      { dir: 'outbound', content: 'Sí, está en lote. ¿Quieres verlo hoy?', status: 'read', h: -2.5 },
    ]},
    { leadKey: 'laura', msgs: [
      { dir: 'inbound', content: '¿Financian el Accord desde $299?', status: 'sent', h: -1 },
    ]},
  ];
  let msgCount = 0;
  for (const thread of MSG_THREADS) {
    for (const m of thread.msgs) {
      await tenantRef.collection('messages').doc().set({
        tenantId: TENANT_ID,
        leadId: leadIds[thread.leadKey],
        channel: 'whatsapp',
        direction: m.dir,
        from: m.dir === 'inbound' ? LEADS.find((l) => l.key === thread.leadKey).phone : DEALER_PHONE,
        to: m.dir === 'outbound' ? LEADS.find((l) => l.key === thread.leadKey).phone : DEALER_PHONE,
        content: m.content,
        status: m.status,
        ...DEMO_FLAGS,
        createdAt: T.fromDate(hoursFromNow(m.h)),
      });
      msgCount++;
    }
  }
  console.log(`  ✅ ${msgCount} mensajes`);

  console.log('\n✅ Creando tareas...');
  const TASKS = [
    { title: 'Llamar a José sobre RAV4', type: 'call', status: 'pending', priority: 'high', due: daysFromNow(0, 11), leadKey: 'jose' },
    { title: 'Preparar propuesta BMW — Miguel', type: 'follow_up', status: 'pending', priority: 'urgent', due: daysFromNow(1, 9), leadKey: 'miguel' },
    { title: 'Confirmar entrega Sportage', type: 'document', status: 'completed', priority: 'medium', due: daysAgo(18), leadKey: 'sofia' },
  ];
  for (const t of TASKS) {
    await tenantRef.collection('tasks').doc().set({
      tenantId: TENANT_ID,
      assignedTo: DEALER_ID,
      createdBy: DEALER_ID,
      ...(t.leadKey && leadIds[t.leadKey] ? { leadId: leadIds[t.leadKey] } : {}),
      type: t.type,
      title: t.title,
      description: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: T.fromDate(t.due),
      ...DEMO_FLAGS,
      createdAt: ts,
      updatedAt: ts,
    });
  }
  console.log(`  ✅ ${TASKS.length} tareas`);

  console.log('\n⭐ Creando reseñas...');
  const REVIEWS = [
    { name: 'Sofía Vega', rating: 5, comment: 'Excelente trato en Caribe Motors. El Sportage quedó impecable.', vi: 5 },
    { name: 'Héctor Ramos', rating: 5, comment: 'Proceso de financiamiento rápido y transparente.', vi: 1 },
    { name: 'Inés Castro', rating: 4, comment: 'Buen inventario y el equipo atendió muy bien.', vi: 0 },
  ];
  for (const r of REVIEWS) {
    await tenantRef.collection('reviews').doc().set({
      tenantId: TENANT_ID,
      dealerId: DEALER_ID,
      customerName: r.name,
      customerEmail: `${r.name.split(' ')[0].toLowerCase()}@email.com`,
      rating: r.rating,
      title: 'Excelente servicio',
      comment: r.comment,
      vehicleId: vId(r.vi),
      status: 'approved',
      featured: true,
      ...DEMO_FLAGS,
      createdAt: T.fromDate(daysAgo(12)),
      updatedAt: ts,
    });
  }
  await db.collection('users').doc(DEALER_ID).set(
    { dealerRating: 4.7, dealerRatingCount: REVIEWS.length, updatedAt: ts },
    { merge: true }
  );
  console.log(`  ✅ ${REVIEWS.length} reseñas`);

  console.log('\n📢 Creando campañas y promociones...');
  await tenantRef.collection('campaigns').doc().set({
    tenantId: TENANT_ID,
    name: 'SUVs de la semana — Meta',
    description: 'RAV4 y Sportage con financiamiento local.',
    type: 'conversion',
    platforms: ['facebook', 'instagram'],
    status: 'active',
    metrics: { impressions: 6200, clicks: 210, leads: 6, conversions: 1, spend: 80, reach: 4800 },
    createdBy: DEALER_ID,
    ...DEMO_FLAGS,
    createdAt: T.fromDate(daysAgo(10)),
    updatedAt: ts,
  });
  await tenantRef.collection('promotions').doc().set({
    tenantId: TENANT_ID,
    name: '$1,000 de descuento en SUVs',
    description: 'Promoción interna de demostración — no sale en el marketplace público.',
    type: 'fixed',
    discount: { type: 'fixed', value: 1000 },
    promotionScope: 'dealer',
    status: 'active',
    views: 40,
    clicks: 9,
    channels: ['web'],
    createdBy: DEALER_ID,
    expiresAt: T.fromDate(daysFromNow(30)),
    ...DEMO_FLAGS,
    createdAt: T.fromDate(daysAgo(5)),
    updatedAt: ts,
  });
  console.log('  ✅ campañas y promociones');

  console.log('\n💰 Creando F&I, documentos y deals...');
  const FI_CLIENTS = [
    { name: 'Miguel Torres', phone: '7875552005', status: 'in_review', vehicle: 'BMW 330i 2022' },
    { name: 'Laura Díaz', phone: '7875552002', status: 'pre_approved', vehicle: 'Honda Accord 2021' },
    { name: 'José Pérez', phone: '7875552001', status: 'pending_docs', vehicle: 'Toyota RAV4 2022' },
  ];
  for (const c of FI_CLIENTS) {
    await tenantRef.collection('fi_clients').doc().set({
      tenantId: TENANT_ID,
      name: c.name,
      phone: c.phone,
      email: `${c.name.split(' ')[0].toLowerCase()}@email.com`,
      status: c.status,
      vehicleInterest: c.vehicle,
      createdBy: DEALER_ID,
      dealerId: DEALER_ID,
      ...DEMO_FLAGS,
      createdAt: T.fromDate(daysAgo(6)),
      updatedAt: ts,
    });
  }
  const DOCS = [
    { name: 'Contrato de compraventa — Sofía Vega', type: 'sale_contract', status: 'completed' },
    { name: 'Solicitud de crédito — Miguel Torres', type: 'credit_app', status: 'pending' },
    { name: 'Inspección pre-entrega — RAV4', type: 'inspection', status: 'draft' },
  ];
  for (const d of DOCS) {
    await tenantRef.collection('documents').doc().set({
      tenantId: TENANT_ID,
      name: d.name,
      title: d.name,
      type: d.type,
      status: d.status,
      createdBy: DEALER_ID,
      ...DEMO_FLAGS,
      createdAt: T.fromDate(daysAgo(4)),
      updatedAt: ts,
    });
  }
  await tenantRef.collection('deals').doc().set({
    tenantId: TENANT_ID,
    title: 'Deal BMW 330i — Miguel Torres',
    status: 'open',
    vehicleId: vId(4),
    customerName: 'Miguel Torres',
    salePrice: 42900,
    createdBy: DEALER_ID,
    ...DEMO_FLAGS,
    createdAt: T.fromDate(daysAgo(3)),
    updatedAt: ts,
  });
  console.log('  ✅ F&I, documentos y deal desk');

  console.log('\n⚙️ Workflows, interés y notificaciones...');
  await tenantRef.collection('workflows').doc().set({
    tenantId: TENANT_ID,
    name: 'Auto-respuesta lead nuevo',
    description: 'WhatsApp de bienvenida al llegar un lead',
    enabled: true,
    trigger: 'lead_created',
    triggerConfig: {},
    conditions: [],
    actions: [{ type: 'send_whatsapp', config: { template: 'welcome_dealer' }, delay: 60 }],
    executionCount: 8,
    ...DEMO_FLAGS,
    createdAt: T.fromDate(daysAgo(20)),
    updatedAt: ts,
  });
  for (let i = 0; i < 12; i++) {
    await tenantRef.collection('vehicle_interest_signals').doc().set({
      tenantId: TENANT_ID,
      vehicleId: vehicles[i % vehicles.length].id,
      dealerId: DEALER_ID,
      surface: i % 2 === 0 ? 'vehicle_detail' : 'dealer_page',
      anonymous: true,
      ...DEMO_FLAGS,
      createdAt: T.fromDate(daysAgo(Math.floor(i / 2))),
    });
  }
  const NOTIFS = [
    { title: 'Nuevo lead: Carmen Ortiz', type: 'lead_created', read: false },
    { title: 'Cita confirmada — Pedro Núñez 10:30 AM', type: 'appointment_confirmed', read: true },
    { title: 'F&I en revisión — Miguel Torres', type: 'fi_update', read: false },
  ];
  for (const n of NOTIFS) {
    await tenantRef.collection('notifications').doc().set({
      tenantId: TENANT_ID,
      userId: DEALER_ID,
      title: n.title,
      type: n.type,
      message: n.title,
      read: n.read,
      channels: ['in_app'],
      ...DEMO_FLAGS,
      createdAt: T.fromDate(hoursFromNow(-1)),
    });
  }
  console.log('  ✅ workflows, interés y notificaciones');

  await db.collection('tenants').doc(TENANT_ID).set(
    {
      isDemo: true,
      isDemoAccount: true,
      isPromoDemo: true,
      visibility: 'demo',
      subdomain: admin.firestore.FieldValue.delete(),
      pendingSubdomain: admin.firestore.FieldValue.delete(),
      updatedAt: ts,
    },
    { merge: true }
  );
  await db.collection('users').doc(DEALER_ID).set(
    {
      isDemo: true,
      isDemoAccount: true,
      isPromoDemo: true,
      visibility: 'demo',
      updatedAt: ts,
    },
    { merge: true }
  );

  console.log('\n========== RESUMEN DEMO DEALER ==========');
  console.log(`Leads:        ${LEADS.length}`);
  console.log(`Ventas:       ${SALES.length}`);
  console.log(`Citas:        ${APPOINTMENTS.length}`);
  console.log(`Reseñas:      ${REVIEWS.length}`);
  console.log(`F&I:          ${FI_CLIENTS.length}`);
  console.log(`Documentos:   ${DOCS.length}`);
  console.log(`Inventario:   ${vehicles.length} (se mantiene)`);
  console.log(`Panel:        https://dealer.autodealers-online.com/login`);
  console.log(`Email:        demo.dealer@autodealers-online.com`);
  console.log(`Promo URL:    https://www.autodealers-online.com/promo/dealer/caribe\n`);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
