// Recordatorios post-venta

export type ReminderType =
  | 'oil_change'
  | 'filter'
  | 'oil_change_filter' // Cambio de aceite y filtro juntos
  | 'tire_rotation'
  | 'custom';

export type ReminderFrequency =
  | 'monthly'
  | '3_months'
  | '5_months'
  | '6_months'
  | 'manual';

export interface PostSaleReminder {
  id: string;
  tenantId: string;
  saleId: string;
  customerId: string;
  vehicleId: string;
  type: ReminderType;
  customType?: string;
  frequency: ReminderFrequency;
  nextReminder: Date;
  channels: ('email' | 'sms' | 'whatsapp')[];
  status: 'active' | 'completed' | 'cancelled';
  sentAt?: Date;
  createdAt: Date;
}

import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Crea un recordatorio individual
 */
export async function createReminder(
  reminderData: Omit<PostSaleReminder, 'id' | 'createdAt'>
): Promise<PostSaleReminder> {
  const docRef = db
    .collection('tenants')
    .doc(reminderData.tenantId)
    .collection('post_sale_reminders')
    .doc();

  await docRef.set({
    ...reminderData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    id: docRef.id,
    ...reminderData,
    createdAt: new Date(),
  };
}

/**
 * Crea recordatorios post-venta automáticamente
 */
export async function createPostSaleReminders(
  tenantId: string,
  saleId: string,
  customerId: string,
  vehicleId: string,
  selectedReminders?: (ReminderType | 'oil_change_filter' | 'oil_change_filter_3' | 'oil_change_filter_5' | 'oil_change_filter_6')[] // Recordatorios seleccionados por el usuario
): Promise<PostSaleReminder[]> {
  // Si se especifican recordatorios, usar solo esos
  const reminderTypes = selectedReminders || ['oil_change_filter_3', 'tire_rotation'];
  
  // Crear recordatorios según selección
  const remindersData: Omit<PostSaleReminder, 'id' | 'createdAt'>[] = [];

  // Manejar cambio de aceite con diferentes frecuencias
  if (reminderTypes.includes('oil_change_filter_3') || reminderTypes.includes('oil_change_filter')) {
    remindersData.push({
      tenantId,
      saleId,
      customerId,
      vehicleId,
      type: 'custom',
      customType: 'Cambio de Aceite y Filtro',
      frequency: '3_months',
      nextReminder: addMonths(new Date(), 3),
      channels: ['email', 'whatsapp'],
      status: 'active',
    });
  }

  if (reminderTypes.includes('oil_change_filter_5')) {
    remindersData.push({
      tenantId,
      saleId,
      customerId,
      vehicleId,
      type: 'custom',
      customType: 'Cambio de Aceite y Filtro',
      frequency: '5_months',
      nextReminder: addMonths(new Date(), 5),
      channels: ['email', 'whatsapp'],
      status: 'active',
    });
  }

  if (reminderTypes.includes('oil_change_filter_6')) {
    remindersData.push({
      tenantId,
      saleId,
      customerId,
      vehicleId,
      type: 'custom',
      customType: 'Cambio de Aceite y Filtro',
      frequency: '6_months',
      nextReminder: addMonths(new Date(), 6),
      channels: ['email', 'whatsapp'],
      status: 'active',
    });
  }

  if (reminderTypes.includes('tire_rotation')) {
    remindersData.push({
      tenantId,
      saleId,
      customerId,
      vehicleId,
      type: 'tire_rotation',
      frequency: '6_months',
      nextReminder: addMonths(new Date(), 6),
      channels: ['email', 'sms'],
      status: 'active',
    });
  }

  // Agregar otros tipos si están seleccionados
  if (reminderTypes.includes('oil_change') && !reminderTypes.includes('oil_change_filter')) {
    remindersData.push({
      tenantId,
      saleId,
      customerId,
      vehicleId,
      type: 'oil_change',
      frequency: '3_months',
      nextReminder: addMonths(new Date(), 3),
      channels: ['email', 'whatsapp'],
      status: 'active',
    });
  }

  if (reminderTypes.includes('filter') && !reminderTypes.includes('oil_change_filter')) {
    remindersData.push({
      tenantId,
      saleId,
      customerId,
      vehicleId,
      type: 'filter',
      frequency: '6_months',
      nextReminder: addMonths(new Date(), 6),
      channels: ['email'],
      status: 'active',
    });
  }

  // Guardar en Firestore
  const reminders: PostSaleReminder[] = [];

  for (const reminderData of remindersData) {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('post_sale_reminders')
      .doc();

    await docRef.set({
      ...reminderData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);

    reminders.push({
      id: docRef.id,
      ...reminderData,
      createdAt: new Date(),
    });
  }

  return reminders;
}

/**
 * Obtiene todos los recordatorios (activos y completados)
 */
export async function getAllReminders(
  tenantId: string,
  filters?: {
    status?: 'active' | 'completed' | 'cancelled';
    startDate?: Date;
    endDate?: Date;
  }
): Promise<PostSaleReminder[]> {
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('post_sale_reminders');

  // Aplicar filtro de status si existe (requiere índice)
  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }

  // Ordenar por nextReminder (requiere índice)
  // Si hay filtros de fecha, los aplicaremos en memoria para evitar índices compuestos
  if (!filters?.startDate && !filters?.endDate) {
    query = query.orderBy('nextReminder', 'asc');
  }

  const snapshot = await query.get();

  let reminders = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      nextReminder: data?.nextReminder?.toDate() || new Date(),
      sentAt: data?.sentAt?.toDate(),
      createdAt: data?.createdAt?.toDate() || new Date(),
    } as PostSaleReminder;
  });

  // Filtrar por fecha en memoria si es necesario
  if (filters?.startDate) {
    reminders = reminders.filter((r) => r.nextReminder >= filters.startDate!);
  }

  if (filters?.endDate) {
    reminders = reminders.filter((r) => r.nextReminder <= filters.endDate!);
  }

  // Ordenar por fecha si no se ordenó en la consulta
  if (filters?.startDate || filters?.endDate) {
    reminders.sort((a, b) => a.nextReminder.getTime() - b.nextReminder.getTime());
  }

  return reminders;
}

