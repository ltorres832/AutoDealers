import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

const defaultTemplates = [
  // Email Templates
  {
    name: 'Bienvenida',
    type: 'email' as const,
    role: 'seller' as const,
    category: 'lead',
    subject: '¡Bienvenido!',
    content: `Hola {{customer_name}},

¡Gracias por tu interés en nuestros vehículos!

Estoy aquí para ayudarte a encontrar el vehículo perfecto para ti. Te contactaré pronto.

Si tienes alguna pregunta, no dudes en contactarme.

Saludos,
{{seller_name}}`,
    variables: ['customer_name', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Recordatorio de Cita',
    type: 'email' as const,
    role: 'seller' as const,
    category: 'appointment',
    subject: 'Recordatorio: Cita para ver {{vehicle_name}}',
    content: `Hola {{customer_name}},

Te recuerdo que tienes una cita programada para ver el {{vehicle_name}}.

📅 Fecha: {{appointment_date}}
🕐 Hora: {{appointment_time}}
📍 Ubicación: {{appointment_location}}

Si necesitas reprogramar, por favor contáctame con anticipación.

¡Espero verte pronto!

Saludos,
{{seller_name}}`,
    variables: ['customer_name', 'vehicle_name', 'appointment_date', 'appointment_time', 'appointment_location', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Confirmación de Venta',
    type: 'email' as const,
    role: 'seller' as const,
    category: 'sale',
    subject: '¡Gracias por tu compra! - {{vehicle_name}}',
    content: `Hola {{customer_name}},

¡Felicitaciones por tu nueva adquisición!

🚗 Vehículo: {{vehicle_name}}
💰 Precio: ${'$'}{{price}}
📅 Fecha de compra: {{sale_date}}

Gracias por confiar en mí. Estoy aquí para cualquier servicio post-venta que necesites.

¡Disfruta tu nuevo vehículo!

Saludos,
{{seller_name}}`,
    variables: ['customer_name', 'vehicle_name', 'price', 'sale_date', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Seguimiento de Lead',
    type: 'email' as const,
    role: 'seller' as const,
    category: 'lead',
    subject: '¿Aún estás interesado en {{vehicle_name}}?',
    content: `Hola {{customer_name}},

Hace unos días nos contactaste sobre el {{vehicle_name}} y quería hacer un seguimiento.

¿Aún estás interesado? Tengo disponibilidad para agendar una prueba de manejo o responder cualquier pregunta que tengas.

{{vehicle_details}}

No dudes en contactarme cuando gustes.

Saludos,
{{seller_name}}`,
    variables: ['customer_name', 'vehicle_name', 'vehicle_details', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Confirmación de Cita por Email',
    type: 'email' as const,
    role: 'seller' as const,
    category: 'appointment',
    subject: 'Cita Confirmada: {{appointment_date}}',
    content: `Hola {{customer_name}},

Tu cita ha sido confirmada exitosamente.

📅 Fecha: {{appointment_date}}
🕐 Hora: {{appointment_time}}
🚗 Vehículo: {{vehicle_name}}
📍 Ubicación: {{appointment_location}}

Si necesitas reprogramar o cancelar, por favor avísame con al menos 24 horas de anticipación.

¡Espero verte pronto!

Saludos,
{{seller_name}}`,
    variables: ['customer_name', 'appointment_date', 'appointment_time', 'vehicle_name', 'appointment_location', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Cancelación de Cita',
    type: 'email' as const,
    role: 'seller' as const,
    category: 'appointment',
    subject: 'Cita Cancelada',
    content: `Hola {{customer_name}},

Lamento informarte que tu cita programada para el {{appointment_date}} ha sido cancelada.

{{cancellation_reason}}

Por favor, contáctame para reprogramar cuando te sea conveniente.

Saludos,
{{seller_name}}`,
    variables: ['customer_name', 'appointment_date', 'cancellation_reason', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Nuevo Vehículo Disponible',
    type: 'email' as const,
    role: 'seller' as const,
    category: 'inventory',
    subject: 'Nuevo vehículo disponible: {{vehicle_name}}',
    content: `Hola {{customer_name}},

Tengo una excelente noticia. Acabo de recibir un {{vehicle_name}} que podría interesarte.

{{vehicle_details}}

¿Te gustaría agendar una cita para verlo?

Saludos,
{{seller_name}}`,
    variables: ['customer_name', 'vehicle_name', 'vehicle_details', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Precio Reducido',
    type: 'email' as const,
    role: 'seller' as const,
    category: 'inventory',
    subject: '¡Oferta especial! Precio reducido en {{vehicle_name}}',
    content: `Hola {{customer_name}},

Tengo una oferta especial para ti. El precio del {{vehicle_name}} ha sido reducido.

💰 Precio anterior: ${'$'}{{old_price}}
💰 Precio nuevo: ${'$'}{{new_price}}
💰 Ahorro: ${'$'}{{savings}}

Esta oferta es por tiempo limitado. ¡No te la pierdas!

{{vehicle_details}}

Saludos,
{{seller_name}}`,
    variables: ['customer_name', 'vehicle_name', 'old_price', 'new_price', 'savings', 'vehicle_details', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Solicitud de Información',
    type: 'email' as const,
    role: 'seller' as const,
    category: 'lead',
    subject: 'Información sobre {{vehicle_name}}',
    content: `Hola {{customer_name}},

Gracias por tu interés en el {{vehicle_name}}.

{{vehicle_information}}

Si tienes alguna pregunta adicional o deseas agendar una prueba de manejo, no dudes en contactarme.

Saludos,
{{seller_name}}`,
    variables: ['customer_name', 'vehicle_name', 'vehicle_information', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  // WhatsApp Templates
  {
    name: 'Bienvenida WhatsApp',
    type: 'whatsapp' as const,
    role: 'seller' as const,
    category: 'lead',
    content: `¡Hola {{customer_name}}! 👋

Gracias por contactarme. Estoy aquí para ayudarte a encontrar el vehículo perfecto.

¿En qué te puedo ayudar hoy?`,
    variables: ['customer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Información de Vehículo',
    type: 'whatsapp' as const,
    role: 'seller' as const,
    category: 'inventory',
    content: `¡Hola {{customer_name}}! 🚗

Te envío información sobre el {{vehicle_name}}:

💰 Precio: ${'$'}{{price}}
📅 Año: {{year}}
📊 Kilometraje: {{mileage}}
🔧 Estado: {{condition}}

¿Te gustaría agendar una prueba de manejo? 📅`,
    variables: ['customer_name', 'vehicle_name', 'price', 'year', 'mileage', 'condition'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Confirmación de Cita',
    type: 'whatsapp' as const,
    role: 'seller' as const,
    category: 'appointment',
    content: `¡Perfecto {{customer_name}}! ✅

Tu cita ha sido confirmada:

📅 Fecha: {{appointment_date}}
🕐 Hora: {{appointment_time}}
🚗 Vehículo: {{vehicle_name}}

Te espero. Si necesitas cambiar la fecha, avísame con anticipación.`,
    variables: ['customer_name', 'appointment_date', 'appointment_time', 'vehicle_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Recordatorio de Cita WhatsApp',
    type: 'whatsapp' as const,
    role: 'seller' as const,
    category: 'appointment',
    content: `Hola {{customer_name}}! 📅

Recordatorio: Tienes una cita mañana:

📅 Fecha: {{appointment_date}}
🕐 Hora: {{appointment_time}}
🚗 Vehículo: {{vehicle_name}}

¡Espero verte!`,
    variables: ['customer_name', 'appointment_date', 'appointment_time', 'vehicle_name'],
    isDefault: true,
    isEditable: true,
  },
  // SMS Templates
  {
    name: 'Recordatorio de Cita SMS',
    type: 'sms' as const,
    role: 'seller' as const,
    category: 'appointment',
    content: `Recordatorio: Tienes cita el {{appointment_date}} a las {{appointment_time}} para ver el {{vehicle_name}}. {{seller_name}}`,
    variables: ['appointment_date', 'appointment_time', 'vehicle_name', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Nuevo Vehículo Disponible',
    type: 'sms' as const,
    role: 'seller' as const,
    category: 'inventory',
    content: `¡Nuevo vehículo disponible! {{vehicle_name}} - ${'$'}{{price}}. Llámame para más información. {{seller_name}}`,
    variables: ['vehicle_name', 'price', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Confirmación de Venta SMS',
    type: 'sms' as const,
    role: 'seller' as const,
    category: 'sale',
    content: `¡Gracias por tu compra! Vehículo: {{vehicle_name}} - ${'$'}{{price}}. Pronto te contactaré. {{seller_name}}`,
    variables: ['vehicle_name', 'price', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  // Message Templates (para el CRM)
  {
    name: 'Mensaje de Seguimiento',
    type: 'message' as const,
    role: 'seller' as const,
    category: 'follow_up',
    content: `Hola {{customer_name}},

Quería hacer un seguimiento para ver si tienes alguna pregunta sobre el {{vehicle_name}}.

Estoy aquí para ayudarte en lo que necesites.

Saludos,
{{seller_name}}`,
    variables: ['customer_name', 'vehicle_name', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Mensaje de Agradecimiento',
    type: 'message' as const,
    role: 'seller' as const,
    category: 'follow_up',
    content: `Hola {{customer_name}},

Gracias por tu interés en nuestros vehículos. Espero poder ayudarte a encontrar exactamente lo que buscas.

Si tienes alguna pregunta, no dudes en contactarme.

Saludos,
{{seller_name}}`,
    variables: ['customer_name', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
];

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let auth;
    try {
      auth = await verifyAuth(request);
    } catch (authError: any) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed', details: authError?.message },
        { status: 401 }
      );
    }

    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be a seller to access this endpoint' },
        { status: 401 }
      );
    }

    // Crear todos los templates directamente en Firestore para evitar problemas
    const createdTemplates: { id: string; name: string }[] = [];
    const errors: { template: string; error: string }[] = [];

    for (const templateData of defaultTemplates) {
      try {
        // Verificar si el template ya existe para este tenant
        const allTemplatesSnapshot = await db
          .collection('templates')
          .where('tenantId', '==', auth.tenantId)
          .get();

        const existing = allTemplatesSnapshot.docs.find(
          doc => doc.data().name === templateData.name && doc.data().type === templateData.type
        );

        if (existing) {
          // Template ya existe, saltarlo
          createdTemplates.push({
            id: existing.id,
            name: templateData.name,
          });
          continue;
        }

        // Crear directamente en Firestore
        const templateRef = db.collection('templates').doc();
        const templateToCreate: any = {
          tenantId: auth.tenantId, // REQUERIDO: Agregar tenantId
          name: templateData.name,
          type: templateData.type,
          role: templateData.role,
          category: templateData.category,
          subject: templateData.subject || null,
          content: templateData.content,
          variables: templateData.variables || [],
          isDefault: templateData.isDefault !== undefined ? templateData.isDefault : true,
          isEditable: templateData.isEditable !== undefined ? templateData.isEditable : true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await templateRef.set(templateToCreate);

        createdTemplates.push({
          id: templateRef.id,
          name: templateData.name,
        });
      } catch (error: any) {
        console.error(`Error creating template ${templateData.name}:`, error);
        errors.push({ template: templateData.name, error: error.message });
      }
    }

    if (createdTemplates.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Error al crear templates',
          details: errors
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Templates inicializados exitosamente',
      count: createdTemplates.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error initializing templates:', error);

    // Asegurar que siempre devolvemos JSON
    try {
      return NextResponse.json(
        {
          error: 'Internal server error',
          details: error?.message || 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        },
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    } catch (jsonError) {
      // Si ni siquiera podemos crear JSON, devolver error básico
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }
  }
}



