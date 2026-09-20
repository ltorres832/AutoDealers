/**
 * Pobla la cuenta demo Pedro Martínez con leads, ventas, citas, mensajes,
 * tareas, reseñas, campañas, interés catálogo, chat público y workflows.
 *
 * Uso: node scripts/seed-demo-seller-full-data.cjs
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

const SELLER_ID = 'hUX9H3j2toXfvIz8tEtFNzSgiUW2';
const TENANT_ID = 'NPtFzTw3FyQkb6NPQkdj';
const SELLER_NAME = 'Pedro Martínez';
const SELLER_PHONE = '17875550142';

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

async function main() {
  console.log('\n🌱 Poblando datos demo para Pedro Martínez...\n');

  const tenantSnap = await db.collection('tenants').doc(TENANT_ID).get();
  if (!tenantSnap.exists) {
    throw new Error(`Tenant demo no encontrado: ${TENANT_ID}`);
  }

  console.log('Limpiando datos CRM previos del tenant demo...');
  await cleanupDemoCrmData();

  const vehSnap = await db
    .collection('tenants')
    .doc(TENANT_ID)
    .collection('vehicles')
    .where('sellerId', '==', SELLER_ID)
    .get();

  const vehicles = vehSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (vehicles.length === 0) {
    throw new Error('No hay vehículos del demo seller');
  }

  const vLabel = (i) => {
    const v = vehicles[i % vehicles.length];
    return `${v.year} ${v.make} ${v.model}`;
  };
  const vId = (i) => vehicles[i % vehicles.length].id;

  const tenantRef = db.collection('tenants').doc(TENANT_ID);
  const leadIds = {};

  const LEADS = [
    { key: 'maria', name: 'María González', phone: '7875551001', email: 'maria.gonzalez@email.com', city: 'San Juan', status: 'new', source: 'web', vi: 0, days: 0, hours: 2, note: 'Interesada en Toyota Camry 2021. Preguntó por financiamiento.', tags: ['pagina_publica'], score: 78, priority: 'high' },
    { key: 'carlos', name: 'Carlos Rivera', phone: '7875551002', email: 'carlos.rivera@email.com', city: 'Bayamón', status: 'new', source: 'whatsapp', vi: 1, days: 0, hours: 5, note: 'Pidió fotos extra del Honda CR-V.', tags: ['whatsapp'], score: 65, priority: 'medium' },
    { key: 'luis', name: 'Luis Méndez', phone: '7875551003', email: 'luis.mendez@email.com', city: 'Carolina', status: 'new', source: 'instagram', vi: 2, days: 1, hours: 0, note: 'Vio el F-150 en Instagram. Quiere saber si aceptan trade-in.', tags: ['redes_sociales'], score: 72, priority: 'high' },
    { key: 'kevin', name: 'Kevin Ortiz', phone: '7875551018', email: 'kevin.ortiz@email.com', city: 'Guaynabo', status: 'new', source: 'web', vi: 5, days: 0, hours: 1, note: 'Lead recién llegado — consultó Hyundai Tucson hace 1 hora.', tags: ['lead_reciente'], score: 85, priority: 'high' },
    { key: 'ana', name: 'Ana Torres', phone: '7875551004', email: 'ana.torres@email.com', city: 'Caguas', status: 'contacted', source: 'facebook', vi: 0, days: 2, hours: 0, note: 'Contactada por WhatsApp. Espera respuesta sobre garantía.', tags: [], score: 60, priority: 'medium' },
    { key: 'jose', name: 'José Ramírez', phone: '7875551005', email: 'jose.ramirez@email.com', city: 'Ponce', status: 'contacted', source: 'phone', vi: 3, days: 3, hours: 0, note: 'Llamó dos veces. Interesado en eléctricos.', tags: [], score: 55, priority: 'medium' },
    { key: 'carmen', name: 'Carmen Díaz', phone: '7875551006', email: 'carmen.diaz@email.com', city: 'Mayagüez', status: 'contacted', source: 'web', vi: 1, days: 4, hours: 0, note: 'Comparando CR-V vs Tucson.', tags: [], score: 58, priority: 'low' },
    { key: 'roberto', name: 'Roberto Vega', phone: '7875551007', email: 'roberto.vega@email.com', city: 'San Juan', status: 'qualified', source: 'whatsapp', vi: 4, days: 5, hours: 0, note: 'Pre-aprobado en banco. Busca SUV de lujo.', tags: ['financiamiento'], score: 88, priority: 'high' },
    { key: 'patricia', name: 'Patricia López', phone: '7875551008', email: 'patricia.lopez@email.com', city: 'Humacao', status: 'qualified', source: 'web', vi: 5, days: 6, hours: 0, note: 'Familia de 4. Presupuesto $28K.', tags: [], score: 75, priority: 'medium' },
    { key: 'miguel', name: 'Miguel Santos', phone: '7875551009', email: 'miguel.santos@email.com', city: 'Arecibo', status: 'pre_qualified', source: 'web', vi: 0, days: 7, hours: 0, note: 'Pre-calificación enviada. Score 680.', tags: ['pre_calificacion'], score: 70, priority: 'medium' },
    { key: 'sofia', name: 'Sofia Herrera', phone: '7875551010', email: 'sofia.herrera@email.com', city: 'San Juan', status: 'appointment', source: 'whatsapp', vi: 1, days: 3, hours: 0, note: 'Cita agendada para test drive del CR-V.', tags: ['cita'], score: 90, priority: 'high' },
    { key: 'diego', name: 'Diego Morales', phone: '7875551011', email: 'diego.morales@email.com', city: 'Bayamón', status: 'test_drive', source: 'web', vi: 2, days: 4, hours: 0, note: 'Ya probó el F-150. Muy interesado.', tags: ['test_drive'], score: 92, priority: 'high' },
    { key: 'elena', name: 'Elena Ruiz', phone: '7875551012', email: 'elena.ruiz@email.com', city: 'Guaynabo', status: 'negotiation', source: 'phone', vi: 4, days: 8, hours: 0, note: 'Negociando precio final BMW X5. Pide $52K.', tags: ['negociacion'], score: 95, priority: 'high' },
    { key: 'javier', name: 'Javier Núñez', phone: '7875551013', email: 'javier.nunez@email.com', city: 'Carolina', status: 'negotiation', source: 'whatsapp', vi: 3, days: 9, hours: 0, note: 'Comparando Tesla vs BMW. Decisión esta semana.', tags: [], score: 87, priority: 'high' },
    { key: 'lucia', name: 'Lucía Fernández', phone: '7875551014', email: 'lucia.fernandez@email.com', city: 'San Juan', status: 'closed', source: 'web', vi: 0, days: 45, hours: 0, note: 'Compró Camry 2021. Cliente satisfecha.', tags: ['venta_cerrada'], score: 100, priority: 'high' },
    { key: 'ricardo', name: 'Ricardo Gómez', phone: '7875551015', email: 'ricardo.gomez@email.com', city: 'Caguas', status: 'closed', source: 'whatsapp', vi: 1, days: 38, hours: 0, note: 'Compró CR-V 2020.', tags: ['venta_cerrada'], score: 100, priority: 'high' },
    { key: 'paula', name: 'Paula Medina', phone: '7875551016', email: 'paula.medina@email.com', city: 'Ponce', status: 'lost', source: 'facebook', vi: 2, days: 20, hours: 0, note: 'Compró en otro dealer.', tags: ['perdido'], score: 30, priority: 'low' },
    { key: 'fernando', name: 'Fernando Cruz', phone: '7875551017', email: 'fernando.cruz@email.com', city: 'Mayagüez', status: 'lost', source: 'web', vi: 3, days: 25, hours: 0, note: 'Presupuesto insuficiente.', tags: ['perdido'], score: 25, priority: 'low' },
  ];

  console.log('\n📝 Creando leads...');
  for (const l of LEADS) {
    const createdAt = l.days === 0 && l.hours ? hoursFromNow(-l.hours) : daysAgo(l.days, 9 + (l.hours || 0));
    const ref = tenantRef.collection('leads').doc();
    leadIds[l.key] = ref.id;
    const vehicleId = vId(l.vi);
    const vehicleLabel = vLabel(l.vi);
    await ref.set({
      tenantId: TENANT_ID,
      assignedTo: SELLER_ID,
      sellerOwned: true,
      source: l.source,
      status: l.status,
      contact: {
        name: l.name,
        phone: l.phone,
        email: l.email,
        preferredChannel: l.source === 'whatsapp' ? 'whatsapp' : l.source === 'phone' ? 'phone' : 'email',
        city: l.city,
      },
      vehicleId,
      vehicleInterest: vehicleLabel,
      vehicleStockNumber: vehicles[l.vi % vehicles.length].stockNumber || null,
      notes: l.note,
      tags: l.tags,
      interactions: [
        {
          id: 'int-1',
          type: 'note',
          content: l.note,
          userId: SELLER_ID,
          createdAt,
        },
      ],
      score: leadScore(l.priority, l.score),
      aiClassification: {
        priority: l.priority,
        sentiment: l.priority === 'high' ? 'positive' : 'neutral',
        intent: l.status === 'negotiation' ? 'compra_inmediata' : 'informacion',
      },
      lastContactDate: l.status !== 'new' ? daysAgo(Math.max(0, l.days - 1)) : null,
      nextFollowUpDate: ['new', 'contacted', 'qualified', 'negotiation'].includes(l.status)
        ? daysFromNow(1, 10)
        : null,
      isDemoSeedData: true,
      createdAt: T.fromDate(createdAt),
      updatedAt: T.fromDate(new Date()),
    });
  }
  console.log(`  ✅ ${LEADS.length} leads`);

  console.log('\n💰 Creando ventas...');
  const SALES = [
    { vi: 4, buyer: 'Isabel Romero', price: 54900, commission: 1647, days: 120, leadKey: null },
    { vi: 5, buyer: 'Tomás Delgado', price: 26900, commission: 807, days: 90, leadKey: null },
    { vi: 2, buyer: 'Gabriel Reyes', price: 31900, commission: 957, days: 60, leadKey: null },
    { vi: 3, buyer: 'Valentina Mora', price: 38900, commission: 1167, days: 28, leadKey: 'javier' },
    { vi: 0, buyer: 'Lucía Fernández', price: 22900, commission: 687, days: 5, leadKey: 'lucia' },
    { vi: 1, buyer: 'Ricardo Gómez', price: 25500, commission: 765, days: 1, leadKey: 'ricardo' },
    { vi: 5, buyer: 'Andrea Pérez', price: 26900, commission: 807, days: 0, leadKey: null },
  ];

  for (const s of SALES) {
    const createdAt = daysAgo(s.days, 14);
    const vehicle = vehicles[s.vi % vehicles.length];
    const saleDoc = {
      tenantId: TENANT_ID,
      sellerId: SELLER_ID,
      vehicleId: vehicle.id,
      buyer: {
        fullName: s.buyer,
        phone: '7875552000',
        email: `${s.buyer.split(' ')[0].toLowerCase()}@email.com`,
        address: { city: 'San Juan', state: 'PR', country: 'PR' },
      },
      salePrice: s.price,
      vehiclePrice: s.price,
      total: s.price,
      currency: 'USD',
      vehicleCommissionRate: 3,
      vehicleCommission: s.commission,
      insuranceCommission: 150,
      accessoriesCommission: 75,
      totalCommission: s.commission + 225,
      paymentMethod: 'financing',
      financingDetails: { termMonths: 72, apr: 6.9, downPayment: 3000 },
      status: 'completed',
      documents: [],
      notes: `Venta demo — ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      completedAt: T.fromDate(createdAt),
      isDemoSeedData: true,
      createdAt: T.fromDate(createdAt),
    };
    if (s.leadKey && leadIds[s.leadKey]) {
      saleDoc.leadId = leadIds[s.leadKey];
    }
    await tenantRef.collection('sales').doc().set(saleDoc);
  }
  console.log(`  ✅ ${SALES.length} ventas`);

  console.log('\n📅 Creando citas...');
  const APPOINTMENTS = [
    { leadKey: 'sofia', type: 'test_drive', at: todayAt(10, 30), status: 'confirmed', vi: 1 },
    { leadKey: 'maria', type: 'consultation', at: todayAt(14, 0), status: 'confirmed', vi: 0 },
    { leadKey: 'diego', type: 'test_drive', at: todayAt(17, 0), status: 'scheduled', vi: 2 },
    { leadKey: 'kevin', type: 'consultation', at: todayAt(18, 30), status: 'scheduled', vi: 5 },
    { leadKey: 'roberto', type: 'test_drive', at: daysFromNow(1, 11), status: 'confirmed', vi: 4 },
    { leadKey: 'patricia', type: 'consultation', at: daysFromNow(2, 15), status: 'scheduled', vi: 5 },
    { leadKey: 'elena', type: 'test_drive', at: daysFromNow(3, 10), status: 'confirmed', vi: 4 },
    { leadKey: 'carmen', type: 'consultation', at: daysFromNow(5, 16), status: 'scheduled', vi: 1 },
    { leadKey: 'lucia', type: 'delivery', at: daysAgo(40, 11), status: 'completed', vi: 0 },
    { leadKey: 'ricardo', type: 'delivery', at: daysAgo(35, 15), status: 'completed', vi: 1 },
  ];

  for (const a of APPOINTMENTS) {
    await tenantRef.collection('appointments').doc().set({
      tenantId: TENANT_ID,
      leadId: leadIds[a.leadKey],
      assignedTo: SELLER_ID,
      vehicleIds: [vId(a.vi)],
      type: a.type,
      scheduledAt: T.fromDate(a.at),
      duration: 60,
      status: a.status,
      location: 'Showroom — Ave. Ponce de León 1234, San Juan',
      notes: `Cita demo — ${a.type.replace('_', ' ')}`,
      reminders: [],
      ...(a.status === 'confirmed' || a.status === 'completed'
        ? {
            confirmedByUserId: SELLER_ID,
            confirmedByName: SELLER_NAME,
            confirmedAt: T.fromDate(daysAgo(1)),
          }
        : {}),
      isDemoSeedData: true,
      createdAt: ts,
      updatedAt: ts,
    });
  }
  console.log(`  ✅ ${APPOINTMENTS.length} citas (4 hoy, 4 próximas)`);

  console.log('\n💬 Creando mensajes WhatsApp...');
  const MSG_THREADS = [
    { leadKey: 'maria', msgs: [
      { dir: 'inbound', content: 'Hola, ¿el Camry 2021 sigue disponible?', status: 'read', h: -3 },
      { dir: 'outbound', content: '¡Hola María! Sí, está disponible. ¿Te gustaría agendar una cita?', status: 'read', h: -2.5 },
      { dir: 'inbound', content: 'Sí, ¿tienen financiamiento desde $299/mes?', status: 'delivered', h: -1 },
    ]},
    { leadKey: 'carlos', msgs: [
      { dir: 'inbound', content: 'Me puedes enviar más fotos del CR-V por favor', status: 'read', h: -8 },
      { dir: 'outbound', content: 'Claro Carlos, te envío el álbum completo ahora mismo 📸', status: 'read', h: -7 },
    ]},
    { leadKey: 'luis', msgs: [
      { dir: 'inbound', content: 'Vi tu anuncio del F-150 en Instagram 🔥', status: 'read', h: -20 },
      { dir: 'inbound', content: '¿Aceptan mi pickup 2015 como trade-in?', status: 'sent', h: -0.5 },
    ]},
    { leadKey: 'elena', msgs: [
      { dir: 'outbound', content: 'Elena, te confirmo que podemos llegar a $53,500 en el BMW.', status: 'read', h: -4 },
      { dir: 'inbound', content: 'Déjame consultarlo con mi esposo y te escribo mañana.', status: 'read', h: -3 },
    ]},
    { leadKey: 'kevin', msgs: [
      { dir: 'inbound', content: 'Buenas, vi el Tucson en su página. ¿Cuál es el millaje exacto?', status: 'sent', h: -0.3 },
    ]},
  ];

  let msgCount = 0;
  for (const thread of MSG_THREADS) {
    for (const m of thread.msgs) {
      const at = hoursFromNow(m.h);
      await tenantRef.collection('messages').doc().set({
        tenantId: TENANT_ID,
        leadId: leadIds[thread.leadKey],
        channel: 'whatsapp',
        direction: m.dir,
        from: m.dir === 'inbound' ? LEADS.find((l) => l.key === thread.leadKey).phone : SELLER_PHONE,
        to: m.dir === 'outbound' ? LEADS.find((l) => l.key === thread.leadKey).phone : SELLER_PHONE,
        content: m.content,
        status: m.status,
        aiGenerated: false,
        metadata: { isRead: m.status === 'read' },
        isDemoSeedData: true,
        createdAt: T.fromDate(at),
      });
      msgCount++;
    }
  }
  console.log(`  ✅ ${msgCount} mensajes (2+ sin leer)`);

  console.log('\n✅ Creando tareas...');
  const TASKS = [
    { title: 'Llamar a Luis sobre trade-in F-150', type: 'call', status: 'pending', priority: 'high', due: daysFromNow(0, 11), leadKey: 'luis' },
    { title: 'Enviar fotos extra CR-V a Carlos', type: 'whatsapp', status: 'in_progress', priority: 'medium', due: daysFromNow(0, 15), leadKey: 'carlos' },
    { title: 'Seguimiento negociación BMW — Elena', type: 'follow_up', status: 'pending', priority: 'urgent', due: daysFromNow(1, 9), leadKey: 'elena' },
    { title: 'Confirmar cita test drive Sofia', type: 'meeting', status: 'completed', priority: 'high', due: daysAgo(1), leadKey: 'sofia' },
    { title: 'Preparar contrato Lucía Fernández', type: 'document', status: 'completed', priority: 'medium', due: daysAgo(45), leadKey: 'lucia' },
    { title: 'Publicar CR-V en Facebook Marketplace', type: 'custom', status: 'pending', priority: 'low', due: daysFromNow(2, 10), leadKey: null },
  ];

  for (const t of TASKS) {
    await tenantRef.collection('tasks').doc().set({
      tenantId: TENANT_ID,
      assignedTo: SELLER_ID,
      createdBy: SELLER_ID,
      ...(t.leadKey && leadIds[t.leadKey] ? { leadId: leadIds[t.leadKey] } : {}),
      type: t.type,
      title: t.title,
      description: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: T.fromDate(t.due),
      reminderSent: t.status === 'completed',
      ...(t.status === 'completed' ? { completedAt: T.fromDate(t.due) } : {}),
      isDemoSeedData: true,
      createdAt: ts,
      updatedAt: ts,
    });
  }
  console.log(`  ✅ ${TASKS.length} tareas`);

  console.log('\n⭐ Creando reseñas...');
  const REVIEWS = [
    { name: 'Lucía Fernández', rating: 5, comment: 'Pedro fue increíble. Me ayudó a encontrar el Camry perfecto y el proceso fue rapidísimo.', vi: 0, featured: true },
    { name: 'Ricardo Gómez', rating: 5, comment: 'Muy profesional y transparente con los precios. Recomendado 100%.', vi: 1, featured: true },
    { name: 'Gabriel Reyes', rating: 4, comment: 'Excelente atención. El F-150 quedó impecable.', vi: 2, featured: false },
    { name: 'Isabel Romero', rating: 5, comment: 'La mejor experiencia comprando un BMW. Pedro conoce su inventario.', vi: 4, featured: true },
    { name: 'Tomás Delgado', rating: 4, comment: 'Buen trato y financiamiento accesible en el Tucson.', vi: 5, featured: false },
  ];

  for (const r of REVIEWS) {
    await tenantRef.collection('reviews').doc().set({
      tenantId: TENANT_ID,
      customerName: r.name,
      customerEmail: `${r.name.split(' ')[0].toLowerCase()}@email.com`,
      rating: r.rating,
      title: 'Excelente servicio',
      comment: r.comment,
      vehicleId: vId(r.vi),
      sellerId: SELLER_ID,
      status: 'approved',
      featured: r.featured,
      response: {
        text: '¡Gracias por tu confianza! Fue un placer ayudarte.',
        respondedBy: SELLER_ID,
        respondedAt: T.fromDate(daysAgo(10)),
      },
      isDemoSeedData: true,
      createdAt: T.fromDate(daysAgo(15 + r.vi)),
      updatedAt: ts,
    });
  }
  console.log(`  ✅ ${REVIEWS.length} reseñas aprobadas`);

  await db.collection('users').doc(SELLER_ID).update({
    sellerRating: 4.6,
    sellerRatingCount: REVIEWS.length,
    updatedAt: ts,
  });

  console.log('\n📢 Creando campañas...');
  const CAMPAIGNS = [
    {
      name: 'Promo SUVs — Facebook e Instagram',
      status: 'active',
      platforms: ['facebook', 'instagram'],
      text: '🔥 SUVs desde $25,500 — Financiamiento disponible. Escríbeme por WhatsApp.',
      metrics: { impressions: 8420, clicks: 312, leads: 8, conversions: 2, spend: 45, reach: 6100 },
    },
    {
      name: 'Tesla Model 3 — Awareness',
      status: 'active',
      platforms: ['instagram'],
      text: 'Eléctrico, económico y disponible hoy ⚡ Tesla Model 3 2023',
      metrics: { impressions: 3200, clicks: 89, leads: 3, conversions: 0, spend: 20, reach: 2800 },
    },
    {
      name: 'Pickup Season — Borrador',
      status: 'draft',
      platforms: ['facebook'],
      text: 'Ford F-150 2019 — La pickup que necesitas 🛻',
      metrics: { impressions: 0, clicks: 0, leads: 0, conversions: 0, spend: 0, reach: 0 },
    },
  ];

  for (const c of CAMPAIGNS) {
    await tenantRef.collection('campaigns').doc().set({
      tenantId: TENANT_ID,
      name: c.name,
      description: c.text,
      type: 'conversion',
      platforms: c.platforms,
      budgets: [{ platform: c.platforms[0], amount: 150, dailyLimit: 5 }],
      content: { text: c.text, callToAction: 'Contáctame', link: 'https://autodealers-online.com/seller/' + SELLER_ID },
      status: c.status,
      aiGenerated: false,
      metrics: c.metrics,
      createdBy: SELLER_ID,
      isDemoSeedData: true,
      createdAt: T.fromDate(daysAgo(14)),
      updatedAt: ts,
    });
  }
  console.log(`  ✅ ${CAMPAIGNS.length} campañas`);

  console.log('\n👁️ Creando señales de interés catálogo...');
  let signalCount = 0;
  const surfaces = ['vehicle_detail', 'seller_page', 'search_results', 'home_catalog'];
  for (let i = 0; i < 24; i++) {
    const vi = i % vehicles.length;
    await tenantRef.collection('vehicle_interest_signals').doc().set({
      tenantId: TENANT_ID,
      vehicleId: vehicles[vi].id,
      sellerId: SELLER_ID,
      surface: surfaces[i % surfaces.length],
      path: `/seller/${SELLER_ID}`,
      referrer: i % 3 === 0 ? 'https://google.com' : i % 3 === 1 ? 'https://facebook.com' : '',
      utmSource: i % 2 === 0 ? 'facebook' : 'organic',
      utmMedium: i % 2 === 0 ? 'social' : 'search',
      anonymous: true,
      hasExplicitContact: i % 5 === 0,
      isDemoSeedData: true,
      createdAt: T.fromDate(daysAgo(Math.floor(i / 2), 8 + (i % 10))),
    });
    signalCount++;
  }
  console.log(`  ✅ ${signalCount} señales de interés`);

  console.log('\n💬 Creando chat público...');
  const sessions = [
    { id: 'sess-demo-001', name: 'Visitor San Juan', email: 'visitante1@email.com', phone: '7875553001' },
    { id: 'sess-demo-002', name: 'Visitor Bayamón', email: 'visitante2@email.com', phone: '7875553002' },
  ];
  const pubMsgs = [
    { session: 0, fromClient: true, content: 'Hola, ¿tienen el Camry disponible?', h: -2 },
    { session: 0, fromClient: false, content: '¡Hola! Sí, el Toyota Camry 2021 está disponible. ¿Te gustaría más info?', h: -1.8 },
    { session: 0, fromClient: true, content: 'Sí, ¿cuál es el precio final con tablilla?', h: -1.5 },
    { session: 1, fromClient: true, content: 'Buenas tardes, vi su página. ¿Hacen entrega a Ponce?', h: -5 },
    { session: 1, fromClient: false, content: '¡Claro! Hacemos entrega en toda la isla. ¿Qué vehículo te interesa?', h: -4.5 },
    { session: 1, fromClient: true, content: 'El BMW X5 me llamó la atención', h: -0.5, unread: true },
  ];
  for (const m of pubMsgs) {
    const s = sessions[m.session];
    await tenantRef.collection('public_chat_messages').doc().set({
      tenantId: TENANT_ID,
      sessionId: s.id,
      clientName: s.name,
      clientEmail: s.email,
      clientPhone: s.phone,
      fromClient: m.fromClient,
      ...(m.fromClient
        ? {}
        : { fromUserId: SELLER_ID, fromUserName: SELLER_NAME }),
      content: m.content,
      read: !m.unread,
      isDemoSeedData: true,
      createdAt: T.fromDate(hoursFromNow(m.h)),
    });
  }
  console.log(`  ✅ ${pubMsgs.length} mensajes chat público`);

  console.log('\n⚙️ Creando workflows...');
  const WORKFLOWS = [
    {
      name: 'Auto-respuesta lead nuevo',
      description: 'Envía WhatsApp de bienvenida cuando llega un lead nuevo',
      trigger: 'lead_created',
      enabled: true,
      actions: [{ type: 'send_whatsapp', config: { template: 'welcome_seller' }, delay: 60 }],
    },
    {
      name: 'Recordatorio cita 24h',
      description: 'Notifica al vendedor 24h antes de una cita confirmada',
      trigger: 'appointment_confirmed',
      enabled: true,
      actions: [{ type: 'create_task', config: { title: 'Confirmar cita mañana' }, delay: 0 }],
    },
  ];
  for (const w of WORKFLOWS) {
    await tenantRef.collection('workflows').doc().set({
      tenantId: TENANT_ID,
      name: w.name,
      description: w.description,
      enabled: w.enabled,
      trigger: w.trigger,
      triggerConfig: {},
      conditions: [],
      actions: w.actions,
      executionCount: w.enabled ? 12 : 0,
      lastExecutedAt: T.fromDate(daysAgo(2)),
      isDemoSeedData: true,
      createdAt: T.fromDate(daysAgo(30)),
      updatedAt: ts,
    });
  }
  console.log(`  ✅ ${WORKFLOWS.length} workflows`);

  console.log('\n💰 Creando clientes F&I...');
  const FI_CLIENTS = [
    { name: 'Elena Ruiz', phone: '7875551012', status: 'in_review', vehicle: 'BMW X5 2022' },
    { name: 'Miguel Santos', phone: '7875551009', status: 'pre_approved', vehicle: 'Toyota Camry 2021' },
    { name: 'Javier Núñez', phone: '7875551013', status: 'pending_docs', vehicle: 'Tesla Model 3 2023' },
  ];
  for (const c of FI_CLIENTS) {
    await tenantRef.collection('fi_clients').doc().set({
      tenantId: TENANT_ID,
      name: c.name,
      phone: c.phone,
      email: `${c.name.split(' ')[0].toLowerCase()}@email.com`,
      status: c.status,
      vehicleInterest: c.vehicle,
      createdBy: SELLER_ID,
      sellerId: SELLER_ID,
      isDemoSeedData: true,
      createdAt: T.fromDate(daysAgo(7)),
      updatedAt: ts,
    });
  }
  console.log(`  ✅ ${FI_CLIENTS.length} clientes F&I`);

  console.log('\n🔔 Creando notificaciones...');
  const NOTIFS = [
    { title: 'Nuevo lead: Kevin Ortiz', type: 'lead_created', read: false },
    { title: 'Mensaje sin leer — Luis Méndez', type: 'message_received', read: false },
    { title: 'Cita confirmada — Sofia Herrera 10:30 AM', type: 'appointment_confirmed', read: true },
    { title: 'Interés en catálogo: BMW X5', type: 'catalog_interest', read: false },
    { title: 'Venta completada — Andrea Pérez', type: 'sale_completed', read: true },
  ];
  for (const n of NOTIFS) {
    await tenantRef.collection('notifications').doc().set({
      tenantId: TENANT_ID,
      userId: SELLER_ID,
      title: n.title,
      type: n.type,
      message: n.title,
      read: n.read,
      channels: ['in_app'],
      isDemoSeedData: true,
      createdAt: T.fromDate(hoursFromNow(-1)),
    });
  }
  console.log(`  ✅ ${NOTIFS.length} notificaciones`);

  // Segunda promoción activa
  await tenantRef.collection('promotions').doc().set({
    tenantId: TENANT_ID,
    name: '10% descuento en SUVs',
    description: 'Descuento especial en Honda CR-V y Hyundai Tucson por tiempo limitado.',
    type: 'percentage',
    discount: { type: 'percentage', value: 10 },
    promotionScope: 'seller',
    status: 'active',
    views: 128,
    clicks: 34,
    channels: ['web', 'whatsapp', 'facebook'],
    createdBy: SELLER_ID,
    expiresAt: T.fromDate(daysFromNow(45)),
    isDemoSeedData: true,
    createdAt: T.fromDate(daysAgo(10)),
    updatedAt: ts,
  });

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
  await db.collection('users').doc(SELLER_ID).set(
    {
      isDemo: true,
      isDemoAccount: true,
      isPromoDemo: true,
      visibility: 'demo',
      updatedAt: ts,
    },
    { merge: true }
  );

  console.log('\n========== RESUMEN DEMO ==========');
  console.log(`Leads:              ${LEADS.length} (${LEADS.filter((l) => !['closed', 'lost'].includes(l.status)).length} activos)`);
  console.log(`Ventas:             ${SALES.length} completadas`);
  console.log(`Citas hoy:          4`);
  console.log(`Citas próximas:     4`);
  console.log(`Mensajes WhatsApp:  ${msgCount}`);
  console.log(`Tareas:             ${TASKS.length}`);
  console.log(`Reseñas:            ${REVIEWS.length}`);
  console.log(`Campañas:           ${CAMPAIGNS.length}`);
  console.log(`Interés catálogo:   ${signalCount}`);
  console.log(`Chat público:       ${pubMsgs.length} msgs`);
  console.log(`Workflows:          ${WORKFLOWS.length}`);
  console.log(`Clientes F&I:       ${FI_CLIENTS.length}`);
  console.log(`\nLogin: demo.vendedor@autodealers-online.com / DemoPedro2026!`);
  console.log(`Panel: https://seller.autodealers-online.com/login\n`);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
