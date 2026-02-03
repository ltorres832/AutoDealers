// Scheduler para automatizaciones

import { getPendingReminders, markReminderAsSent } from '@autodealers/crm';
import { createNotification } from './notifications';
import { getFirestore } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Procesa recordatorios pendientes
 */
export async function processPendingReminders(): Promise<void> {
  // Obtener todos los tenants activos
  const tenantsSnapshot = await getDb().collection('tenants').get();

  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;
    const reminders = await getPendingReminders(tenantId);

    for (const reminder of reminders) {
      try {
        // Obtener datos del cliente
        const leadDoc = await getDb().collection('tenants')
          .doc(tenantId)
          .collection('leads')
          .doc(reminder.customerId)
          .get();

        if (!leadDoc.exists) {
          continue;
        }

        const leadData = leadDoc.data();
        const customerName = leadData?.contact?.name || 'Cliente';

        // Enviar notificaciones por los canales configurados
        for (const channel of reminder.channels) {
          await createNotification({
            tenantId,
            userId: '', // Se debe obtener del vendedor asignado
            type: 'reminder_due',
            title: `Recordatorio: ${getReminderTypeName(reminder.type)}`,
            message: `Es momento de recordar a ${customerName} sobre ${getReminderTypeName(reminder.type)}`,
            channels: [channel],
            metadata: {
              reminderId: reminder.id,
              saleId: reminder.saleId,
              customerId: reminder.customerId,
            },
          });
        }

        // Marcar como enviado
        await markReminderAsSent(tenantId, reminder.id);
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
      }
    }
  }
}

/**
 * Procesa citas con recordatorios
 */
export async function processAppointmentReminders(): Promise<void> {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

  const tenantsSnapshot = await getDb().collection('tenants').get();

  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;

    // Citas en 24 horas
    const appointments24h = await getDb().collection('tenants')
      .doc(tenantId)
      .collection('appointments')
      .where('status', 'in', ['scheduled', 'confirmed'])
      .where('scheduledAt', '>=', now)
      .where('scheduledAt', '<=', in24Hours)
      .get();

    for (const aptDoc of appointments24h.docs) {
      const apt = aptDoc.data();
      const scheduledAt = apt.scheduledAt?.toDate();

      if (!scheduledAt) continue;

      // Verificar si ya se envió recordatorio de 24h
      const has24hReminder = apt.reminders?.some(
        (r: any) => r.sentAt && r.channel && r.type === '24h'
      );

      if (!has24hReminder && scheduledAt <= in24Hours) {
        await createNotification({
          tenantId,
          userId: apt.assignedTo,
          type: 'appointment_reminder',
          title: 'Cita en 24 horas',
          message: `Tienes una cita programada mañana a las ${scheduledAt.toLocaleTimeString()}`,
          channels: ['system', 'email'],
          metadata: {
            appointmentId: aptDoc.id,
            scheduledAt: scheduledAt.toISOString(),
          },
        });

        // Agregar recordatorio a la cita
        await aptDoc.ref.update({
          reminders: admin.firestore.FieldValue.arrayUnion({
            id: admin.firestore.FieldValue.serverTimestamp().toString(),
            sentAt: new Date(),
            channel: 'system',
            status: 'sent',
            type: '24h',
          }),
        } as any);
      }
    }

    // Citas en 1 hora
    const appointments1h = await getDb().collection('tenants')
      .doc(tenantId)
      .collection('appointments')
      .where('status', 'in', ['scheduled', 'confirmed'])
      .where('scheduledAt', '>=', now)
      .where('scheduledAt', '<=', in1Hour)
      .get();

    for (const aptDoc of appointments1h.docs) {
      const apt = aptDoc.data();
      const scheduledAt = apt.scheduledAt?.toDate();

      if (!scheduledAt) continue;

      const has1hReminder = apt.reminders?.some(
        (r: any) => r.sentAt && r.channel && r.type === '1h'
      );

      if (!has1hReminder && scheduledAt <= in1Hour) {
        await createNotification({
          tenantId,
          userId: apt.assignedTo,
          type: 'appointment_reminder',
          title: 'Cita en 1 hora',
          message: `Tienes una cita en 1 hora a las ${scheduledAt.toLocaleTimeString()}`,
          channels: ['system', 'email', 'sms'],
          metadata: {
            appointmentId: aptDoc.id,
            scheduledAt: scheduledAt.toISOString(),
          },
        });

        await aptDoc.ref.update({
          reminders: admin.firestore.FieldValue.arrayUnion({
            id: admin.firestore.FieldValue.serverTimestamp().toString(),
            sentAt: new Date(),
            channel: 'system',
            status: 'sent',
            type: '1h',
          }),
        } as any);
      }
    }
  }
}

/**
 * Clasifica leads nuevos con IA
 */
