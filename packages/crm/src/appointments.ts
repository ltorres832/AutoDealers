// Gestión de citas

import { Appointment, Reminder } from './types';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

// Lazy initialization
function getDb() {
  return getFirestore();
}

/**
 * Crea una nueva cita
 */
export async function createAppointment(
  appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'reminders'>
): Promise<Appointment> {
  const db = getDb();
  // Verificar disponibilidad
  const isAvailable = await checkAvailability(
    appointmentData.tenantId,
    appointmentData.assignedTo,
    appointmentData.scheduledAt,
    appointmentData.duration
  );

  if (!isAvailable) {
    throw new Error('El horario no está disponible');
  }

  const docRef = db
    .collection('tenants')
    .doc(appointmentData.tenantId)
    .collection('appointments')
    .doc();

  await docRef.set({
    ...appointmentData,
    reminders: [],
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  } as any);

  const newAppointment: Appointment = {
    id: docRef.id,
    ...appointmentData,
    reminders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Obtener información del lead y vendedor para la notificación
  try {
    const { getLeadById } = await import('./leads');
    const lead = await getLeadById(appointmentData.tenantId, appointmentData.leadId);
    const sellerDoc = await db.collection('users').doc(appointmentData.assignedTo).get();
    const sellerName = sellerDoc.data()?.name || 'Vendedor';

    const appointmentDate = new Date(appointmentData.scheduledAt);
    const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Notificar a gerentes / dealers (excluye al vendedor asignado para evitar duplicado)
    const { notifyManagersAndAdmins, createNotification } = await import('@autodealers/core');
    const { resolveUserNotificationChannels } = await import('./user-notification-channels');
    await notifyManagersAndAdmins(
      appointmentData.tenantId,
      {
        type: 'appointment_created',
        title: 'Nueva Cita Programada',
        message: `Se ha programado una nueva cita de tipo ${appointmentData.type} para ${lead?.contact?.name || 'Cliente'} (${lead?.contact?.phone || ''}) con ${sellerName} el ${formattedDate}.`,
        metadata: {
          appointmentId: newAppointment.id,
          leadId: appointmentData.leadId,
          assignedTo: appointmentData.assignedTo,
          assignedToName: sellerName,
          type: appointmentData.type,
          scheduledAt: appointmentData.scheduledAt.toISOString(),
          contactName: lead?.contact?.name,
          contactPhone: lead?.contact?.phone,
        },
      },
      { excludeUserIds: [appointmentData.assignedTo] }
    );

    const sellerChannels = await resolveUserNotificationChannels(appointmentData.assignedTo);
    await createNotification({
      tenantId: appointmentData.tenantId,
      userId: appointmentData.assignedTo,
      type: 'appointment_created',
      title: 'Nueva cita — revisa y confirma',
      message: `Cita (${appointmentData.type}) con ${lead?.contact?.name || 'cliente'} el ${formattedDate}.`,
      channels: sellerChannels,
      metadata: {
        appointmentId: newAppointment.id,
        leadId: appointmentData.leadId,
        route: '/appointments',
      },
    });
  } catch (error) {
    // No fallar si las notificaciones no están disponibles
    console.warn('Manager notification skipped for new appointment:', error);
  }

  return newAppointment;
}

/**
 * Obtiene una cita por ID
 */
export async function getAppointmentById(
  tenantId: string,
  appointmentId: string
): Promise<Appointment | null> {
  const db = getDb();
  const appointmentDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointments')
    .doc(appointmentId)
    .get();

  if (!appointmentDoc.exists) {
    return null;
  }

  const data = appointmentDoc.data();
  return {
    id: appointmentDoc.id,
    ...data,
    scheduledAt: data?.scheduledAt?.toDate() || new Date(),
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
    confirmedAt: data?.confirmedAt?.toDate?.() ?? data?.confirmedAt,
  } as Appointment;
}

/**
 * Obtiene todas las citas de un tenant
 */
export async function getAppointments(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Appointment[]> {
  const db = getDb();
  let query: any = db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointments');

  if (startDate) {
    query = query.where('scheduledAt', '>=', startDate);
  }

  if (endDate) {
    query = query.where('scheduledAt', '<=', endDate);
  }

  query = query.orderBy('scheduledAt', 'asc');

  const snapshot = await query.get();

  return snapshot.docs.map((doc: any) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      scheduledAt: data?.scheduledAt?.toDate() || new Date(),
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as Appointment;
  });
}

/**
 * Obtiene citas de un vendedor
 */
export async function getAppointmentsBySeller(
  tenantId: string,
  sellerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Appointment[]> {
  const db = getDb();
  let query: any = db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointments')
    .where('assignedTo', '==', sellerId);

  if (startDate) {
    query = query.where('scheduledAt', '>=', startDate);
  }

  if (endDate) {
    query = query.where('scheduledAt', '<=', endDate);
  }

  query = query.orderBy('scheduledAt', 'asc');

  const snapshot = await query.get();

  return snapshot.docs.map((doc: any) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      scheduledAt: data?.scheduledAt?.toDate() || new Date(),
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as Appointment;
  });
}

/**
 * Obtiene citas de un lead
 */
export async function getLeadAppointments(
  tenantId: string,
  leadId: string
): Promise<Appointment[]> {
  const db = getDb();
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointments')
    .where('leadId', '==', leadId)
    .orderBy('scheduledAt', 'asc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      scheduledAt: data?.scheduledAt?.toDate() || new Date(),
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as Appointment;
  });
}

/**
 * Actualiza una cita (campos parciales)
 */
