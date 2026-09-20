/**
 * Videos promocionales y galería de confianza para la cuenta demo Pedro Martínez.
 * URLs verificadas (oembed / HEAD 200) para evitar recuadros negros rotos.
 *
 * Uso: node scripts/seed-demo-pedro-public-media.cjs
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

const SELLER_ID = 'hUX9H3j2toXfvIz8tEtFNzSgiUW2';

/** YouTube verificados (oembed 200) — walkthroughs reales de concesionario. */
const DEMO_PROMO_VIDEOS = [
  'https://www.youtube.com/watch?v=14JoN0dUm74',
  'https://www.youtube.com/watch?v=HwsgOqfg-RA',
  'https://www.youtube.com/watch?v=kVG0SXifdo8',
];

/** Unsplash verificados (HEAD 200) — mismas fuentes que el inventario demo. */
const DEMO_TRUST_GALLERY = [
  {
    url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=900&q=80',
    caption: 'Entrega del Toyota Camry 2021 — familia de San Juan',
  },
  {
    url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=900',
    caption: 'Toyota Camry 2021 listo para entrega',
  },
  {
    url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=900',
    caption: 'Test drive del Honda CR-V con cliente de Bayamón',
  },
  {
    url: 'https://images.unsplash.com/photo-1605893477799-b99e3b8b93fe?w=900',
    caption: 'Inspección final del Ford F-150 antes de entrega',
  },
  {
    url: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=900',
    caption: 'Detalle Tesla Model 3 — unidad disponible',
  },
  {
    url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900',
    caption: 'Entrega premium BMW X5 — Guaynabo',
  },
  {
    url: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900',
    caption: 'Hyundai Tucson — familia eligiendo su próximo SUV',
  },
  {
    url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80',
    caption: 'Cliente feliz con su nuevo vehículo — Carolina',
  },
];

async function main() {
  console.log('\n📸 Actualizando videos y galería demo para Pedro Martínez...\n');

  const userRef = db.collection('users').doc(SELLER_ID);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new Error(`Usuario demo no encontrado: ${SELLER_ID}`);
  }

  await userRef.set(
    {
      publicPromoVideoUrls: DEMO_PROMO_VIDEOS,
      publicPromoVideoUrl: DEMO_PROMO_VIDEOS[0],
      publicTrustGalleryPhotos: DEMO_TRUST_GALLERY,
      updatedAt: ts,
    },
    { merge: true }
  );

  console.log(`✅ ${DEMO_PROMO_VIDEOS.length} videos promocionales (YouTube verificados)`);
  DEMO_PROMO_VIDEOS.forEach((url, i) => console.log(`   ${i + 1}. ${url}`));
  console.log(`\n✅ ${DEMO_TRUST_GALLERY.length} fotos en galería (URLs verificadas)`);
  DEMO_TRUST_GALLERY.forEach((item, i) => console.log(`   ${i + 1}. ${item.caption}`));
  console.log('\nListo. Visible en /promo/vendedor/pedro y en el panel → Página pública.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