export async function classifyNewLeadsWithAI(): Promise<void> {
  const { AIClassifier } = await import('@autodealers/ai');
  const { getLeads, updateLead } = await import('@autodealers/crm');

  const tenantsSnapshot = await getDb().collection('tenants').get();

  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;

    // Obtener leads nuevos sin clasificación
    const leads = await getLeads(tenantId, { status: 'new' });
    const unclassifiedLeads = leads.filter(
      (lead) => !lead.aiClassification
    );

    if (unclassifiedLeads.length === 0) continue;

    const { getOpenAIApiKey } = await import('./credentials');
    const apiKey = await getOpenAIApiKey() || '';
    const classifier = new AIClassifier(apiKey);

    for (const lead of unclassifiedLeads.slice(0, 10)) {
      // Limitar a 10 por ejecución para no exceder límites de API
      try {
        const classification = await classifier.classifyLead({
          name: lead.contact.name,
          phone: lead.contact.phone,
          source: lead.source,
          messages: lead.interactions
            .filter((i) => i.type === 'message')
            .map((i) => i.content),
          interestedVehicles: lead.interestedVehicles,
        });

        await updateLead(tenantId, lead.id, {
          aiClassification: classification,
        });

        // Notificar si es alta prioridad
        if (classification.priority === 'high') {
          await createNotification({
            tenantId,
            userId: lead.assignedTo || '',
            type: 'lead_created',
            title: 'Lead de alta prioridad',
            message: `Nuevo lead clasificado como alta prioridad: ${lead.contact.name}`,
            channels: ['system'],
            metadata: {
              leadId: lead.id,
              priority: classification.priority,
            },
          });
        }
      } catch (error) {
        console.error(`Error classifying lead ${lead.id}:`, error);
      }
    }
  }
}

/**
 * Helper para nombres de tipos de recordatorio
 */
function getReminderTypeName(type: string): string {
  const names: Record<string, string> = {
    oil_change: 'Cambio de aceite',
    filter: 'Cambio de filtro',
    tire_rotation: 'Rotación de Neumáticos',
    custom: 'Mantenimiento',
  };
  return names[type] || type;
}

/**
 * Procesa promociones activas y envía automáticamente a leads y clientes
 */
