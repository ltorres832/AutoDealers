/**
 * Documentos públicos por token opaco para seguimiento de citas sin login.
 * Colección en raíz: `publicLeadAppointmentTracking/{token}` — solo el cliente con el token puede "adivinar" la ruta.
 */

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

export const PUBLIC_LEAD_APPOINTMENT_TRACKING_COLLECTION = 'publicLeadAppointmentTracking';

function getDb() {
  return getFirestore();
}

/** Crea o fusiona el doc público al crear el lead (POST cita pública). */
export async function ensurePublicAppointmentTrackingDoc(
  token: string,
  payload: { tenantId: string; leadId: string; subdomain?: string }
): Promise<void> {
  if (!token.trim()) return;
  const db = getDb();
  await db
    .collection(PUBLIC_LEAD_APPOINTMENT_TRACKING_COLLECTION)
    .doc(token)
    .set(
      {
        ...payload,
        clientAppointmentNotification: null,
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      },
      { merge: true }
    );
}

/** Duplica la notificación de confirmación para listeners públicos (onSnapshot). */
export async function mirrorPublicAppointmentTracking(
  tenantId: string,
  leadId: string,
  clientAppointmentNotification: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  const leadSnap = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc(leadId)
    .get();
  const token = leadSnap.data()?.publicTrackingToken;
  if (!token || typeof token !== 'string') return;

  await db
    .collection(PUBLIC_LEAD_APPOINTMENT_TRACKING_COLLECTION)
    .doc(token)
    .set(
      {
        tenantId,
        leadId,
        clientAppointmentNotification,
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      },
      { merge: true }
    );
}
