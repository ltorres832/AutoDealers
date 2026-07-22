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
const SELLER_URL = 'https://seller.autodealers-online.com';
const DEMO_MEMBERSHIP_ID = 'YYIqZUjqMyGxyjMpnok8'; // Vendedor Professional

const DEMO = {
  email: 'demo.vendedor@autodealers-online.com',
  password: 'DemoPedro2026!',
  name: 'Pedro Martínez',
  subdomain: 'demo-pedro',
  phone: '7875550142',
  whatsapp: '17875550142',
  title: 'Vendedor certificado',
  city: 'San Juan',
  state: 'PR',
  address: 'Ave. Ponce de León 1234',
  zipCode: '00907',
  bio: 'Más de 8 años ayudando a familias en Puerto Rico a encontrar el vehículo perfecto. Especialista en SUVs y sedanes con financiamiento flexible y entrega rápida.',
  photo:
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
  businessHours: 'Lunes a Sábado: 9:00 AM - 6:00 PM',
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getEmailCreds() {
  const doc = await db.collection('system_settings').doc('credentials').get();
  const data = doc.data() || {};
  return {
    apiKey: data.emailApiKey || process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY,
    from: data.emailFromAddress || process.env.FROM_EMAIL || 'noreply@autodealers.com',
  };
}

async function sendResendEmail({ to, subject, html, from, apiKey }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data;
}

function buildAffiliateWelcomeHtml({ name, referralCode, referralLink, selfRegistered }) {
  const loginUrl = `${PUBLIC_WEB_URL}/affiliate/login`;
  const passwordNote = selfRegistered
    ? 'Usa el <strong>email</strong> y la <strong>contraseña</strong> que registraste.'
    : 'Usa el <strong>email</strong> y la contraseña que te proporcionó el administrador.';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <h2 style="color: #4f46e5;">Bienvenido al programa de afiliados</h2>
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Tu cuenta de afiliado en AutoDealers está lista. Comparte tu enlace y gana comisión cuando alguien se registre como dealer o vendedor.</p>
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px; font-weight: bold;">Tu código de referido</p>
        <p style="margin: 0; font-size: 22px; letter-spacing: 2px; font-weight: bold;">${escapeHtml(referralCode)}</p>
        <p style="margin: 12px 0 0; font-size: 14px;">
          Enlace para compartir:<br/>
          <a href="${escapeHtml(referralLink)}">${escapeHtml(referralLink)}</a>
        </p>
      </div>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(loginUrl)}" style="background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Entrar al portal de afiliados
        </a>
      </p>
      <p style="font-size: 14px; color: #444;">${passwordNote}</p>
      <p style="font-size: 12px; color: #888; margin-top: 24px;">No respondas a este correo automático.</p>
    </div>
  `;
}

function buildSellerWelcomeHtml({ name, email, password, loginUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <h2 style="color: #E10600;">Tu cuenta demo de vendedor está lista</h2>
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Se creó tu cuenta de demostración en AutoDealersOnline con inventario, perfil público y membresía activa para promoción.</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 6px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin: 0 0 6px;"><strong>Contraseña:</strong> ${escapeHtml(password)}</p>
        <p style="margin: 0;"><strong>Panel:</strong> <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>
      </div>
      <p style="font-size: 12px; color: #888;">Cuenta de demostración — no compartir en producción con clientes reales.</p>
    </div>
  `;
}

async function resendAffiliateEmails() {
  const { apiKey, from } = await getEmailCreds();
  if (!apiKey) throw new Error('Email API Key no configurada');

  const snap = await db.collection('affiliate_partners').where('status', '==', 'active').get();
  const results = [];

  for (const doc of snap.docs) {
    const a = doc.data();
    const referralLink = `${PUBLIC_WEB_URL}/register?ref=${encodeURIComponent(a.referralCode)}`;
    try {
      await sendResendEmail({
        to: a.email,
        from,
        apiKey,
        subject: 'Bienvenido al programa de afiliados — AutoDealers',
        html: buildAffiliateWelcomeHtml({
          name: a.name,
          referralCode: a.referralCode,
          referralLink,
          selfRegistered: a.selfRegistered === true,
        }),
      });
      results.push({ email: a.email, name: a.name, status: 'sent' });
      console.log(`✅ Email afiliado enviado: ${a.email}`);
    } catch (err) {
      results.push({ email: a.email, name: a.name, status: 'error', error: err.message });
      console.error(`❌ Error email afiliado ${a.email}:`, err.message);
    }
  }
  return results;
}

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