export async function processActivePromotions(): Promise<void> {
  const { getActivePromotions } = await import('./promotions');
  const { getLeads } = await import('@autodealers/crm');
  const { UnifiedMessagingService } = await import('@autodealers/messaging');
  const { getDefaultTemplate, processTemplate } = await import('./templates');

  const tenantsSnapshot = await getDb().collection('tenants').get();

  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;

    try {
      // Obtener promociones activas
      const activePromotions = await getActivePromotions(tenantId);

      for (const promotion of activePromotions) {
        // Verificar si ya se envió (usar un campo sentAt en la promoción)
        const promotionDoc = await getDb().collection('tenants')
          .doc(tenantId)
          .collection('promotions')
          .doc(promotion.id)
          .get();

        const promotionData = promotionDoc.data();
        const lastSent = promotionData?.lastSentAt?.toDate();

        // Solo enviar si no se ha enviado hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastSentDate = lastSent ? new Date(lastSent) : null;
        lastSentDate?.setHours(0, 0, 0, 0);

        if (lastSentDate && lastSentDate.getTime() === today.getTime()) {
          continue; // Ya se envió hoy
        }

        const unifiedService = new UnifiedMessagingService();

        // Enviar a leads si está configurado
        if (promotion.autoSendToLeads) {
          try {
            const leads = await getLeads(tenantId, {});
            const leadsToSend = leads.filter(
              (lead) => lead.status !== 'closed' && lead.status !== 'lost'
            );

            // Obtener template de promoción del tenant
            const { getTemplates } = await import('./templates');
            let templates = await getTemplates(undefined, 'seller');
            let template = templates.find(
              (t) => (t.type === 'whatsapp' || t.type === 'message') && t.category === 'promotion'
            ) || templates.find((t) => t.type === 'whatsapp');
            
            if (!template) {
              template = templates.find((t) => t.type === 'email' && t.category === 'promotion') 
                || templates.find((t) => t.type === 'email');
            }
            
            // Si no hay template del tenant, usar default
            if (!template) {
              template = (await getDefaultTemplate('whatsapp', 'seller')) || undefined;
              if (!template) {
                template = (await getDefaultTemplate('email', 'seller')) || undefined;
              }
            }

            for (const lead of leadsToSend) {
              let messageContent = promotion.description;

              // Usar template si existe
              if (template) {
                const processed = processTemplate(template, {
                  customer_name: lead.contact.name || 'Cliente',
                  promotion_name: promotion.name,
                  promotion_description: promotion.description,
                  discount_value: promotion.discount
                    ? promotion.discount.type === 'percentage'
                      ? `${promotion.discount.value}%`
                      : `$${promotion.discount.value}`
                    : '',
                });
                messageContent = processed.content;
              }

              // Enviar por canales configurados
              for (const channel of promotion.channels) {
                try {
                  await unifiedService.sendMessage({
                    tenantId,
                    leadId: lead.id,
                    channel: channel as any,
                    direction: 'outbound',
                    from: '',
                    to: channel === 'whatsapp' || channel === 'sms'
                      ? lead.contact.phone || ''
                      : lead.contact.email || '',
                    content: messageContent,
                    metadata: {
                      promotionId: promotion.id,
                      autoSent: true,
                    },
                  });
                } catch (error) {
                  console.error(`Error sending promotion to lead ${lead.id}:`, error);
                }
              }
            }
          } catch (error) {
            console.error(`Error processing leads for promotion ${promotion.id}:`, error);
          }
        }

        // Enviar a clientes si está configurado
        if (promotion.autoSendToCustomers) {
          try {
            const { getTenantSales } = await import('@autodealers/crm');
            const sales = await getTenantSales(tenantId);
            
            // Obtener información de clientes desde leads asociados a las ventas
            const customersMap = new Map<string, { id: string; name: string; email: string; phone: string }>();
            
            for (const sale of sales) {
              if (sale.leadId) {
                try {
                  const leadDoc = await getDb().collection('tenants')
                    .doc(tenantId)
                    .collection('leads')
                    .doc(sale.leadId)
                    .get();
                  
                  if (leadDoc.exists) {
                    const leadData = leadDoc.data();
                    if (leadData?.contact) {
                      customersMap.set(sale.leadId, {
                        id: sale.leadId,
                        name: leadData.contact.name || 'Cliente',
                        email: leadData.contact.email || '',
                        phone: leadData.contact.phone || '',
                      });
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching lead ${sale.leadId}:`, error);
                }
              }
            }
            
            const customers = Array.from(customersMap.values());

            // Obtener template de promoción del tenant
            const { getTemplates } = await import('./templates');
            let templates = await getTemplates(undefined, 'seller');
            let template = templates.find(
              (t) => (t.type === 'whatsapp' || t.type === 'message') && t.category === 'promotion'
            ) || templates.find((t) => t.type === 'whatsapp');
            
            if (!template) {
              template = templates.find((t) => t.type === 'email' && t.category === 'promotion') 
                || templates.find((t) => t.type === 'email');
            }
            
            // Si no hay template del tenant, usar default
            if (!template) {
              template = (await getDefaultTemplate('whatsapp', 'seller')) || undefined;
              if (!template) {
                template = (await getDefaultTemplate('email', 'seller')) || undefined;
              }
            }

            for (const customer of customers) {
              let messageContent = promotion.description;

              // Usar template si existe
              if (template) {
                const processed = processTemplate(template, {
                  customer_name: customer.name || 'Cliente',
                  promotion_name: promotion.name,
                  promotion_description: promotion.description,
                  discount_value: promotion.discount
                    ? promotion.discount.type === 'percentage'
                      ? `${promotion.discount.value}%`
                      : `$${promotion.discount.value}`
                    : '',
                });
                messageContent = processed.content;
              }

              // Enviar por canales configurados
              for (const channel of promotion.channels) {
                try {
                  await unifiedService.sendMessage({
                    tenantId,
                    leadId: customer.id,
                    channel: channel as any,
                    direction: 'outbound',
                    from: '',
                    to: channel === 'whatsapp' || channel === 'sms'
                      ? customer.phone || ''
                      : customer.email || '',
                    content: messageContent,
                    metadata: {
                      promotionId: promotion.id,
                      autoSent: true,
                      customerId: customer.id,
                    },
                  });
                } catch (error) {
                  console.error(`Error sending promotion to customer ${customer.id}:`, error);
                }
              }
            }
          } catch (error) {
            console.error(`Error processing customers for promotion ${promotion.id}:`, error);
          }
        }

        // Marcar como enviado
        await getDb().collection('tenants')
          .doc(tenantId)
          .collection('promotions')
          .doc(promotion.id)
          .update({
            lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
    } catch (error) {
      console.error(`Error processing promotions for tenant ${tenantId}:`, error);
    }
  }
}

/**
 * Ejecuta todas las tareas programadas
 */
export async function runScheduledTasks(): Promise<void> {
  console.log('Running scheduled tasks...');

  try {
    await processPendingReminders();
    await processAppointmentReminders();
    await classifyNewLeadsWithAI();
    await processActivePromotions();
    
    // Ejecutar campañas de seguimiento
    const { runFollowUpCampaigns } = await import('./follow-up');
    await runFollowUpCampaigns();

    console.log('Scheduled tasks completed');
  } catch (error) {
    console.error('Error running scheduled tasks:', error);
  }
}

