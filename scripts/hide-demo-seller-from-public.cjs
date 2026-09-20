/** Oculta la cuenta demo Pedro del catálogo público (Firestore). */
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
const SELLER_ID = 'hUX9H3j2toXfvIz8tEtFNzSgiUW2';
const TENANT_ID = 'NPtFzTw3FyQkb6NPQkdj';

(async () => {
  await db.collection('users').doc(SELLER_ID).set(
    {
      isDemo: true,
      isDemoAccount: true,
      isPromoDemo: true,
      visibility: 'demo',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await db.collection('tenants').doc(TENANT_ID).set(
    {
      isDemo: true,
      isDemoAccount: true,
      isPromoDemo: true,
      visibility: 'demo',
      subdomain: admin.firestore.FieldValue.delete(),
      pendingSubdomain: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const veh = await db.collection('tenants').doc(TENANT_ID).collection('vehicles').get();
  const batch = db.batch();
  veh.docs.forEach((d) => {
    batch.update(d.ref, {
      publishedOnPublicPage: false,
      isDemo: true,
      visibility: 'demo',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();

  console.log('✅ Demo seller oculto del catálogo público');
  console.log(`   Usuario: ${SELLER_ID}`);
  console.log(`   Tenant: ${TENANT_ID}`);
  console.log(`   Vehículos actualizados: ${veh.size}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