/**
 * Obtiene recordatorios pendientes
 */
export async function getPendingReminders(
  tenantId: string,
  beforeDate?: Date
): Promise<PostSaleReminder[]> {
  const now = beforeDate || new Date();

  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('post_sale_reminders')
    .where('status', '==', 'active')
    .where('nextReminder', '<=', now);

  query = query.orderBy('nextReminder', 'asc');

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      nextReminder: data?.nextReminder?.toDate() || new Date(),
      sentAt: data?.sentAt?.toDate(),
      createdAt: data?.createdAt?.toDate() || new Date(),
    } as PostSaleReminder;
  });
}

/**
 * Marca un recordatorio como enviado
 */
export async function markReminderAsSent(
  tenantId: string,
  reminderId: string
): Promise<void> {
  const reminder = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('post_sale_reminders')
    .doc(reminderId)
    .get();

  if (!reminder.exists) {
    throw new Error('Recordatorio no encontrado');
  }

  const data = reminder.data() as PostSaleReminder;

  // Calcular próxima fecha según frecuencia
  let nextReminder: Date;
  switch (data.frequency) {
    case 'monthly':
      nextReminder = addMonths(new Date(), 1);
      break;
    case '3_months':
      nextReminder = addMonths(new Date(), 3);
      break;
    case '5_months':
      nextReminder = addMonths(new Date(), 5);
      break;
    case '6_months':
      nextReminder = addMonths(new Date(), 6);
      break;
    default:
      // Manual - no actualizar
      return;
  }

  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('post_sale_reminders')
    .doc(reminderId)
    .update({
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      nextReminder,
    } as any);
}

/**
 * Calcula la próxima fecha de recordatorio
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

