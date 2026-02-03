export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createTemplate, getTemplates } from '@autodealers/core';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';

/**
 * Fuerza la creación de todos los templates por defecto
 * (ignora si ya existen)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { createTemplate, getTemplates } = await import('@autodealers/core');

    const defaultTemplates = [
      // EMAIL TEMPLATES
      {
        name: 'Suscripción Creada - Email',
        type: 'email',
        event: 'subscription_created',
        subject: '¡Bienvenido a {{membershipName}}!',
        content: `Hola {{userName}},\n\n¡Bienvenido a AutoDealers!\n\nTu suscripción a {{membershipName}} ha sido activada exitosamente.\n\nPeríodo: {{periodStart}} - {{periodEnd}}\nMonto: $\${amount} {{currency}}\n\nEstamos emocionados de tenerte con nosotros. Si tienes alguna pregunta, no dudes en contactarnos.\n\nEquipo AutoDealers`,
        variables: ['userName', 'membershipName', 'periodStart', 'periodEnd', 'amount', 'currency'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Pago Exitoso - Email',
        type: 'email',
        event: 'payment_success',
        subject: 'Pago procesado exitosamente - {{membershipName}}',
        content: `Hola {{userName}},\n\nTu pago de $\${amount} {{currency}} para la membresía {{membershipName}} ha sido procesado exitosamente.\n\nPeríodo: {{periodStart}} - {{periodEnd}}\n\nGracias por confiar en nosotros.\n\nEquipo AutoDealers`,
        variables: ['userName', 'amount', 'currency', 'membershipName', 'periodStart', 'periodEnd'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Pago Fallido - Email',
        type: 'email',
        event: 'payment_failed',
        subject: 'Pago fallido - Acción requerida',
        content: `Hola {{userName}},\n\nNo pudimos procesar el pago de $\${amount} {{currency}} para tu membresía {{membershipName}}.\n\nPor favor, actualiza tu método de pago para evitar la suspensión de tu cuenta.\n\nFecha límite: {{deadline}}\n\nPuedes actualizar tu método de pago desde tu panel de control.\n\nEquipo AutoDealers`,
        variables: ['userName', 'amount', 'currency', 'membershipName', 'deadline'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Recordatorio de Pago 3 Días - Email',
        type: 'email',
        event: 'payment_reminder_3days',
        subject: 'Recordatorio: Tu pago vence en {{days}} días',
        content: `Hola {{userName}},\n\nEste es un recordatorio de que tu pago de $\${amount} {{currency}} para {{membershipName}} vence en {{days}} días.\n\nPor favor, asegúrate de tener fondos suficientes en tu método de pago para evitar la suspensión de tu cuenta.\n\nEquipo AutoDealers`,
        variables: ['userName', 'amount', 'currency', 'membershipName', 'days'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Recordatorio de Pago 5 Días - Email',
        type: 'email',
        event: 'payment_reminder_5days',
        subject: 'URGENTE: Tu pago vence en {{days}} días',
        content: `Hola {{userName}},\n\nTu pago de $\${amount} {{currency}} para {{membershipName}} vence en {{days}} días.\n\nEs importante que actualices tu método de pago ahora para evitar la suspensión de tu cuenta.\n\nSi no se procesa el pago, tu cuenta será suspendida automáticamente.\n\nEquipo AutoDealers`,
        variables: ['userName', 'amount', 'currency', 'membershipName', 'days'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Cuenta Suspendida - Email',
        type: 'email',
        event: 'account_suspended',
        subject: 'Tu cuenta ha sido suspendida',
        content: `Hola {{userName}},\n\nTu cuenta ha sido suspendida debido a falta de pago.\n\nPara reactivar tu cuenta, por favor realiza el pago pendiente de $\${amount} {{currency}}.\n\nUna vez procesado el pago, tu cuenta será reactivada automáticamente.\n\nPuedes realizar el pago desde tu panel de control.\n\nEquipo AutoDealers`,
        variables: ['userName', 'amount', 'currency'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Cuenta Reactivada - Email',
        type: 'email',
        event: 'account_reactivated',
        subject: '¡Tu cuenta ha sido reactivada!',
        content: `Hola {{userName}},\n\n¡Excelente noticia! Tu cuenta ha sido reactivada exitosamente.\n\nTu pago de $\${amount} {{currency}} ha sido procesado y tu suscripción a {{membershipName}} está activa nuevamente.\n\nPeríodo: {{periodStart}} - {{periodEnd}}\n\nGracias por confiar en nosotros.\n\nEquipo AutoDealers`,
        variables: ['userName', 'amount', 'currency', 'membershipName', 'periodStart', 'periodEnd'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Suscripción Cancelada - Email',
        type: 'email',
        event: 'subscription_cancelled',
        subject: 'Tu suscripción ha sido cancelada',
        content: `Hola {{userName}},\n\nTu suscripción a {{membershipName}} ha sido cancelada.\n\nTu acceso continuará hasta el final del período actual: {{periodEnd}}.\n\nSi cambias de opinión, puedes reactivar tu suscripción en cualquier momento desde tu panel de control.\n\nGracias por haber sido parte de AutoDealers.\n\nEquipo AutoDealers`,
        variables: ['userName', 'membershipName', 'periodEnd'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Prueba Terminando - Email',
        type: 'email',
        event: 'trial_ending',
        subject: 'Tu período de prueba está por terminar',
        content: `Hola {{userName}},\n\nTu período de prueba de {{membershipName}} está por terminar.\n\nPara continuar disfrutando de todos los beneficios, asegúrate de tener un método de pago configurado.\n\nEl período de prueba termina el: {{periodEnd}}\n\nEquipo AutoDealers`,
        variables: ['userName', 'membershipName', 'periodEnd'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Factura Generada - Email',
        type: 'email',
        event: 'invoice_generated',
        subject: 'Nueva factura disponible - {{membershipName}}',
        content: `Hola {{userName}},\n\nSe ha generado una nueva factura para tu suscripción a {{membershipName}}.\n\nMonto: $\${amount} {{currency}}\nPeríodo: {{periodStart}} - {{periodEnd}}\n\nLa factura se procesará automáticamente según tu método de pago configurado.\n\nEquipo AutoDealers`,
        variables: ['userName', 'membershipName', 'amount', 'currency', 'periodStart', 'periodEnd'],
        isActive: true,
        isDefault: true,
      },
      
      // SMS TEMPLATES
      {
        name: 'Pago Exitoso - SMS',
        type: 'sms',
        event: 'payment_success',
        content: `Hola {{userName}}, tu pago de $\${amount} para {{membershipName}} fue procesado exitosamente. Gracias! - AutoDealers`,
        variables: ['userName', 'amount', 'membershipName'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Pago Fallido - SMS',
        type: 'sms',
        event: 'payment_failed',
        content: `Hola {{userName}}, no pudimos procesar tu pago de $\${amount}. Actualiza tu método de pago para evitar suspensión. - AutoDealers`,
        variables: ['userName', 'amount'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Recordatorio 3 Días - SMS',
        type: 'sms',
        event: 'payment_reminder_3days',
        content: `Hola {{userName}}, tu pago de $\${amount} vence en {{days}} días. Actualiza tu método de pago para evitar suspensión. - AutoDealers`,
        variables: ['userName', 'amount', 'days'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Recordatorio 5 Días - SMS',
        type: 'sms',
        event: 'payment_reminder_5days',
        content: `URGENTE {{userName}}: Tu pago de $\${amount} vence en {{days}} días. Actualiza tu método de pago ahora. - AutoDealers`,
        variables: ['userName', 'amount', 'days'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Cuenta Suspendida - SMS',
        type: 'sms',
        event: 'account_suspended',
        content: `Hola {{userName}}, tu cuenta fue suspendida por falta de pago. Realiza el pago de $\${amount} para reactivar. - AutoDealers`,
        variables: ['userName', 'amount'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Cuenta Reactivada - SMS',
        type: 'sms',
        event: 'account_reactivated',
        content: `Hola {{userName}}, tu cuenta ha sido reactivada exitosamente. Tu pago fue procesado. Gracias! - AutoDealers`,
        variables: ['userName'],
        isActive: true,
        isDefault: true,
      },
      
      // WHATSAPP TEMPLATES
      {
        name: 'Pago Exitoso - WhatsApp',
        type: 'whatsapp',
        event: 'payment_success',
        content: `Hola {{userName}} 👋\n\n✅ Tu pago de *$\${amount} {{currency}}* para {{membershipName}} ha sido procesado exitosamente.\n\nPeríodo: {{periodStart}} - {{periodEnd}}\n\nGracias por confiar en nosotros!\n\nEquipo AutoDealers`,
        variables: ['userName', 'amount', 'currency', 'membershipName', 'periodStart', 'periodEnd'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Pago Fallido - WhatsApp',
        type: 'whatsapp',
        event: 'payment_failed',
        content: `Hola {{userName}} ⚠️\n\nNo pudimos procesar tu pago de *$\${amount} {{currency}}* para {{membershipName}}.\n\nPor favor, actualiza tu método de pago para evitar la suspensión de tu cuenta.\n\nEquipo AutoDealers`,
        variables: ['userName', 'amount', 'currency', 'membershipName'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Recordatorio 3 Días - WhatsApp',
        type: 'whatsapp',
        event: 'payment_reminder_3days',
        content: `Hola {{userName}} 👋\n\nRecordatorio: Tu pago de *$\${amount} {{currency}}* para {{membershipName}} vence en *{{days}} días*.\n\nAsegúrate de tener fondos suficientes en tu método de pago.\n\nEquipo AutoDealers`,
        variables: ['userName', 'amount', 'currency', 'membershipName', 'days'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Recordatorio 5 Días - WhatsApp',
        type: 'whatsapp',
        event: 'payment_reminder_5days',
        content: `Hola {{userName}} ⚠️\n\n*URGENTE*: Tu pago de *$\${amount} {{currency}}* para {{membershipName}} vence en *{{days}} días*.\n\nActualiza tu método de pago ahora para evitar la suspensión de tu cuenta.\n\nEquipo AutoDealers`,
        variables: ['userName', 'amount', 'currency', 'membershipName', 'days'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Cuenta Suspendida - WhatsApp',
        type: 'whatsapp',
        event: 'account_suspended',
        content: `Hola {{userName}} ⛔\n\nTu cuenta ha sido suspendida debido a falta de pago.\n\nPara reactivar, realiza el pago pendiente de *$\${amount} {{currency}}*.\n\nUna vez procesado, tu cuenta será reactivada automáticamente.\n\nEquipo AutoDealers`,
        variables: ['userName', 'amount', 'currency'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Cuenta Reactivada - WhatsApp',
        type: 'whatsapp',
        event: 'account_reactivated',
        content: `Hola {{userName}} 🎉\n\n¡Excelente noticia! Tu cuenta ha sido reactivada exitosamente.\n\nTu pago de *$\${amount} {{currency}}* fue procesado y tu suscripción a {{membershipName}} está activa nuevamente.\n\nGracias por confiar en nosotros!\n\nEquipo AutoDealers`,
        variables: ['userName', 'amount', 'currency', 'membershipName'],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Suscripción Creada - WhatsApp',
        type: 'whatsapp',
        event: 'subscription_created',
        content: `Hola {{userName}} 👋\n\n¡Bienvenido a AutoDealers!\n\nTu suscripción a *{{membershipName}}* ha sido activada exitosamente.\n\nPeríodo: {{periodStart}} - {{periodEnd}}\nMonto: *$\${amount} {{currency}}*\n\nEstamos emocionados de tenerte con nosotros!\n\nEquipo AutoDealers`,
        variables: ['userName', 'membershipName', 'periodStart', 'periodEnd', 'amount', 'currency'],
        isActive: true,
        isDefault: true,
      },
    ];

    let created = 0;
    let errors = 0;
    const errorsList: string[] = [];

    // Crear todos los templates usando la función del core
    for (const template of defaultTemplates) {
      try {
        // Preparar datos del template (sin campos undefined)
        const templateData: any = {
          name: template.name,
          type: template.type as any,
          event: template.event as any,
          content: template.content,
          variables: template.variables,
          isActive: template.isActive,
          isDefault: template.isDefault,
        };
        
        // Solo agregar subject si existe (solo para emails)
        if (template.subject) {
          templateData.subject = template.subject;
        }
        
        const result = await createTemplate(
          templateData,
          auth.userId || 'admin'
        );
        created++;
        console.log(`✓ Template creado: ${template.name} (ID: ${result.id})`);
      } catch (error: any) {
        errors++;
        const errorMsg = `Error creando ${template.name}: ${error?.message || error?.toString() || String(error)}`;
        errorsList.push(errorMsg);
        console.error(`✗ ${errorMsg}`, error);
        // Log completo del error para debugging
        if (error?.stack) {
          console.error('Stack trace:', error.stack);
        }
      }
    }

    // Obtener total de templates
    let total = 0;
    try {
      const allTemplates = await getTemplates({ isActive: true });
      total = allTemplates.length;
    } catch (error: any) {
      console.error('Error obteniendo templates:', error);
      // Continuar con total = 0 si falla
    }

    const responseData = {
      success: true,
      message: `Templates procesados: ${created} creados, ${errors} errores. Total de templates activos: ${total}`,
      created,
      errors,
      total,
      errorsList: errorsList.length > 0 ? errorsList : undefined,
    };

    console.log('Respuesta final:', JSON.stringify(responseData, null, 2));

    return createSuccessResponse(responseData, 200);
  } catch (error: any) {
    console.error('Error en force-init:', error);
    return createErrorResponse(error, 500);
  }
}

