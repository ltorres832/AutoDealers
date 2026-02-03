// Gestión de ventas

import { Sale } from './types';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { updateVehicleStatus } from '@autodealers/inventory';
import { createPostSaleReminders } from './post-sale';
import { createCustomerFile } from './customer-files';
import { createPendingRating } from '@autodealers/core';
import { EmailService } from '@autodealers/messaging';

const db = getFirestore();

/**
 * Crea una nueva venta
 */
export async function createSale(
  saleData: Omit<Sale, 'id' | 'createdAt'>
): Promise<Sale> {
  const docRef = db
    .collection('tenants')
    .doc(saleData.tenantId)
    .collection('sales')
    .doc();

  // Guardar todos los campos de la venta
  const saleToSave: any = {
    ...saleData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Mantener compatibilidad con el campo 'price' antiguo si no existe salePrice
  if (!saleToSave.salePrice && saleToSave.price) {
    saleToSave.salePrice = saleToSave.price;
    saleToSave.vehiclePrice = saleToSave.price;
  }

  await docRef.set(saleToSave);

  // Actualizar estado del vehículo a vendido
  await updateVehicleStatus(saleData.tenantId, saleData.vehicleId, 'sold');

  // Crear calificación pendiente y enviar email si hay información del comprador
  if (saleData.buyer && saleData.buyer.email) {
    try {
      // Obtener información del vendedor para obtener dealerId
      const sellerDoc = await db.collection('users').doc(saleData.sellerId).get();
      const sellerData = sellerDoc.exists ? sellerDoc.data() : null;
      const dealerId = sellerData?.dealerId || undefined;

      // Crear calificación pendiente
      const rating = await createPendingRating(
        saleData.tenantId,
        docRef.id,
        saleData.vehicleId,
        saleData.sellerId,
        dealerId,
        saleData.buyer.email,
        saleData.buyer.fullName
      );

      // Enviar email con encuesta
      const emailService = new EmailService(
        process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || '',
        process.env.RESEND_API_KEY ? 'resend' : 'sendgrid'
      );

      const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/survey/${rating.surveyToken}`;
      
      await emailService.sendEmail({
        tenantId: saleData.tenantId,
        channel: 'email',
        direction: 'outbound',
        from: 'noreply@autodealers.com',
        to: saleData.buyer.email,
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">¡Gracias por tu compra!</h2>
            <p>Estimado/a ${saleData.buyer.fullName},</p>
            <p>Gracias por confiar en nosotros para tu compra. Tu opinión es muy importante para nosotros.</p>
            <p>Por favor, tómate un momento para calificar tu experiencia con nuestro servicio:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${surveyUrl}" 
                 style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Calificar Servicio
              </a>
            </div>
            <p style="color: #666; font-size: 12px;">
              Este enlace expirará en 30 días.
            </p>
          </div>
        `,
        metadata: {
          subject: 'Califica tu experiencia de compra - AutoDealers',
        },
      });
    } catch (error) {
      console.error('Error creating rating or sending email:', error);
      // No fallar la venta si hay error en la calificación
    }
  }

  // Crear recordatorios post-venta si está habilitado
  if (saleData.enableReminders && saleData.selectedReminders && saleData.selectedReminders.length > 0) {
    // Si hay información del comprador, crear o actualizar el lead primero
    let customerId = saleData.leadId;
    
    if (saleData.buyer && !customerId) {
      // Crear un nuevo lead con la información del comprador
      const leadRef = db
        .collection('tenants')
        .doc(saleData.tenantId)
        .collection('leads')
        .doc();
      
      await leadRef.set({
        contact: {
          name: saleData.buyer.fullName,
          phone: saleData.buyer.phone,
          email: saleData.buyer.email,
        },
        address: saleData.buyer.address,
        status: 'sold',
        source: 'sale',
        assignedTo: saleData.sellerId,
        vehicleId: saleData.vehicleId,
        saleId: docRef.id,
        metadata: {
          driverLicenseNumber: saleData.buyer.driverLicenseNumber,
          vehiclePlate: saleData.buyer.vehiclePlate,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any);
      
      customerId = leadRef.id;
    }

    if (customerId) {
      // Obtener información del vendedor para incluir en los recordatorios
      const sellerDoc = await db.collection('users').doc(saleData.sellerId).get();
      const sellerData = sellerDoc.exists ? sellerDoc.data() : null;
      
      // Crear recordatorios con los tipos seleccionados
      await createPostSaleReminders(
        saleData.tenantId,
        docRef.id,
        customerId,
        saleData.vehicleId,
        saleData.selectedReminders as any[]
      );

      // Actualizar el lead con información del vendedor si existe
      if (sellerData && customerId) {
        await db
          .collection('tenants')
          .doc(saleData.tenantId)
          .collection('leads')
          .doc(customerId)
          .update({
            assignedTo: saleData.sellerId,
            sellerInfo: {
              id: saleData.sellerId,
              name: sellerData.name || sellerData.email,
              email: sellerData.email,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          } as any);
      }
    }
  }

  // Crear Customer File automáticamente si hay información del comprador
  if (saleData.buyer) {
    // Obtener información del vendedor
    const sellerDoc = await db.collection('users').doc(saleData.sellerId).get();
    const sellerData = sellerDoc.exists ? sellerDoc.data() : null;

    let customerId = saleData.leadId;
    
    // Si no hay leadId, buscar o crear uno
    if (!customerId) {
      // Buscar lead existente por email o teléfono
      const existingLead = await db
        .collection('tenants')
        .doc(saleData.tenantId)
        .collection('leads')
        .where('contact.email', '==', saleData.buyer.email)
        .limit(1)
        .get();

      if (!existingLead.empty) {
        customerId = existingLead.docs[0].id;
      } else {
        // Crear nuevo lead
        const leadRef = db
          .collection('tenants')
          .doc(saleData.tenantId)
          .collection('leads')
          .doc();
        
        await leadRef.set({
          contact: {
            name: saleData.buyer.fullName,
            phone: saleData.buyer.phone,
            email: saleData.buyer.email,
          },
          address: saleData.buyer.address,
          status: 'sold',
          source: 'sale',
          assignedTo: saleData.sellerId,
          vehicleId: saleData.vehicleId,
          saleId: docRef.id,
          metadata: {
            driverLicenseNumber: saleData.buyer.driverLicenseNumber,
            vehiclePlate: saleData.buyer.vehiclePlate,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        } as any);
        
        customerId = leadRef.id;
      }
    }

    // Crear Customer File
    await createCustomerFile(
      saleData.tenantId,
      docRef.id,
      customerId,
      saleData.buyer,
      saleData.vehicleId,
      saleData.sellerId,
      sellerData ? {
        id: saleData.sellerId,
        name: sellerData.name || sellerData.email,
        email: sellerData.email,
      } : undefined
    );
  }

  // Obtener información del vehículo y vendedor para la notificación
  try {
    const { getVehicleById } = await import('@autodealers/inventory');
    const vehicle = await getVehicleById(saleData.tenantId, saleData.vehicleId);
    const sellerDoc = await db.collection('users').doc(saleData.sellerId).get();
    const sellerName = sellerDoc.data()?.name || 'Vendedor';

    const vehicleInfo = vehicle 
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : 'Vehículo';

    // Notificar a gerentes y administradores sobre la venta completada (asíncrono, no bloquea)
    const { notifyManagersAndAdmins } = await import('@autodealers/core');
    await notifyManagersAndAdmins(saleData.tenantId, {
      type: 'sale_completed',
      title: 'Venta Completada',
      message: `¡Venta completada! ${vehicleInfo} vendido a ${saleData.buyer?.fullName || 'Cliente'} por $${saleData.salePrice || (saleData as any).price || 0} (Vendedor: ${sellerName}).`,
      metadata: {
        saleId: docRef.id,
        vehicleId: saleData.vehicleId,
        vehicleInfo,
        sellerId: saleData.sellerId,
        sellerName,
        buyerName: saleData.buyer?.fullName,
        salePrice: saleData.salePrice || (saleData as any).price || 0,
      },
    });
  } catch (error) {
    // No fallar si las notificaciones no están disponibles
    console.warn('Manager notification skipped for completed sale:', error);
  }

  return {
    id: docRef.id,
    ...saleData,
    createdAt: new Date(),
  };
}

/**
 * Obtiene una venta por ID
 */
export async function getSaleById(
  tenantId: string,
  saleId: string
): Promise<Sale | null> {
  const saleDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('sales')
    .doc(saleId)
    .get();

  if (!saleDoc.exists) {
    return null;
  }

  const data = saleDoc.data();
  return {
    id: saleDoc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    completedAt: data?.completedAt?.toDate(),
  } as Sale;
}

/**
 * Obtiene ventas de un vendedor
 */
export async function getSalesBySeller(
  tenantId: string,
  sellerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Sale[]> {
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('sales')
    .where('sellerId', '==', sellerId);

  if (startDate) {
    query = query.where('createdAt', '>=', startDate);
  }

  if (endDate) {
    query = query.where('createdAt', '<=', endDate);
  }

  query = query.orderBy('createdAt', 'desc');

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      completedAt: data?.completedAt?.toDate(),
    } as Sale;
  });
}

/**
 * Obtiene ventas de un tenant
 */
export async function getTenantSales(
  tenantId: string,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: Sale['status'];
  }
): Promise<Sale[]> {
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('sales');

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters?.startDate) {
    query = query.where('createdAt', '>=', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.where('createdAt', '<=', filters.endDate);
  }

  query = query.orderBy('createdAt', 'desc');

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      completedAt: data?.completedAt?.toDate(),
    } as Sale;
  });
}

/**
 * Completa una venta
 */
export async function completeSale(
  tenantId: string,
  saleId: string,
  documents?: string[]
): Promise<void> {
  const updateData: any = {
    status: 'completed',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (documents) {
    updateData.documents = documents;
  }

  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('sales')
    .doc(saleId)
    .update(updateData);
}

/**
 * Calcula comisión de una venta
 */
export function calculateCommission(
  salePrice: number,
  commissionRate: number
): number {
  return salePrice * (commissionRate / 100);
}

