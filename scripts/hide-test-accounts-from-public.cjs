/** Marca cuentas e2e/fixture como demo. No borra documentos ni inventario. */
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
const FLAGS = {
  isDemo: true,
  isDemoAccount: true,
  visibility: 'demo',
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

const TENANT_IDS = [
  'auto-premium-test',
  'wUJvXEk8dYjkOAXwNLdc',
  'rD0HckGDG0vXp3nfZ5Dn',
];

const USER_IDS = [
  '7njKg6h3HvOHRdvlpCZraxnGrBN2',
  'xCwBlXKMQCbLP8GiO4SeD0gxjSc2',
  'Redh19vKEaenF7EjTOo81ui1rGN2',
  '0uR7VisYN3ZWA5nOhFPzSRzkXEP2',
];

(async () => {
  for (const id of TENANT_IDS) {
    const ref = db.collection('tenants').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`skip tenant (no existe): ${id}`);
      continue;
    }
    await ref.set(FLAGS, { merge: true });
    console.log(`flag tenant: ${id} (${snap.data()?.name || ''})`);
  }

  for (const id of USER_IDS) {
    const ref = db.collection('users').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`skip user (no existe): ${id}`);
      continue;
    }
    await ref.set(FLAGS, { merge: true });
    console.log(`flag user: ${id} (${snap.data()?.name || snap.data()?.email || ''})`);
  }

  const veh = await db.collection('tenants').doc('auto-premium-test').collection('vehicles').get();
  if (!veh.empty) {
    const batch = db.batch();
    veh.docs.forEach((d) => {
      batch.set(
        d.ref,
        { isDemo: true, visibility: 'demo', updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    });
    await batch.commit();
    console.log(`flag vehicles auto-premium-test: ${veh.size}`);
  }

  console.log('✅ Cuentas de prueba marcadas isDemo (sin borrar)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
