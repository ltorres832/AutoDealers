import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

// Función local para obtener recordatorios (fallback si no está disponible en el paquete)
async function getAllRemindersLocal(
  tenantId: string,
  filters?: {
    status?: 'active' | 'completed' | 'cancelled';
    startDate?: Date;
    endDate?: Date;
  }
) {
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('post_sale_reminders');

    try {
      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }

      // NO usar orderBy aquí para evitar necesidad de índice compuesto
      // Ordenaremos en memoria después
      const snapshot = await query.get();

    let reminders = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        nextReminder: data?.nextReminder?.toDate() || new Date(),
        sentAt: data?.sentAt?.toDate(),
        createdAt: data?.createdAt?.toDate() || new Date(),
      };
    });

    if (filters?.startDate) {
      reminders = reminders.filter((r: any) => {
        const reminderDate = r.nextReminder instanceof Date ? r.nextReminder : new Date(r.nextReminder);
        return reminderDate >= filters.startDate!;
      });
    }

    if (filters?.endDate) {
      reminders = reminders.filter((r: any) => {
        const reminderDate = r.nextReminder instanceof Date ? r.nextReminder : new Date(r.nextReminder);
        return reminderDate <= filters.endDate!;
      });
    }

    // Ordenar siempre por fecha (en memoria)
    reminders.sort((a: any, b: any) => {
      try {
        const aDate = a.nextReminder instanceof Date ? a.nextReminder : new Date(a.nextReminder);
        const bDate = b.nextReminder instanceof Date ? b.nextReminder : new Date(b.nextReminder);
        return aDate.getTime() - bDate.getTime();
      } catch (e) {
        return 0;
      }
    });

    return reminders;
  } catch (error: any) {
    console.error('Error in getAllRemindersLocal:', error);
    // Retornar array vacío en caso de error en lugar de lanzar excepción
    return [];
  }
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerId,
      vehicleId,
      type,
      customType,
      frequency,
      nextReminder,
      channels,
      saleId,
    } = body;

    // Validaciones
    if (!customerId || !vehicleId || !type || !frequency || !nextReminder || !channels || !Array.isArray(channels)) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: customerId, vehicleId, type, frequency, nextReminder, channels' },
        { status: 400 }
      );
    }

    // Crear el recordatorio
    let reminder;
    try {
      const { createReminder } = await import('@autodealers/crm');
      reminder = await createReminder({
        tenantId: auth.tenantId,
        saleId: saleId || '',
        customerId,
        vehicleId,
        type,
        customType: type === 'custom' ? customType : undefined,
        frequency,
        nextReminder: new Date(nextReminder),
        channels,
        status: 'active',
      });
    } catch (error: any) {
      console.error('Error creating reminder:', error);
      // Fallback: crear directamente en Firestore
      const docRef = db
        .collection('tenants')
        .doc(auth.tenantId)
        .collection('post_sale_reminders')
        .doc();

      await docRef.set({
        tenantId: auth.tenantId,
        saleId: saleId || '',
        customerId,
        vehicleId,
        type,
        customType: type === 'custom' ? customType : undefined,
        frequency,
        nextReminder: admin.firestore.Timestamp.fromDate(new Date(nextReminder)),
        channels,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any);

      reminder = {
        id: docRef.id,
        tenantId: auth.tenantId,
        saleId: saleId || '',
        customerId,
        vehicleId,
        type,
        customType: type === 'custom' ? customType : undefined,
        frequency,
        nextReminder: new Date(nextReminder),
        channels,
        status: 'active' as const,
        createdAt: new Date(),
      };
    }

    return NextResponse.json({ reminder, success: true });
  } catch (error: any) {
    console.error('Error creating reminder:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'active' | 'completed' | 'cancelled' | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filters: any = {};
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    let reminders: any[] = [];
    const tenantId = auth.tenantId!;
    try {
      // Intentar usar la función del paquete CRM con timeout
      const getAllRemindersPromise = (async () => {
        const { getAllReminders } = await import('@autodealers/crm');
        return await getAllReminders(tenantId, filters);
      })();
      
      // Timeout de 10 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      reminders = await Promise.race([getAllRemindersPromise, timeoutPromise]) as any[];
    } catch (error: any) {
      console.error('Error calling getAllReminders from package, using local function:', error.message);
      try {
        // Fallback a función local
        reminders = await getAllRemindersLocal(tenantId, filters);
      } catch (localError: any) {
        console.error('Error in local getAllReminders:', localError.message);
        // Si también falla, retornar array vacío en lugar de lanzar error
        reminders = [];
      }
    }

    // Enriquecer con información del cliente y vehículo (con límite de tiempo)
    const enrichedReminders = await Promise.allSettled(
      reminders.map(async (reminder) => {
        try {
          // Obtener información del lead/cliente
          const leadDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .doc(reminder.customerId)
            .get();

          const leadData = leadDoc.exists ? leadDoc.data() : null;

          // Obtener información del vehículo
          const vehicleDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .doc(reminder.vehicleId)
            .get();

          const vehicleData = vehicleDoc.exists ? vehicleDoc.data() : null;

          return {
            id: reminder.id,
            type: reminder.type,
            customType: reminder.customType,
            frequency: reminder.frequency,
            nextReminder: reminder.nextReminder instanceof Date 
              ? reminder.nextReminder.toISOString() 
              : reminder.nextReminder,
            channels: reminder.channels,
            status: reminder.status,
            sentAt: reminder.sentAt instanceof Date 
              ? reminder.sentAt.toISOString() 
              : reminder.sentAt?.toString(),
            createdAt: reminder.createdAt instanceof Date 
              ? reminder.createdAt.toISOString() 
              : reminder.createdAt.toString(),
            customer: leadData
              ? {
                  id: reminder.customerId,
                  name: leadData.contact?.name || 'Cliente desconocido',
                  phone: leadData.contact?.phone || '',
                  email: leadData.contact?.email || '',
                }
              : null,
            vehicle: vehicleData
              ? {
                  id: reminder.vehicleId,
                  name: `${vehicleData.make || ''} ${vehicleData.model || ''} ${vehicleData.year || ''}`.trim(),
                  make: vehicleData.make || '',
                  model: vehicleData.model || '',
                  year: vehicleData.year || '',
                }
              : null,
          };
        } catch (error) {
          console.error(`Error enriching reminder ${reminder.id}:`, error);
          return {
            id: reminder.id,
            type: reminder.type,
            customType: reminder.customType,
            frequency: reminder.frequency,
            nextReminder: reminder.nextReminder instanceof Date 
              ? reminder.nextReminder.toISOString() 
              : reminder.nextReminder?.toString() || new Date().toISOString(),
            channels: reminder.channels || [],
            status: reminder.status,
            sentAt: reminder.sentAt instanceof Date 
              ? reminder.sentAt.toISOString() 
              : reminder.sentAt?.toString(),
            createdAt: reminder.createdAt instanceof Date 
              ? reminder.createdAt.toISOString() 
              : reminder.createdAt?.toString() || new Date().toISOString(),
            customer: null,
            vehicle: null,
          };
        }
      })
    );

    // Procesar resultados de Promise.allSettled
    const processedReminders = enrichedReminders.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error('Error processing reminder:', result.reason);
        return null;
      }
    }).filter((r) => r !== null);

    return NextResponse.json({ reminders: processedReminders });
  } catch (error: any) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