const DEMO_VEHICLES = [
  {
    make: 'Toyota',
    model: 'Camry',
    year: 2021,
    price: 22900,
    mileage: 38240,
    condition: 'used',
    bodyType: 'sedan',
    description:
      'Toyota Camry 2021 en excelente estado. Un solo dueño, mantenimiento al día, ideal para familia o uso diario. Financiamiento disponible.',
    photos: ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800'],
    views: 184,
  },
  {
    make: 'Honda',
    model: 'CR-V',
    year: 2020,
    price: 25500,
    mileage: 44810,
    condition: 'used',
    bodyType: 'suv',
    description:
      'Honda CR-V 2020 con bajo millaje. SUV espaciosa, económica y confiable. Perfecta para la isla.',
    photos: ['https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800'],
    views: 91,
  },
  {
    make: 'Ford',
    model: 'F-150',
    year: 2019,
    price: 31900,
    mileage: 52300,
    condition: 'used',
    bodyType: 'pickup',
    description:
      'Ford F-150 2019 4x4. La pickup más vendida, lista para trabajo o aventura. Motor potente y cabina cómoda.',
    photos: ['https://images.unsplash.com/photo-1605893477799-b99e3b8b93fe?w=800'],
    views: 276,
  },
  {
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    price: 38900,
    mileage: 12000,
    condition: 'used',
    bodyType: 'sedan',
    description:
      'Tesla Model 3 2023 con autopilot. Cero emisiones, alto rendimiento y bajo costo de mantenimiento.',
    photos: ['https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800'],
    views: 142,
  },
  {
    make: 'BMW',
    model: 'X5',
    year: 2022,
    price: 54900,
    mileage: 28500,
    condition: 'used',
    bodyType: 'suv',
    description:
      'BMW X5 2022 de lujo. Interior de cuero, sistema de sonido premium y tecnología de punta.',
    photos: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'],
    views: 203,
  },
  {
    make: 'Hyundai',
    model: 'Tucson',
    year: 2022,
    price: 26900,
    mileage: 33100,
    condition: 'used',
    bodyType: 'suv',
    description:
      'Hyundai Tucson 2022 con garantía de fábrica vigente. Excelente opción calidad-precio.',
    photos: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'],
    views: 67,
  },
];

