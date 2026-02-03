// Gestión de citas

import { Appointment, Reminder } from './types';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Crea una nueva cita
 */
export async function createAppointment(
  appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'reminders'>
): Promise<Appointment> {
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
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

    // Notificar a gerentes y administradores sobre la nueva cita (asíncrono, no bloquea)
    const { notifyManagersAndAdmins } = await import('@autodealers/core');
    await notifyManagersAndAdmins(appointmentData.tenantId, {
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
  let query: admin.firestore.Query = db
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
 * Obtiene citas de un vendedor
 */
export async function getAppointmentsBySeller(
  tenantId: string,
  sellerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Appointment[]> {
  let query: admin.firestore.Query = db
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
 * Obtiene citas de un lead
 */
export async function getLeadAppointments(
  tenantId: string,
  leadId: string
): Promise<Appointment[]> {
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
 * Actualiza el estado de una cita
 */
export async function updateAppointmentStatus(
  tenantId: string,
  appointmentId: string,
  status: Appointment['status']
): Promise<void> {
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointments')
    .doc(appointmentId)
    .update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointments')
    .doc(appointmentId)
    .update({
      status: 'cancelled',
      notes: reason ? `Cancelada: ${reason}` : undefined,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
      reminders: admin.firestore.FieldValue.arrayUnion(reminder),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

