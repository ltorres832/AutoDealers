import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import { createLead } from '@autodealers/crm';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Webhook para recibir emails entrantes de Zoho Mail
 * Este webhook debe configurarse en Zoho Mail para recibir notificaciones
 * cuando llegue un email a cualquier cuenta corporativa
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verificar que el webhook viene de Zoho (opcional: verificar firma)
    const signature = request.headers.get('x-zoho-signature');
    // TODO: Validar firma si está configurada

    // Parsear datos del email entrante
    const {
      emailAddress, // Email corporativo que recibió el mensaje
      from, // Email del remitente
      subject, // Asunto del email
      body: emailBody, // Contenido del email
      messageId, // ID del mensaje en Zoho
      timestamp, // Fecha del email
    } = body;

    if (!emailAddress || !from) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Buscar el email corporativo en Firestore
    const emailParts = emailAddress.split('@');
    const emailAlias = emailParts[0];
    const emailDomain = emailParts[1];

    // Obtener el subdomain del dominio
    const domainParts = emailDomain.split('.');
    const subdomain = domainParts[0]; // ej: "autocity" de "autocity.autoplataforma.com"

    // Buscar tenant por subdomain
    let tenantId: string | null = null;
    const tenantsSnapshot = await db
      .collection('tenants')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();

    if (!tenantsSnapshot.empty) {
      tenantId = tenantsSnapshot.docs[0].id;
    } else {
      // Si no se encuentra por subdomain, buscar todos los emails corporativos
      // y encontrar el que coincida con el dominio completo
      const allTenantsSnapshot = await db.collection('tenants').get();
      for (const tenantDoc of allTenantsSnapshot.docs) {
        const emailSnapshot = await db
          .collection('tenants')
          .doc(tenantDoc.id)
          .collection('corporate_emails')
          .where('email', '==', emailAddress)
          .where('status', '==', 'active')
          .limit(1)
          .get();

        if (!emailSnapshot.empty) {
          tenantId = tenantDoc.id;
          break;
        }
      }
    }

    if (!tenantId) {
      console.warn(`Tenant no encontrado para email: ${emailAddress}`);
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    // Extraer información del remitente
    const fromName = from.match(/^(.+?)\s*<(.+)>$/) || [];
    const senderName = fromName[1]?.trim() || from.split('@')[0];
    const senderEmail = fromName[2] || from;

    // Extraer teléfono del cuerpo del email si está presente
    const phoneMatch = emailBody?.match(/(\+?\d{1,4}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/);
    const senderPhone = phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : '';

    // Verificar si ya existe un lead con este email o teléfono
    let existingLead = null;
    if (senderEmail) {
      const leadsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .where('contact.email', '==', senderEmail)
        .limit(1)
        .get();

      if (!leadsSnapshot.empty) {
        existingLead = leadsSnapshot.docs[0];
      }
    }

    if (!existingLead && senderPhone) {
      const leadsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .where('contact.phone', '==', senderPhone)
        .limit(1)
        .get();

      if (!leadsSnapshot.empty) {
        existingLead = leadsSnapshot.docs[0];
      }
    }

    if (existingLead) {
      // Actualizar lead existente con la interacción
      const leadData = existingLead.data();
      const interactions = leadData.interactions || [];

      interactions.push({
        type: 'email',
        channel: 'email',
        direction: 'inbound',
        content: emailBody || subject,
        subject: subject,
        from: senderEmail,
        to: emailAddress,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: 'corporate_email',
        metadata: {
          messageId,
          emailAddress,
        },
      });

      await existingLead.ref.update({
        interactions,
        lastInteractionAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Guardar mensaje en CRM
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('messages')
        .add({
          leadId: existingLead.id,
          channel: 'email',
          direction: 'inbound',
          from: senderEmail,
          to: emailAddress,
          content: emailBody || subject,
          subject: subject,
          status: 'received',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            messageId,
            emailAddress,
          },
        });

      return NextResponse.json({
        success: true,
        action: 'updated',
        leadId: existingLead.id,
      });
    } else {
      // Crear nuevo lead automáticamente
      const newLead = await createLead(
        tenantId,
        'email', // source
        {
          name: senderName,
          email: senderEmail,
          phone: senderPhone || '0000000000', // Si no hay teléfono, usar placeholder
          preferredChannel: 'email',
        },
        `Lead creado automáticamente desde email corporativo.\n\nAsunto: ${subject}\n\nContenido: ${emailBody?.substring(0, 500)}...`
      );

      // Guardar mensaje en CRM
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('messages')
        .add({
          leadId: newLead.id,
          channel: 'email',
          direction: 'inbound',
          from: senderEmail,
          to: emailAddress,
          content: emailBody || subject,
          subject: subject,
          status: 'received',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            messageId,
            emailAddress,
          },
        });

      return NextResponse.json({
        success: true,
        action: 'created',
        leadId: newLead.id,
      });
    }
  } catch (error: any) {
    console.error('Error processing Zoho email webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET para verificar el webhook (Zoho puede enviar un GET para verificar)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Zoho Email Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}

