import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createSale } from '@autodealers/crm';
import { getFirestore } from '@autodealers/shared';
import { createNotification } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Solo vendedores pueden crear ventas
    if (auth.role !== 'seller') {
      return NextResponse.json({ error: 'Only sellers can create sales' }, { status: 403 });
    }

    const body = await request.json();
    const {
      vehicleId,
      leadId,
      salePrice,
      vehiclePrice,
      bonus1,
      bonus2,
      rebate,
      tablilla,
      insurance,
      accessories,
      warranty,
      servicePackage,
      other,
      total,
      currency,
      vehicleCommissionRate,
      vehicleCommission,
      insuranceCommissionRate,
      insuranceCommission,
      accessoriesCommissionRate,
      accessoriesCommission,
      warrantyCommission,
      servicePackageCommission,
      totalCommission,
      paymentMethod,
      financingDetails,
      notes,
      buyer,
      tradeInValue,
      tradeInDetails,
      enableReminders,
      selectedReminders,
    } = body;

    function normalizeTradeInPayload(raw: unknown): Record<string, unknown> | undefined {
      if (!raw || typeof raw !== 'object') return undefined;
      const r = raw as Record<string, unknown>;
      const out: Record<string, unknown> = { ...r };
      if (typeof out.year === 'string' && out.year.trim()) {
        const y = parseInt(String(out.year), 10);
        out.year = Number.isFinite(y) ? y : undefined;
      }
      if (typeof out.mileage === 'string' && out.mileage.trim()) {
        const m = parseInt(String(out.mileage), 10);
        out.mileage = Number.isFinite(m) ? m : undefined;
      }
      if ('value' in out && out.value != null && out.value !== '') {
        const v = parseFloat(String(out.value));
        if (Number.isFinite(v)) out.estimatedValue = v;
        delete out.value;
      }
      if (typeof out.payoffBalance === 'string' && out.payoffBalance.trim()) {
        const p = parseFloat(String(out.payoffBalance));
        out.payoffBalance = Number.isFinite(p) ? p : undefined;
      }
      if (out.titleStatus === '') delete out.titleStatus;
      return out;
    }

    if (!vehicleId || !salePrice || !vehiclePrice || !total) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Primero, marcar el vehículo como SOLD_PENDING_VERIFICATION
    // Esto activará la Cloud Function createPurchaseIntent que verificará la venta
    const vehicleRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('vehicles')
      .doc(vehicleId);
    
    await vehicleRef.update({
      status: 'SOLD_PENDING_VERIFICATION',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const sale = await createSale({
      tenantId: auth.tenantId,
      leadId: leadId || undefined,
      vehicleId,
      sellerId: auth.userId,
      salePrice: parseFloat(salePrice),
      vehiclePrice: parseFloat(vehiclePrice),
      bonus1: bonus1 ? parseFloat(bonus1) : 0,
      bonus2: bonus2 ? parseFloat(bonus2) : 0,
      rebate: rebate ? parseFloat(rebate) : 0,
      tablilla: tablilla ? parseFloat(tablilla) : 0,
      insurance: insurance ? parseFloat(insurance) : 0,
      accessories: accessories ? parseFloat(accessories) : 0,
      warranty: warranty != null ? parseFloat(warranty) : undefined,
      servicePackage: servicePackage != null ? parseFloat(servicePackage) : undefined,
      other: other ? parseFloat(other) : 0,
      total: parseFloat(total),
      currency: currency || 'USD',
      vehicleCommissionRate: vehicleCommissionRate || undefined,
      vehicleCommission: vehicleCommission || 0,
      insuranceCommissionRate: insuranceCommissionRate || undefined,
      insuranceCommission: insuranceCommission || 0,
      accessoriesCommissionRate: accessoriesCommissionRate || undefined,
      accessoriesCommission: accessoriesCommission || 0,
      totalCommission: totalCommission || 0,
      warrantyCommission: warrantyCommission != null ? parseFloat(warrantyCommission) : undefined,
      servicePackageCommission:
        servicePackageCommission != null ? parseFloat(servicePackageCommission) : undefined,
      paymentMethod: paymentMethod || 'cash',
      financingDetails: financingDetails && typeof financingDetails === 'object' ? financingDetails : undefined,
      status: 'completed',
      documents: [],
      notes: notes || '',
      tradeInValue: tradeInValue != null ? parseFloat(String(tradeInValue)) : undefined,
      tradeInDetails: normalizeTradeInPayload(tradeInDetails) as
        | import('@autodealers/crm').Sale['tradeInDetails']
        | undefined,
      // Información del comprador
      buyer: buyer ? {
        fullName: buyer.fullName,
        phone: buyer.phone,
        email: buyer.email,
        address: buyer.address || {},
        driverLicenseNumber: buyer.driverLicenseNumber,
        vehiclePlate: buyer.vehiclePlate,
      } : undefined,
      // Recordatorios
      enableReminders: enableReminders || false,
      selectedReminders: enableReminders && selectedReminders ? selectedReminders : undefined,
    });

    // Llamar a la Cloud Function createPurchaseIntent para verificar la venta
    // Esto verificará si hay interacciones previas y generará Purchase ID si corresponde
    try {
      const purchaseIntentResponse = await fetch(
        `${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL || 'https://us-central1-autodealers-7f62e.cloudfunctions.net'}/createPurchaseIntent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicle_id: vehicleId,
            client_id: leadId || buyer?.email || buyer?.phone,
            dealer_id: auth.tenantId,
            seller_id: auth.userId,
            sale_id: sale.id,
            sale_amount: parseFloat(total),
            sale_timestamp: new Date().toISOString(),
          }),
        }
      );

      if (purchaseIntentResponse.ok) {
        const purchaseData = await purchaseIntentResponse.json();
        console.log('✅ Purchase Intent creado:', purchaseData);
        
        // Actualizar la venta con el Purchase ID si fue verificado
        if (purchaseData.purchaseId) {
          const saleRef = db
            .collection('tenants')
            .doc(auth.tenantId)
            .collection('sales')
            .doc(sale.id);
          
          await saleRef.update({
            purchaseId: purchaseData.purchaseId,
            verificationStatus: purchaseData.status, // SOLD_VERIFIED o SOLD_EXTERNAL
            fraudScore: purchaseData.fraudScore,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } else {
        console.warn('⚠️ No se pudo crear Purchase Intent, la venta se marcará como externa');
      // Si falla, marcar como SOLD_EXTERNAL (sin beneficios)
      await vehicleRef.update({
        status: 'SOLD_EXTERNAL',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      }
    } catch (error) {
      console.error('Error al crear Purchase Intent:', error);
      // Si falla, marcar como SOLD_EXTERNAL (sin beneficios)
      await vehicleRef.update({
        status: 'SOLD_EXTERNAL',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Crear notificación
    try {
      await createNotification({
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: 'sale_completed',
        title: 'Venta Completada',
        message: `Se ha registrado una nueva venta por $${total} ${currency}`,
        channels: ['system'],
        metadata: { saleId: sale.id, amount: total, currency },
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // No fallar la creación de la venta si falla la notificación
    }

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
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

    // Si es seller, solo sus ventas; si es dealer, todas las ventas del tenant
    let query = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('sales');

    if (auth.role === 'seller') {
      query = query.where('sellerId', '==', auth.userId) as any;
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    const sales = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()?.toISOString(),
        completedAt: data.completedAt?.toDate()?.toISOString(),
      };
    });

    return NextResponse.json({ sales });
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

