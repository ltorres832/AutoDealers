/**
 * Crea/actualiza la cuenta demo de concesionario (Caribe Motors PR).
 * Uso: node scripts/seed-demo-dealer.cjs
 *
 * - No aparece en catálogo público (isDemoAccount / isPromoDemo)
 * - Inventario visible en /promo/dealer/caribe y /dealer/{id}
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
const auth = admin.auth();
const ts = admin.firestore.FieldValue.serverTimestamp();

const PUBLIC_WEB_URL = 'https://www.autodealers-online.com';
const DEALER_URL = 'https://dealers.autodealers-online.com';
const DEMO_MEMBERSHIP_ID = 'QAPb1CMWNqluThCG0qQ5'; // Dealer Professional

const DEMO = {
  email: 'demo.dealer@autodealers-online.com',
  password: 'DemoDealer2026!',
  name: 'Ricardo Colón',
  businessName: 'Caribe Motors PR',
  phone: '7875550288',
  whatsapp: '17875550288',
  title: 'Concesionario verificado',
  city: 'Guaynabo',
  state: 'PR',
  address: 'Carr. 165 Km 2.1',
  zipCode: '00966',
  bio: 'Concesionario familiar en Puerto Rico con más de 15 años en el mercado. Inventario certificado, financiamiento local y equipo de vendedores listo para atenderte.',
  photo:
    'https://images.unsplash.com/photo-1560179707-f14eea528763?auto=format&fit=crop&w=400&q=80',
  businessHours: 'Lunes a Sábado: 9:00 AM - 6:00 PM · Domingo: cerrado',
};

const DEMO_VEHICLES = [
  {
    make: 'Toyota',
    model: 'RAV4',
    year: 2022,
    price: 28900,
    mileage: 24100,
    condition: 'used',
    bodyType: 'suv',
    description: 'Toyota RAV4 2022 AWD. Ideal para la isla, bajo millaje y mantenimiento al día.',
    photos: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'],
    views: 210,
  },
  {
    make: 'Honda',
    model: 'Accord',
    year: 2021,
    price: 24900,
    mileage: 35600,
    condition: 'used',
    bodyType: 'sedan',
    description: 'Honda Accord 2021. Cómodo, económico y listo para entregar.',
    photos: ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800'],
    views: 156,
  },
  {
    make: 'Ford',
    model: 'Explorer',
    year: 2020,
    price: 31900,
    mileage: 41200,
    condition: 'used',
    bodyType: 'suv',
    description: 'Ford Explorer 2020. Espacio familiar y potencia para carretera.',
    photos: ['https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800'],
    views: 98,
  },
  {
    make: 'Chevrolet',
    model: 'Silverado',
    year: 2019,
    price: 33500,
    mileage: 58000,
    condition: 'used',
    bodyType: 'pickup',
    description: 'Chevrolet Silverado 2019. Pickup confiable para trabajo y fin de semana.',
    photos: ['https://images.unsplash.com/photo-1605893477799-b99e3b8b93fe?w=800'],
    views: 187,
  },
  {
    make: 'BMW',
    model: '330i',
    year: 2022,
    price: 42900,
    mileage: 19800,
    condition: 'used',
    bodyType: 'sedan',
    description: 'BMW 330i 2022. Lujo deportivo con paquete premium.',
    photos: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'],
    views: 134,
  },
  {
    make: 'Kia',
    model: 'Sportage',
    year: 2023,
    price: 27900,
    mileage: 15200,
    condition: 'used',
    bodyType: 'suv',
    description: 'Kia Sportage 2023. Garantía vigente y excelente consumo.',
    photos: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800'],
    views: 76,
  },
];

const TEAM_SELLERS = [
  {
    email: 'demo.dealer.vendedor1@autodealers-online.com',
    password: 'DemoDealer2026!',
    name: 'Ana Rivera',
    title: 'Vendedora senior',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=320&q=80',
  },
  {
    email: 'demo.dealer.vendedor2@autodealers-online.com',
    password: 'DemoDealer2026!',
    name: 'Miguel Santos',
    title: 'Especialista en SUVs',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=320&q=80',
  },
];

function hashAppPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 210000, 32, 'sha256').toString('hex');
  return { algorithm: 'pbkdf2-sha256', iterations: 210000, salt, hash };
}

function appEmailKey(appKey, email) {
  const normalized = email.trim().toLowerCase();
  return `${appKey}_${crypto.createHash('sha256').update(normalized).digest('hex')}`;
}

async function getAdminUid() {
  const admins = await db.collection('admin_users').limit(1).get();
  if (!admins.empty) return admins.docs[0].id;
  return 'system-seed';
}

async function ensureAuthUser({ email, password, displayName }) {
  try {
    const userRecord = await auth.createUser({ email, password, displayName });
    return userRecord;
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      const userRecord = await auth.getUserByEmail(email);
      await auth.updateUser(userRecord.uid, { password, displayName });
      return userRecord;
    }
    throw err;
  }
}

async function upsertAppPassword(appKey, email, userId, password) {
  const hashed = hashAppPassword(password);
  const now = new Date();
  await db
    .collection('app_password_credentials')
    .doc(appEmailKey(appKey, email))
    .set(
      {
        appKey,
        email,
        userId,
        authUserId: userId,
        ...hashed,
        source: 'admin',
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
}

async function ensureSubscription({ tenantId, userId, membershipId, adminUid }) {
  const existing = await db
    .collection('subscriptions')
    .where('tenantId', '==', tenantId)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  if (!existing.empty) return existing.docs[0].id;

  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  const subRef = db.collection('subscriptions').doc();
  await subRef.set({
    id: subRef.id,
    tenantId,
    userId,
    membershipId,
    status: 'active',
    billingSource: 'admin_grant',
    adminGrantedBy: adminUid,
    adminGrantedAt: ts,
    stripeSubscriptionId: '',
    stripeCustomerId: '',
    currentPeriodStart: admin.firestore.Timestamp.fromDate(new Date()),
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
    cancelAtPeriodEnd: false,
    createdAt: ts,
    updatedAt: ts,
  });
  return subRef.id;
}

async function replaceDemoVehicles(tenantId) {
  const snap = await db.collection('tenants').doc(tenantId).collection('vehicles').get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  for (let i = 0; i < DEMO_VEHICLES.length; i++) {
    const v = DEMO_VEHICLES[i];
    const stockNumber = `CM-${String(i + 1).padStart(3, '0')}`;
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc()
      .set({
        tenantId,
        make: v.make,
        model: v.model,
        year: v.year,
        price: v.price,
        currency: 'USD',
        condition: v.condition,
        bodyType: v.bodyType,
        mileage: v.mileage,
        description: v.description,
        photos: v.photos,
        videos: [],
        specifications: {
          transmission: 'automatic',
          fuelType: 'gasoline',
          bodyType: v.bodyType,
          exteriorColor: 'Varios',
          color: 'Varios',
          doors: 4,
          seats: 5,
          hasAccidents: false,
          stockNumber,
        },
        stockNumber,
        status: 'available',
        publishedOnPublicPage: true,
        isDemo: true,
        visibility: 'demo',
        sellerCommissionType: 'percentage',
        insuranceCommissionType: 'percentage',
        accessoriesCommissionType: 'percentage',
        views: v.views,
        lastViewedAt: ts,
        createdAt: ts,
        updatedAt: ts,
      });
  }
}

async function ensureTeamSeller({ tenantId, adminUid, seller }) {
  const email = seller.email.trim().toLowerCase();
  const userRecord = await ensureAuthUser({
    email,
    password: seller.password,
    displayName: seller.name,
  });
  const userId = userRecord.uid;
  await auth.setCustomUserClaims(userId, { role: 'seller', tenantId });

  await db
    .collection('users')
    .doc(userId)
    .set(
      {
        email,
        authUserId: userId,
        name: seller.name,
        role: 'seller',
        tenantId,
        membershipId: DEMO_MEMBERSHIP_ID,
        membershipType: 'seller',
        status: 'active',
        phone: DEMO.phone,
        whatsapp: DEMO.whatsapp,
        title: seller.title,
        photo: seller.photo,
        profilePhoto: seller.photo,
        city: DEMO.city,
        state: DEMO.state,
        isDemo: true,
        isDemoAccount: true,
        isPromoDemo: true,
        visibility: 'demo',
        createdByAdmin: true,
        adminCreatorUserId: adminUid,
        adminMembershipAccess: 'granted',
        platformTermsAcceptedAt: ts,
        createdAt: ts,
        updatedAt: ts,
      },
      { merge: true }
    );

  await upsertAppPassword('seller', email, userId, seller.password);
  return userId;
}

async function createOrUpdateDemoDealer() {
  const adminUid = await getAdminUid();
  const email = DEMO.email.trim().toLowerCase();

  const existing = await db.collection('users').where('email', '==', email).limit(1).get();
  let userId;
  let tenantId;

  if (!existing.empty) {
    userId = existing.docs[0].id;
    tenantId = existing.docs[0].data().tenantId;
    console.log(`⚠️  Demo dealer ya existe: ${userId}`);
  } else {
    const userRecord = await ensureAuthUser({
      email,
      password: DEMO.password,
      displayName: DEMO.name,
    });
    userId = userRecord.uid;

    const tenantRef = db.collection('tenants').doc();
    tenantId = tenantRef.id;

    await tenantRef.set({
      name: DEMO.businessName,
      type: 'dealer',
      status: 'active',
      subdomain: null,
      pendingSubdomain: null,
      description: DEMO.bio,
      phone: DEMO.phone,
      email,
      address: DEMO.address,
      city: DEMO.city,
      state: DEMO.state,
      country: 'PR',
      ownerId: userId,
      membershipId: DEMO_MEMBERSHIP_ID,
      publishedVehiclesCount: DEMO_VEHICLES.length,
      branding: { primaryColor: '#E10600', secondaryColor: '#0A0A0A', logo: DEMO.photo },
      websiteSettings: {
        sections: {
          about: { content: DEMO.bio, enabled: true },
          inventory: { enabled: true },
          contact: { enabled: true },
          services: { enabled: true },
        },
      },
      businessHours: DEMO.businessHours,
      isDemo: true,
      isDemoAccount: true,
      isPromoDemo: true,
      visibility: 'demo',
      createdAt: ts,
      updatedAt: ts,
    });

    await auth.setCustomUserClaims(userId, { role: 'dealer', tenantId });

    await db
      .collection('users')
      .doc(userId)
      .set({
        email,
        authUserId: userId,
        name: DEMO.name,
        companyName: DEMO.businessName,
        role: 'dealer',
        tenantId,
        membershipId: DEMO_MEMBERSHIP_ID,
        membershipType: 'dealer',
        status: 'active',
        phone: DEMO.phone,
        whatsapp: DEMO.whatsapp,
        title: DEMO.title,
        bio: DEMO.bio,
        description: DEMO.bio,
        photo: DEMO.photo,
        profilePhoto: DEMO.photo,
        city: DEMO.city,
        state: DEMO.state,
        address: DEMO.address,
        zipCode: DEMO.zipCode,
        businessHours: DEMO.businessHours,
        createdByAdmin: true,
        adminCreatorUserId: adminUid,
        adminMembershipAccess: 'granted',
        adminMembershipGrantedBy: adminUid,
        adminMembershipGrantedAt: ts,
        isDemo: true,
        isDemoAccount: true,
        isPromoDemo: true,
        visibility: 'demo',
        platformTermsAcceptedAt: ts,
        settings: {
          notifications: { push: true, email: true, sms: true, whatsapp: true, sound: true },
        },
        socialMedia: {
          facebook: 'https://facebook.com/autodealersonline',
          instagram: 'https://instagram.com/autodealersonline',
        },
        createdAt: ts,
        updatedAt: ts,
      });

    console.log(`✅ Demo dealer creado: ${userId}`);
  }

  // Refresh flags / profile on existing
  await db
    .collection('users')
    .doc(userId)
    .set(
      {
        isDemo: true,
        isDemoAccount: true,
        isPromoDemo: true,
        visibility: 'demo',
        status: 'active',
        role: 'dealer',
        companyName: DEMO.businessName,
        name: DEMO.name,
        membershipId: DEMO_MEMBERSHIP_ID,
        adminMembershipAccess: 'granted',
        updatedAt: ts,
      },
      { merge: true }
    );

  await db
    .collection('tenants')
    .doc(tenantId)
    .set(
      {
        name: DEMO.businessName,
        type: 'dealer',
        status: 'active',
        description: DEMO.bio,
        phone: DEMO.phone,
        email,
        address: DEMO.address,
        city: DEMO.city,
        state: DEMO.state,
        country: 'PR',
        ownerId: userId,
        branding: { primaryColor: '#E10600', secondaryColor: '#0A0A0A', logo: DEMO.photo },
        businessHours: DEMO.businessHours,
        isDemo: true,
        isDemoAccount: true,
        isPromoDemo: true,
        visibility: 'demo',
        membershipId: DEMO_MEMBERSHIP_ID,
        publishedVehiclesCount: DEMO_VEHICLES.length,
        subdomain: admin.firestore.FieldValue.delete(),
        pendingSubdomain: admin.firestore.FieldValue.delete(),
        updatedAt: ts,
      },
      { merge: true }
    );

  await auth.setCustomUserClaims(userId, { role: 'dealer', tenantId });
  await upsertAppPassword('dealer', email, userId, DEMO.password);
  await ensureSubscription({
    tenantId,
    userId,
    membershipId: DEMO_MEMBERSHIP_ID,
    adminUid,
  });
  await replaceDemoVehicles(tenantId);

  const sellerIds = [];
  for (const s of TEAM_SELLERS) {
    sellerIds.push(await ensureTeamSeller({ tenantId, adminUid, seller: s }));
  }

  // Sample leads
  const leadsSnap = await db.collection('tenants').doc(tenantId).collection('leads').limit(1).get();
  if (leadsSnap.empty) {
    const leads = [
      { name: 'José Pérez', phone: '7875552001', message: 'Interesado en RAV4 2022', status: 'new' },
      { name: 'Laura Díaz', phone: '7875552002', message: 'Financiamiento Accord', status: 'contacted' },
      { name: 'Pedro Núñez', phone: '7875552003', message: 'Cita test drive Explorer', status: 'appointment' },
    ];
    for (const lead of leads) {
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .doc()
        .set({ ...lead, tenantId, source: 'demo_seed', createdAt: ts, updatedAt: ts });
    }
  }

  return {
    userId,
    tenantId,
    email,
    password: DEMO.password,
    sellerIds,
    publicPage: `${PUBLIC_WEB_URL}/dealer/${userId}`,
    promoPage: `${PUBLIC_WEB_URL}/promo/dealer/caribe`,
    loginUrl: `${DEALER_URL}/login`,
  };
}

function patchDemoPromoDealerFile(userId, tenantId) {
  const filePath = path.join(
    __dirname,
    '..',
    'apps',
    'public-web',
    'src',
    'lib',
    'demo-promo-dealer.ts'
  );
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.replace(/dealerId: '[^']*'/, `dealerId: '${userId}'`);
  src = src.replace(/tenantId: '[^']*'/, `tenantId: '${tenantId}'`);
  fs.writeFileSync(filePath, src);
  console.log(`✅ Actualizado ${filePath}`);
}

(async () => {
  const demo = await createOrUpdateDemoDealer();
  patchDemoPromoDealerFile(demo.userId, demo.tenantId);
  console.log('\n========== DEMO DEALER ==========\n');
  console.log(JSON.stringify(demo, null, 2));
  console.log('\nCredenciales panel dealer:');
  console.log(`  Email: ${demo.email}`);
  console.log(`  Password: ${demo.password}`);
  console.log(`  Login: ${demo.loginUrl}`);
  console.log(`  Promo: ${demo.promoPage}`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
