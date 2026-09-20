/**
 * Instala un System User access token permanente en tenants/_platform
 * (facebook + instagram) y deriva el page token.
 *
 * Uso:
 *   set META_SYSTEM_USER_TOKEN=EAAB...
 *   node scripts/install-platform-system-user-token.js
 *
 * Generar el token en Business Manager (un solo paso manual):
 *   Business settings → System users → "AutoDealersOnline Platform"
 *   → Generate new token → App AutoDealersOnline → permisos Pages/Ads/IG
 *   → copiar token (nunca expira hasta revocarlo)
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
  privateKey:
    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') ||
    (keyMatch ? keyMatch[1].replace(/\\n/g, '\n') : undefined),
};

if (!serviceAccount.privateKey) {
  console.error('Falta FIREBASE_PRIVATE_KEY en .env.local');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const GRAPH = 'v18.0';
const PLATFORM_TENANT = '_platform';
const PAGE_ID = process.env.META_PAGE_ID || '935597762971394';
const AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID || 'act_1080340951331625';
const BUSINESS_ID = process.env.META_BUSINESS_ID || '25825518717087396';
const SYSTEM_USER_ID = process.env.META_SYSTEM_USER_ID || '122101529703480902';

async function main() {
  const token = (process.env.META_SYSTEM_USER_TOKEN || '').trim();
  if (!token) {
    console.error('Define META_SYSTEM_USER_TOKEN con el token del System User.');
    process.exit(1);
  }

  const pagesRes = await fetch(
    `https://graph.facebook.com/${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100&access_token=${encodeURIComponent(token)}`
  );
  const pagesJson = await pagesRes.json();
  if (!pagesRes.ok || !pagesJson.data?.length) {
    console.error('El System User no ve páginas:', pagesJson.error?.message || pagesJson);
    process.exit(1);
  }

  const page = pagesJson.data.find((p) => String(p.id) === PAGE_ID) || pagesJson.data[0];
  if (!page?.access_token) {
    console.error('Sin page access token');
    process.exit(1);
  }

  const credentials = {
    accessToken: token,
    pageAccessToken: page.access_token,
    pageId: String(page.id),
    pageName: String(page.name || page.id),
    pages: pagesJson.data.map((p) => ({
      id: p.id,
      name: p.name,
      ...(p.instagram_business_account
        ? { instagram_business_account: p.instagram_business_account }
        : {}),
    })),
    adAccountId: AD_ACCOUNT,
    businessId: BUSINESS_ID,
    systemUserId: SYSTEM_USER_ID,
    tokenSource: 'system_user',
    tokenNeverExpires: true,
    installedAt: new Date().toISOString(),
  };

  const db = admin.firestore();
  for (const type of ['facebook', 'instagram']) {
    const snap = await db
      .collection('tenants')
      .doc(PLATFORM_TENANT)
      .collection('integrations')
      .where('type', '==', type)
      .limit(1)
      .get();

    if (!snap.empty) {
      const prev = snap.docs[0].data()?.credentials || {};
      await snap.docs[0].ref.update({
        status: 'active',
        credentials: { ...prev, ...credentials },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ ${type} actualizado:`, snap.docs[0].id);
    } else {
      const ref = await db
        .collection('tenants')
        .doc(PLATFORM_TENANT)
        .collection('integrations')
        .add({
          type,
          status: 'active',
          credentials,
          settings: { scope: 'platform_support' },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      console.log(`✅ ${type} creado:`, ref.id);
    }
  }

  await db.collection('system_settings').doc('platform_social').set(
    {
      officialFacebookPageId: String(page.id),
      officialFacebookPageName: String(page.name || page.id),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log('✅ platform_social alineado a', page.id, page.name);
  console.log('Listo. Verifica con debug_token (expires_at y data_access deben ser 0).');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