async function createDemoSeller() {
  const adminUid = await getAdminUid();
  const normalizedEmail = DEMO.email.trim().toLowerCase();

  // Check if exists
  const existing = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
  if (!existing.empty) {
    const uid = existing.docs[0].id;
    const data = existing.docs[0].data();
    console.log(`⚠️  Demo seller ya existe: ${uid}`);
    return { existing: true, userId: uid, tenantId: data.tenantId, email: normalizedEmail, password: DEMO.password };
  }

  // Create auth user
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email: normalizedEmail,
      password: DEMO.password,
      displayName: DEMO.name,
    });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      userRecord = await auth.getUserByEmail(normalizedEmail);
      await auth.updateUser(userRecord.uid, { password: DEMO.password, displayName: DEMO.name });
    } else throw err;
  }

  const userId = userRecord.uid;

  // Tenant
  const tenantRef = db.collection('tenants').doc();
  const tenantId = tenantRef.id;

  await tenantRef.set({
    name: `Autos de ${DEMO.name.split(' ')[0]}`,
    type: 'seller',
    status: 'active',
    subdomain: null,
    pendingSubdomain: null,
    description: DEMO.bio,
    phone: DEMO.phone,
    email: normalizedEmail,
    address: DEMO.address,
    city: DEMO.city,
    state: DEMO.state,
    country: 'PR',
    ownerId: userId,
    membershipId: DEMO_MEMBERSHIP_ID,
    publishedVehiclesCount: DEMO_VEHICLES.length,
    branding: { primaryColor: '#E10600', secondaryColor: '#0A0A0A' },
    sellerInfo: { id: userId, name: DEMO.name },
    websiteSettings: {
      sections: {
        about: { content: DEMO.bio, enabled: true },
        inventory: { enabled: true },
        contact: { enabled: true },
      },
    },
    businessHours: DEMO.businessHours,
    isDemoAccount: true,
    createdAt: ts,
    updatedAt: ts,
  });

  await auth.setCustomUserClaims(userId, { role: 'seller', tenantId });

  const referralCode = `DEMO-${userId.slice(0, 6).toUpperCase()}`;

  await db.collection('users').doc(userId).set({
    email: normalizedEmail,
    authUserId: userId,
    name: DEMO.name,
    role: 'seller',
    tenantId,
    membershipId: DEMO_MEMBERSHIP_ID,
    membershipType: 'seller',
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
    referralCode,
    createdByAdmin: true,
    adminCreatorUserId: adminUid,
    adminMembershipAccess: 'granted',
    adminMembershipGrantedBy: adminUid,
    adminMembershipGrantedAt: ts,
    isDemoAccount: true,
    platformTermsAcceptedAt: ts,
    settings: {
      notifications: { push: true, email: true, sms: true, whatsapp: true, sound: true },
      businessNotifications: {
        newLeads: true,
        newMessages: true,
        newAppointments: true,
        newSales: true,
        documents: true,
        tasks: true,
        catalogInterest: true,
        systemAlerts: true,
      },
    },
    socialMedia: {
      facebook: 'https://facebook.com/autodealersonline',
      instagram: 'https://instagram.com/autodealersonline',
    },
    createdAt: ts,
    updatedAt: ts,
  });

  // App password for seller portal login
  const hashed = hashAppPassword(DEMO.password);
  const now = new Date();
  await db
    .collection('app_password_credentials')
    .doc(appEmailKey('seller', normalizedEmail))
    .set({
      appKey: 'seller',
      email: normalizedEmail,
      userId,
      authUserId: userId,
      ...hashed,
      source: 'admin',
      updatedAt: now,
      createdAt: now,
    });

  // Admin grant subscription
  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  const subRef = db.collection('subscriptions').doc();
  await subRef.set({
    id: subRef.id,
    tenantId,
    userId,
    membershipId: DEMO_MEMBERSHIP_ID,
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

  // Vehicles
  for (let i = 0; i < DEMO_VEHICLES.length; i++) {
    const v = DEMO_VEHICLES[i];
    const stockNumber = `DEMO-${String(i + 1).padStart(3, '0')}`;
    await tenantRef.collection('vehicles').doc().set({
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
        fuelType: v.make === 'Tesla' ? 'electric' : 'gasoline',
        bodyType: v.bodyType,
        exteriorColor: 'Varios',
        color: 'Varios',
        doors: v.bodyType === 'pickup' ? 4 : 4,
        seats: 5,
        hasAccidents: false,
        stockNumber,
      },
      stockNumber,
      status: 'available',
      publishedOnPublicPage: false,
      sellerId: userId,
      sellerCommissionType: 'percentage',
      insuranceCommissionType: 'percentage',
      accessoriesCommissionType: 'percentage',
      views: v.views,
      lastViewedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  // Sample promotion
  await tenantRef.collection('promotions').doc().set({
    tenantId,
    name: 'Financiamiento desde $299/mes',
    description: 'Aprobación rápida en vehículos seleccionados. Consulta hoy mismo.',
    promotionScope: 'seller',
    status: 'active',
    views: 45,
    clicks: 12,
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    ),
    createdAt: ts,
    updatedAt: ts,
  });

  // Sample leads for dashboard realism
  const leads = [
    { name: 'María González', phone: '7875551001', message: 'Quiero info del Toyota Camry 2021', status: 'new' },
    { name: 'Carlos Rivera', phone: '7875551002', message: '¿Tienen fotos extra del CR-V?', status: 'contacted' },
    { name: 'Luis Méndez', phone: '7875551003', message: 'Agendar test drive sábado 10:30 AM', status: 'appointment' },
    { name: 'Ana Torres', phone: '7875551004', message: 'Pregunta por financiamiento F-150', status: 'contacted' },
  ];
  for (const lead of leads) {
    await tenantRef.collection('leads').doc().set({
      ...lead,
      tenantId,
      sellerId: userId,
      source: 'public_page',
      createdAt: ts,
      updatedAt: ts,
    });
  }

  console.log(`✅ Demo seller creado: ${userId}`);
  return {
    existing: false,
    userId,
    tenantId,
    email: normalizedEmail,
    password: DEMO.password,
    subdomain: DEMO.subdomain,
    publicPage: `${PUBLIC_WEB_URL}/seller/${userId}`,
    subdomainPage: `${PUBLIC_WEB_URL}/${DEMO.subdomain}`,
    loginUrl: `${SELLER_URL}/login`,
  };
}

async function sendDemoWelcomeEmail(demo) {
  const { apiKey, from } = await getEmailCreds();
  if (!apiKey) return { sent: false, error: 'No email key' };
  try {
    await sendResendEmail({
      to: demo.email,
      from,
      apiKey,
      subject: 'Tu cuenta demo de vendedor — AutoDealersOnline',
      html: buildSellerWelcomeHtml({
        name: DEMO.name,
        email: demo.email,
        password: demo.password,
        loginUrl: demo.loginUrl || `${SELLER_URL}/login`,
      }),
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

async function main() {
  console.log('\n📧 Reenviando emails de bienvenida a afiliados...\n');
  const affiliateResults = await resendAffiliateEmails();

  console.log('\n🚗 Creando cuenta demo de vendedor...\n');
  const demo = await createDemoSeller();

  console.log('\n📧 Enviando email de bienvenida al demo seller...\n');
  const welcomeResult = await sendDemoWelcomeEmail(demo);

  console.log('\n========== RESUMEN ==========\n');
  console.log('AFILIADOS:');
  console.log(JSON.stringify(affiliateResults, null, 2));
  console.log('\nDEMO VENDEDOR:');
  console.log(JSON.stringify({ ...demo, welcomeEmail: welcomeResult }, null, 2));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
