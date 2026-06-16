/**
 * One-off: guarda integración Facebook de plataforma (_platform) tras OAuth.
 * Uso: node scripts/complete-platform-facebook-oauth.js
 * Requiere .env.local con FIREBASE_* en apps/admin.
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const keyMatch = envText.match(/FIREBASE_PRIVATE_KEY="(.+?)"/s);

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e',
  clientEmail:
    process.env.FIREBASE_CLIENT_EMAIL ||
    'firebase-adminsdk-fbsvc@autodealers-7f62e.iam.gserviceaccount.com',
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') ||
    (keyMatch ? keyMatch[1].replace(/\\n/g, '\n') : undefined),
};

if (!serviceAccount.privateKey) {
  console.error('Falta FIREBASE_PRIVATE_KEY en .env.local');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const PLATFORM_TENANT_ID = '_platform';
const accessToken = process.env.META_USER_ACCESS_TOKEN;
const pageId = process.env.META_PAGE_ID || '136834309519281';
const pageName = process.env.META_PAGE_NAME || 'Auto Sales';
const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
const leadOwnerUserId = process.env.META_LEAD_OWNER_USER_ID || 'pyVqAh2yB3arTI5vcdAH42i4JMD2';

async function main() {
  if (!accessToken || !pageAccessToken) {
    console.error('Define META_USER_ACCESS_TOKEN y META_PAGE_ACCESS_TOKEN');
    process.exit(1);
  }

  const credentials = {
    accessToken,
    pageAccessToken,
    pageId,
    pageName,
    pages: [{ id: pageId, name: pageName }],
  };

  const snap = await db
    .collection('tenants')
    .doc(PLATFORM_TENANT_ID)
    .collection('integrations')
    .where('type', '==', 'facebook')
    .get();

  const payload = {
    type: 'facebook',
    status: 'active',
    leadOwnerUserId,
    credentials,
    settings: { scope: 'platform_support' },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!snap.empty) {
    await snap.docs[0].ref.update(payload);
    console.log('✅ Integración Facebook actualizada:', snap.docs[0].id);
  } else {
    const ref = await db
      .collection('tenants')
      .doc(PLATFORM_TENANT_ID)
      .collection('integrations')
      .add({
        ...payload,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    console.log('✅ Integración Facebook creada:', ref.id);
  }

  await db.collection('tenants').doc(PLATFORM_TENANT_ID).set(
    {
      name: 'AutoDealers Platform',
      type: 'platform',
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log('✅ Tenant _platform listo. Página:', pageName);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
