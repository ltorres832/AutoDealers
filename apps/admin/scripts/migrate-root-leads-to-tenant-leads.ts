/**
 * Migra documentos de la colección raíz `leads` → `tenants/{tenantId}/leads/{id}`.
 *
 * Uso (desde la raíz del monorepo, con credenciales de Firebase Admin en el entorno):
 *   npx ts-node --transpile-only apps/admin/scripts/migrate-root-leads-to-tenant-leads.ts
 *
 * Los IDs de documento se conservan para no romper referencias en notificaciones.
 * Solo migra filas que tengan `tenantId`. Las demás se listan y se omiten.
 */

import { initializeFirebase, getFirestore } from '@autodealers/core';

initializeFirebase();
const db = getFirestore();

const KNOWN = new Set([
  'whatsapp',
  'facebook',
  'instagram',
  'web',
  'email',
  'sms',
  'phone',
  'admin_manual',
]);

function asSource(v: unknown): string {
  const s = typeof v === 'string' ? v : 'web';
  return KNOWN.has(s) ? s : 'web';
}

async function main() {
  const snap = await db.collection('leads').get();
  if (snap.empty) {
    console.log('No hay documentos en la colección raíz `leads`. Nada que migrar.');
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let deleted = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const tenantId = data.tenantId as string | undefined;
    if (!tenantId) {
      console.warn(`[omitir] ${doc.id}: sin tenantId`);
      skipped++;
      continue;
    }

    const contact =
      data.contact && typeof data.contact === 'object'
        ? {
            name: String(data.contact.name || data.name || 'Cliente'),
            email: data.contact.email || data.email || undefined,
            phone: String(data.contact.phone || data.phone || ''),
            preferredChannel: String(data.contact.preferredChannel || 'phone'),
          }
        : {
            name: String(data.name || 'Cliente'),
            email: data.email || undefined,
            phone: String(data.phone || ''),
            preferredChannel: 'phone',
          };

    const dest = db.collection('tenants').doc(tenantId).collection('leads').doc(doc.id);

    const payload: Record<string, unknown> = {
      ...data,
      tenantId,
      contact,
      source: asSource(data.source),
      status: typeof data.status === 'string' ? data.status : 'new',
      notes: typeof data.notes === 'string' ? data.notes : '',
      interactions: Array.isArray(data.interactions) ? data.interactions : [],
    };

    delete payload.name;
    delete payload.email;
    delete payload.phone;

    await dest.set(payload, { merge: true });
    migrated++;
    await doc.ref.delete();
    deleted++;
    console.log(`Migrado y borrado raíz: ${doc.id} → tenants/${tenantId}/leads/${doc.id}`);
  }

  console.log(`Listo. Migrados: ${migrated}, omitidos: ${skipped}, borrados en raíz: ${deleted}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
