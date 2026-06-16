// Suspensión automática de emails corporativos cuando expira la membresía

import { getFirestore } from '@autodealers/core';
import { suspendCorporateEmail, getCorporateEmails } from '@autodealers/crm';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Suspende todos los emails corporativos de un tenant cuando expira su membresía
 */
export async function suspendTenantCorporateEmails(tenantId: string): Promise<void> {
  try {
    const emails = await getCorporateEmails(undefined, tenantId);
    const activeEmails = emails.filter((e) => e.status === 'active');

    for (const email of activeEmails) {
      try {
        await suspendCorporateEmail(email.id, tenantId);
        console.log(`✅ Email corporativo suspendido: ${email.email}`);
      } catch (error) {
        console.error(`❌ Error al suspender email ${email.email}:`, error);
        // Continuar con los demás emails aunque falle uno
      }
    }
  } catch (error) {
    console.error(`Error suspending corporate emails for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Reactiva los emails corporativos de un tenant cuando se renueva la membresía
 */
export async function reactivateTenantCorporateEmails(tenantId: string): Promise<void> {
  try {
    const emails = await getCorporateEmails(undefined, tenantId);
    const suspendedEmails = emails.filter((e) => e.status === 'suspended');

    // Importar aquí para evitar dependencia circular
    const { activateCorporateEmail } = await import('@autodealers/crm');

    for (const email of suspendedEmails) {
      try {
        await activateCorporateEmail(email.id, tenantId);
        console.log(`✅ Email corporativo reactivado: ${email.email}`);
      } catch (error) {
        console.error(`❌ Error al reactivar email ${email.email}:`, error);
        // Continuar con los demás emails aunque falle uno
      }
    }
  } catch (error) {
    console.error(`Error reactivating corporate emails for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Verifica y suspende emails corporativos cuando expira una suscripción
 * Esta función debe llamarse cuando el estado de la suscripción cambia a 'suspended' o 'expired'
 */
export async function checkAndSuspendEmailsOnSubscriptionChange(
  subscriptionId: string,
  newStatus: string
): Promise<void> {
  try {
    const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();

    if (!subscriptionDoc.exists) {
      console.warn(`Subscription ${subscriptionId} not found`);
      return;
    }

    const subscription = subscriptionDoc.data();
    const tenantId = subscription?.tenantId;

    if (!tenantId) {
      console.warn(`No tenantId found for subscription ${subscriptionId}`);
      return;
    }

    // Si la suscripción está suspendida, expirada o cancelada, suspender emails
    if (newStatus === 'suspended' || newStatus === 'past_due' || newStatus === 'cancelled') {
      await suspendTenantCorporateEmails(tenantId);
      console.log(`✅ Emails corporativos suspendidos para tenant ${tenantId} (suscripción: ${newStatus})`);
    }
    // Si la suscripción se reactiva, reactivar emails
    else if (newStatus === 'active') {
      await reactivateTenantCorporateEmails(tenantId);
      console.log(`✅ Emails corporativos reactivados para tenant ${tenantId} (suscripción: ${newStatus})`);
    }
  } catch (error) {
    console.error(`Error checking email suspension for subscription ${subscriptionId}:`, error);
    // No lanzar error para no interrumpir el flujo principal
  }
}



