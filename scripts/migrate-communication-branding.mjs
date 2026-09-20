import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PLATFORM_NAME = 'AutoDealersOnline';

function normalizePlatformMessageText(text) {
  if (!text) return text;
  const preserved = [];
  const masked = text.replace(/(?:https?:\/\/)?\S*autodealers[\w.-]*\S*/gi, (match) => {
    preserved.push(match);
    return `__AD_DOMAIN_${preserved.length - 1}__`;
  });
  let normalized = masked
    .replace(/Equipo AutoDealers\b(?!Online)/gi, `Equipo ${PLATFORM_NAME}`)
    .replace(/Bienvenido a AutoDealers\b(?!Online)/gi, `Bienvenido a ${PLATFORM_NAME}`)
    .replace(/parte de AutoDealers\b(?!Online)/gi, `parte de ${PLATFORM_NAME}`)
    .replace(/ en AutoDealers\b(?!Online)/gi, ` en ${PLATFORM_NAME}`)
    .replace(/ - AutoDealers\b(?!Online)/gi, ` - ${PLATFORM_NAME}`)
    .replace(/\[AutoDealers\]/g, `[${PLATFORM_NAME}]`)
    .replace(/\bAutoDealers\b(?!Online)/g, PLATFORM_NAME)
    .replace(/\bautodealers\b(?!online)/gi, PLATFORM_NAME);
  preserved.forEach((value, index) => {
    normalized = normalized.replace(`__AD_DOMAIN_${index}__`, value);
  });
  return normalized;
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const snap = await db.collection('communication_templates').get();
let updated = 0;

for (const doc of snap.docs) {
  const data = doc.data();
  const content = normalizePlatformMessageText(String(data.content || ''));
  const subject =
    typeof data.subject === 'string' ? normalizePlatformMessageText(data.subject) : undefined;
  const patch = {};
  if (content !== data.content) patch.content = content;
  if (subject !== undefined && subject !== data.subject) patch.subject = subject;
  if (!Object.keys(patch).length) continue;
  patch.updatedAt = FieldValue.serverTimestamp();
  await doc.ref.update(patch);
  updated += 1;
  console.log(`Updated ${doc.id} (${data.name || data.event})`);
}

console.log(`Done: ${updated}/${snap.size} templates updated`);
