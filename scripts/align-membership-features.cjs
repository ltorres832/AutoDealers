/**
 * Alinea planes de memberships en Firestore con features gateables del producto.
 * Uso: node scripts/align-membership-features.cjs
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'autodealers-7f62e' });
}
const db = admin.firestore();

const OPT_OUT_ENABLE = [
  'customerDocumentRequestsEnabled',
  'compensationPortalEnabled',
  'dmsServiceEnabled',
  'dmsPartsEnabled',
  'dmsFinanceEnabled',
  'dmsHrEnabled',
  'vin_camera_scan',
  'share_landing',
  'photo_guide',
  'bg_remover',
  'dynamic_scenes',
  'daco_labels',
];

const OPT_OUT_DEALER_ONLY = [
  'dealer_site_builder',
  'inventory_alliances',
  'inventory_feed_sync',
];

const PAID_ENABLE_IF_FALSE = [
  'advancedReports',
  'automationWorkflows',
  'exportData',
  'crmAdvanced',
  'appointmentScheduling',
  'liveChat',
  'socialMediaEnabled',
  'videoUploads',
  'customTemplates',
];

const FI_ENABLE_TYPES = new Set(['dealer', 'seller']);

function isSkipPlan(id, data) {
  const name = String(data.name || '');
  if (/smoke/i.test(name) || id === 'free' || /^Gratis$/i.test(name)) return true;
  const f = data.features || {};
  if (f.adminAssignOnly === true || f.customMembership === true) return true;
  return false;
}

function needsTrue(features, key) {
  return features[key] !== true;
}

async function main() {
  const snap = await db.collection('memberships').get();
  let updated = 0;
  const report = [];

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (isSkipPlan(doc.id, data)) continue;

    const type = String(data.type || '');
    const features = { ...(data.features || {}) };
    const changes = [];

    for (const key of OPT_OUT_ENABLE) {
      if (needsTrue(features, key)) {
        features[key] = true;
        changes.push(`${key}=true`);
      }
    }

    if (type === 'dealer') {
      for (const key of OPT_OUT_DEALER_ONLY) {
        if (needsTrue(features, key)) {
          features[key] = true;
          changes.push(`${key}=true`);
        }
      }
    }

    if (type === 'dealer' || type === 'seller' || type === 'business') {
      for (const key of PAID_ENABLE_IF_FALSE) {
        if (type === 'business' && (key === 'videoUploads' || key === 'customTemplates')) {
          continue;
        }
        if (needsTrue(features, key)) {
          features[key] = true;
          changes.push(`${key}=true`);
        }
      }
    }

    if (FI_ENABLE_TYPES.has(type) && needsTrue(features, 'fiModule')) {
      features.fiModule = true;
      changes.push('fiModule=true');
    }

    if (type === 'business') {
      if (needsTrue(features, 'appointmentScheduling')) {
        features.appointmentScheduling = true;
        changes.push('appointmentScheduling=true');
      }
      if (needsTrue(features, 'marketplaceEnabled')) {
        features.marketplaceEnabled = true;
        changes.push('marketplaceEnabled=true');
      }
      if (/premium/i.test(String(data.name || '')) && needsTrue(features, 'paymentProcessing')) {
        features.paymentProcessing = true;
        changes.push('paymentProcessing=true');
      }
    }

    if (changes.length === 0) continue;

    await doc.ref.update({
      features,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncVersion: admin.firestore.FieldValue.increment(1),
    });
    updated += 1;
    report.push(`${doc.id} (${type} ${data.name}): ${changes.join(', ')}`);
  }

  console.log(`Updated ${updated} memberships`);
  for (const line of report) console.log(' -', line);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