export async function updateAppointment(
  tenantId: string,
  appointmentId: string,
  updates: Partial<Omit<Appointment, 'id' | 'createdAt' | 'reminders'>>
): Promise<Appointment> {
  const db = getDb();
  const appointmentRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointments')
    .doc(appointmentId);

  await appointmentRef.update({
    ...updates,
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  } as any);

  const updatedDoc = await appointmentRef.get();
  if (!updatedDoc.exists) {
    throw new Error('Appointment not found');
  }

  const data = updatedDoc.data();
  return {
    id: updatedDoc.id,
    ...data,
    scheduledAt: data?.scheduledAt?.toDate?.() || new Date(data?.scheduledAt),
    createdAt: data?.createdAt?.toDate?.() || new Date(data?.createdAt),
    updatedAt: data?.updatedAt?.toDate?.() || new Date(data?.updatedAt),
    reminders: data?.reminders || [],
  } as Appointment;
}

/**
 * Actualiza el estado de una cita
 */
export async function updateAppointmentStatus(
  tenantId: string,
  appointmentId: string,
  status: Appointment['status']
): Promise<void> {
  const db = getDb();
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointments')
    .doc(appointmentId)
    .update({
      status,
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    } as any);
}

/**
 * Cancela una cita
 */
export async function cancelAppointment(
  tenantId: string,
  appointmentId: string,
  reason?: string
): Promise<void> {
  const db = getDb();
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointments')
    .doc(appointmentId)
    .update({
      status: 'cancelled',
      notes: reason ? `Cancelada: ${reason}` : undefined,
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    } as any);
}

/**
 * Agrega un recordatorio a una cita
 */
export async function addReminder(
  tenantId: string,
  appointmentId: string,
  reminder: Reminder
): Promise<void> {
  const db = getDb();
  const appointment = await getAppointmentById(tenantId, appointmentId);
  if (!appointment) {
    throw new Error('Cita no encontrada');
  }

  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointments')
    .doc(appointmentId)
    .update({
      reminders: getFirestoreFieldValue().arrayUnion(reminder),
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    } as any);
}

/**
 * Verifica disponibilidad de horario
 */
export async function checkAvailability(
  tenantId: string,
  sellerId: string,
  scheduledAt: Date,
  duration: number
): Promise<boolean> {
  const endTime = new Date(scheduledAt.getTime() + duration * 60 * 1000);

  // Obtener citas existentes del vendedor en ese rango
  const existingAppointments = await getAppointmentsBySeller(
    tenantId,
    sellerId,
    scheduledAt,
    endTime
  );

  // Filtrar solo las que están activas (no canceladas)
  const activeAppointments = existingAppointments.filter(
    (apt) => apt.status !== 'cancelled' && apt.status !== 'completed'
  );

  // Verificar si hay conflicto
  for (const apt of activeAppointments) {
    const aptEnd = new Date(
      apt.scheduledAt.getTime() + apt.duration * 60 * 1000
    );

    if (
      (scheduledAt >= apt.scheduledAt && scheduledAt < aptEnd) ||
      (endTime > apt.scheduledAt && endTime <= aptEnd) ||
      (scheduledAt <= apt.scheduledAt && endTime >= aptEnd)
    ) {
      return false; // Hay conflicto
    }
  }

  return true; // Disponible
}

/**
 * Confirma la cita, guarda quién confirmó y escribe `clientAppointmentNotification` en el lead
 * para que apps cliente / web pública escuchen en tiempo real (Firestore onSnapshot).
 */
export async function confirmAppointmentAndNotifyClient(
  tenantId: string,
  appointmentId: string,
  confirmedBy: { userId: string; name: string }
): Promise<Appointment> {
  const apt = await getAppointmentById(tenantId, appointmentId);
  if (!apt) {
    throw new Error('Cita no encontrada');
  }
  if (apt.status === 'cancelled' || apt.status === 'completed') {
    throw new Error('La cita no se puede confirmar');
  }

  const updated = await updateAppointment(tenantId, appointmentId, {
    status: 'confirmed',
    confirmedByUserId: confirmedBy.userId,
    confirmedByName: confirmedBy.name,
    confirmedAt: new Date(),
  } as Partial<Appointment>);

  const db = getDb();
  const scheduledIso =
    apt.scheduledAt instanceof Date ? apt.scheduledAt.toISOString() : String(apt.scheduledAt);

  const clientAppointmentNotification = {
    appointmentId,
    headline: 'Cita confirmada',
    body: `Tu cita fue confirmada por ${confirmedBy.name}.`,
    confirmedByName: confirmedBy.name,
    appointmentType: apt.type,
    scheduledAt: scheduledIso,
    at: getFirestoreFieldValue().serverTimestamp(),
  };

  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc(apt.leadId)
    .update({
      clientAppointmentNotification,
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    } as any);

  try {
    const { mirrorPublicAppointmentTracking } = await import('./public-appointment-tracking');
    await mirrorPublicAppointmentTracking(tenantId, apt.leadId, clientAppointmentNotification as Record<string, unknown>);
  } catch (e) {
    console.warn('mirrorPublicAppointmentTracking skipped:', e);
  }

  try {
    const { addInteraction } = await import('./leads');
    await addInteraction(tenantId, apt.leadId, {
      type: 'appointment',
      content: `Cita confirmada por ${confirmedBy.name}`,
      userId: confirmedBy.userId,
    });
  } catch (e) {
    console.warn('addInteraction on confirm skipped:', e);
  }

  try {
    const { notifyManagersAndAdmins } = await import('@autodealers/core');
    await notifyManagersAndAdmins(tenantId, {
      type: 'appointment_confirmed',
      title: 'Cita confirmada',
      message: `La cita (${apt.type}) fue confirmada por ${confirmedBy.name} para el lead ${apt.leadId}.`,
      metadata: { appointmentId, leadId: apt.leadId },
    });
  } catch (e) {
    console.warn('Manager notify on confirm skipped:', e);
  }

  return updated;
}
