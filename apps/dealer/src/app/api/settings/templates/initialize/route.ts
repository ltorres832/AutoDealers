import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createTemplate } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

const defaultTemplates = [
  // Email Templates
  {
    name: 'Bienvenida',
    type: 'email' as const,
    role: 'dealer' as const,
    category: 'lead',
    subject: '¡Bienvenido a $\{dealer_name\}!',
    content: `Hola $\{customer_name\},

¡Gracias por tu interés en nuestros vehículos!

Estamos emocionados de ayudarte a encontrar el vehículo perfecto para ti. Nuestro equipo se pondrá en contacto contigo pronto.

Si tienes alguna pregunta, no dudes en contactarnos.

Saludos,
$\{dealer_name\}`,
    variables: ['customer_name', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Recordatorio de Cita',
    type: 'email' as const,
    role: 'dealer' as const,
    category: 'appointment',
    subject: 'Recordatorio: Cita para ver $\{vehicle_name\}',
    content: `Hola $\{customer_name\},

Te recordamos que tienes una cita programada para ver el $\{vehicle_name\}.

📅 Fecha: $\{appointment_date\}
🕐 Hora: $\{appointment_time\}
📍 Ubicación: $\{dealer_address\}

Si necesitas reprogramar, por favor contáctanos con anticipación.

¡Esperamos verte pronto!

Saludos,
$\{dealer_name\}`,
    variables: ['customer_name', 'vehicle_name', 'appointment_date', 'appointment_time', 'dealer_address', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Seguimiento Post-Venta',
    type: 'email' as const,
    role: 'dealer' as const,
    category: 'post_sale',
    subject: 'Recordatorio: $\{reminder_type\} - $\{vehicle_name\}',
    content: `Hola $\{customer_name\},

Es momento de realizar el $\{reminder_type\} de tu $\{vehicle_name\}.

📅 Fecha recomendada: $\{recommended_date\}

Te recomendamos agendar una cita para mantener tu vehículo en las mejores condiciones.

$\{additional_info\}

¡Gracias por confiar en nosotros!

Saludos,
$\{dealer_name\}`,
    variables: ['customer_name', 'reminder_type', 'vehicle_name', 'recommended_date', 'additional_info', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Confirmación de Venta',
    type: 'email' as const,
    role: 'dealer' as const,
    category: 'sale',
    subject: '¡Gracias por tu compra! - $\{vehicle_name\}',
    content: 'Hola $\{customer_name\},\n\n¡Felicitaciones por tu nueva adquisición!\n\n🚗 Vehículo: $\{vehicle_name\}\n💰 Precio: $$\{amount\}\n📅 Fecha de compra: $\{sale_date\}\n\nGracias por confiar en {{dealer_name}}. Estamos aquí para cualquier servicio post-venta que necesites.\n\nPronto recibirás información sobre mantenimiento y servicios disponibles.\n\n¡Disfruta tu nuevo vehículo!\n\nSaludos,\n$\{seller_name\}\n{{dealer_name}}',
    variables: ['customer_name', 'vehicle_name', 'amount', 'sale_date', 'dealer_name', 'seller_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Seguimiento de Lead',
    type: 'email' as const,
    role: 'dealer' as const,
    category: 'lead',
    subject: '¿Aún estás interesado en $\{vehicle_name\}?',
    content: `Hola $\{customer_name\},

Hace unos días nos contactaste sobre el $\{vehicle_name\} y queríamos hacer un seguimiento.

¿Aún estás interesado? Tenemos disponibilidad para agendar una prueba de manejo o responder cualquier pregunta que tengas.

$\{vehicle_details\}

No dudes en contactarnos cuando gustes.

Saludos,
$\{seller_name\}
$\{dealer_name\}`,
    variables: ['customer_name', 'vehicle_name', 'vehicle_details', 'seller_name', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Confirmación de Cita por Email',
    type: 'email' as const,
    role: 'dealer' as const,
    category: 'appointment',
    subject: 'Cita Confirmada: $\{appointment_date\}',
    content: `Hola $\{customer_name\},

Tu cita ha sido confirmada exitosamente.

📅 Fecha: $\{appointment_date\}
🕐 Hora: $\{appointment_time\}
🚗 Vehículo: $\{vehicle_name\}
📍 Ubicación: $\{dealer_address\}
👤 Contacto: $\{seller_name\}

Si necesitas reprogramar o cancelar, por favor avísanos con al menos 24 horas de anticipación.

¡Esperamos verte pronto!

Saludos,
$\{seller_name\}
$\{dealer_name\}`,
    variables: ['customer_name', 'appointment_date', 'appointment_time', 'vehicle_name', 'dealer_address', 'seller_name', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Cancelación de Cita',
    type: 'email' as const,
    role: 'dealer' as const,
    category: 'appointment',
    subject: 'Cita Cancelada',
    content: `Hola $\{customer_name\},

Lamentamos informarte que tu cita programada para el $\{appointment_date\} ha sido cancelada.

$\{cancellation_reason\}

Por favor, contáctanos para reprogramar cuando te sea conveniente.

Saludos,
$\{seller_name\}
$\{dealer_name\}`,
    variables: ['customer_name', 'appointment_date', 'cancellation_reason', 'seller_name', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Nuevo Vehículo Disponible',
    type: 'email' as const,
    role: 'dealer' as const,
    category: 'inventory',
    subject: 'Nuevo vehículo disponible: $\{vehicle_name\}',
    content: `Hola $\{customer_name\},

Tenemos una excelente noticia. Acabamos de recibir un $\{vehicle_name\} que podría interesarte.

$\{vehicle_details\}

¿Te gustaría agendar una cita para verlo?

Saludos,
$\{seller_name\}
$\{dealer_name\}`,
    variables: ['customer_name', 'vehicle_name', 'vehicle_details', 'seller_name', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Precio Reducido',
    type: 'email' as const,
    role: 'dealer' as const,
    category: 'inventory',
    subject: '¡Oferta especial! Precio reducido en $\{vehicle_name\}',
    content: `Hola $\{customer_name\},

Tenemos una oferta especial para ti. El precio del $\{vehicle_name\} ha sido reducido.

💰 Precio anterior: $\{\{old_price\}\}
💰 Precio nuevo: $\{\{new_price\}\}
💰 Ahorro: $\{\{savings\}\}

Esta oferta es por tiempo limitado. ¡No te la pierdas!

$\{vehicle_details\}

Saludos,
$\{seller_name\}
$\{dealer_name\}`,
    variables: ['customer_name', 'vehicle_name', 'old_price', 'new_price', 'savings', 'vehicle_details', 'seller_name', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Solicitud de Información',
    type: 'email' as const,
    role: 'dealer' as const,
    category: 'lead',
    subject: 'Información sobre $\{vehicle_name\}',
    content: `Hola $\{customer_name\},

Gracias por tu interés en el $\{vehicle_name\}.

$\{vehicle_information\}

Si tienes alguna pregunta adicional o deseas agendar una prueba de manejo, no dudes en contactarnos.

Saludos,
$\{seller_name\}
$\{dealer_name\}`,
    variables: ['customer_name', 'vehicle_name', 'vehicle_information', 'seller_name', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Recordatorio de Mantenimiento',
    type: 'email' as const,
    role: 'dealer' as const,
    category: 'post_sale',
    subject: 'Recordatorio: Mantenimiento de $\{vehicle_name\}',
    content: `Hola $\{customer_name\},

Es momento de realizar el mantenimiento de tu $\{vehicle_name\}.

🔧 Tipo de servicio: $\{service_type\}
📅 Fecha recomendada: $\{recommended_date\}
💰 Costo estimado: $$\{estimated_cost\}

Te recomendamos agendar una cita para mantener tu vehículo en las mejores condiciones.

Saludos,
$\{dealer_name\}`,
    variables: ['customer_name', 'vehicle_name', 'service_type', 'recommended_date', 'estimated_cost', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Aniversario de Compra',
    type: 'email' as const,
    role: 'dealer' as const,
    category: 'post_sale',
    subject: '¡Feliz Aniversario! Gracias por confiar en nosotros',
    content: `Hola $\{customer_name\},

Hoy hace exactamente $\{years\} año(s) que compraste tu $\{vehicle_name\} con nosotros.

Queremos agradecerte por tu confianza y lealtad. Esperamos que tu experiencia haya sido excelente.

Si necesitas algún servicio, mantenimiento o estás buscando cambiar de vehículo, estamos aquí para ayudarte.

¡Gracias por ser parte de nuestra familia!

Saludos,
$\{dealer_name\}`,
    variables: ['customer_name', 'years', 'vehicle_name', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  // WhatsApp Templates
  {
    name: 'Bienvenida WhatsApp',
    type: 'whatsapp' as const,
    role: 'dealer' as const,
    category: 'lead',
    content: `¡Hola $\{customer_name\}! 👋

Gracias por contactarnos. Estamos aquí para ayudarte a encontrar el vehículo perfecto.

¿En qué te podemos ayudar hoy?`,
    variables: ['customer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Información de Vehículo',
    type: 'whatsapp' as const,
    role: 'dealer' as const,
    category: 'inventory',
    content: `¡Hola $\{customer_name\}! 🚗

Te envío información sobre el $\{vehicle_name\}:

💰 Precio: $$\{amount\}
📅 Año: $\{year\}
📊 Kilometraje: $\{mileage\}
🔧 Estado: $\{condition\}

¿Te gustaría agendar una prueba de manejo? 📅`,
    variables: ['customer_name', 'vehicle_name', 'amount', 'year', 'mileage', 'condition'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Confirmación de Cita',
    type: 'whatsapp' as const,
    role: 'dealer' as const,
    category: 'appointment',
    content: `¡Perfecto $\{customer_name\}! ✅

Tu cita ha sido confirmada:

📅 Fecha: $\{appointment_date\}
🕐 Hora: $\{appointment_time\}
🚗 Vehículo: $\{vehicle_name\}

Te esperamos. Si necesitas cambiar la fecha, avísanos con anticipación.`,
    variables: ['customer_name', 'appointment_date', 'appointment_time', 'vehicle_name'],
    isDefault: true,
    isEditable: true,
  },
  // SMS Templates
  {
    name: 'Recordatorio de Cita SMS',
    type: 'sms' as const,
    role: 'dealer' as const,
    category: 'appointment',
    content: `Recordatorio: Tienes cita el $\{appointment_date\} a las $\{appointment_time\} para ver el $\{vehicle_name\}. $\{dealer_name\}`,
    variables: ['appointment_date', 'appointment_time', 'vehicle_name', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Nuevo Vehículo Disponible',
    type: 'sms' as const,
    role: 'dealer' as const,
    category: 'inventory',
    content: `¡Nuevo vehículo disponible! $\{vehicle_name\} - $$\{amount\}. Llámanos para más información. $\{dealer_name\}`,
    variables: ['vehicle_name', 'amount', 'dealer_name'],
    isDefault: true,
    isEditable: true,
  },
  // Message Templates (para el CRM)
  {
    name: 'Mensaje de Seguimiento',
    type: 'message' as const,
    role: 'dealer' as const,
    category: 'follow_up',
    content: `Hola $\{customer_name\},

Queríamos hacer un seguimiento para ver si tienes alguna pregunta sobre el $\{vehicle_name\}.

Estamos aquí para ayudarte en lo que necesites.

Saludos,
$\{seller_name\}`,
    variables: ['customer_name', 'vehicle_name', 'seller_name'],
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

    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be a dealer to access this endpoint' },
        { status: 401 }
      );
    }

    // Crear todos los templates directamente en Firestore para evitar problemas
    const createdTemplates = [];
    const errors = [];

    for (const templateData of defaultTemplates) {
      try {
        // Verificar si el template ya existe para este tenant (sin índice compuesto)
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

