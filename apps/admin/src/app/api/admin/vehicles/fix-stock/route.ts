import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

async function generateStockNumber(tenantId: string, existingNumbers: string[]): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  
  let maxNumber = 0;
  existingNumbers.forEach((stockNumber) => {
    if (stockNumber && stockNumber.startsWith(`STK-${dateStr}-`)) {
      const numberPart = parseInt(stockNumber.split('-')[2] || '0');
      if (numberPart > maxNumber) {
        maxNumber = numberPart;
      }
    }
  });
  
  const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
  return `STK-${dateStr}-${nextNumber}`;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 POST /api/admin/vehicles/fix-stock - Iniciando...');
    console.log('🔍 Cookies recibidas:', request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value })));
    console.log('🔍 Authorization header:', request.headers.get('authorization') ? 'Presente' : 'Ausente');
    
    const auth = await verifyAuth(request);
    
    console.log('🔍 Resultado de verifyAuth:', auth ? { 
      userId: auth.userId, 
      email: auth.email,
      role: auth.role 
    } : 'null');
    
    if (!auth) {
      console.error('❌ Unauthorized - No auth');
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'No se pudo verificar la autenticación',
        cookiesReceived: request.cookies.getAll().map(c => c.name)
      }, { status: 401 });
    }
    
    if (auth.role !== 'admin') {
      console.error('❌ Unauthorized - Role:', auth.role);
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: `Rol requerido: admin, rol actual: ${auth.role}`
      }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { tenantId } = body;
    
    // Si no se proporciona tenantId, corregir todos los tenants
    if (!tenantId) {
      // Corregir todos los tenants
      const tenantsSnapshot = await db.collection('tenants').get();
      let totalFixed = 0;
      let totalSkipped = 0;
      
      for (const tenantDoc of tenantsSnapshot.docs) {
        const currentTenantId = tenantDoc.id;
        const vehiclesSnapshot = await db
          .collection('tenants')
          .doc(currentTenantId)
          .collection('vehicles')
          .get();
        
        const existingStockNumbers: string[] = [];
        vehiclesSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          const stockNumber = data.stockNumber || data.specifications?.stockNumber;
          if (stockNumber) {
            existingStockNumbers.push(stockNumber);
          }
        });
        
        for (const vehicleDoc of vehiclesSnapshot.docs) {
          const vehicleData = vehicleDoc.data();
          const vehicleId = vehicleDoc.id;
          
          const existingStockNumber = vehicleData.stockNumber || vehicleData.specifications?.stockNumber;
          
          if (existingStockNumber) {
            totalSkipped++;
            continue;
          }
          
          const newStockNumber = await generateStockNumber(currentTenantId, existingStockNumbers);
          existingStockNumbers.push(newStockNumber);
          
          await db
            .collection('tenants')
            .doc(currentTenantId)
            .collection('vehicles')
            .doc(vehicleId)
            .update({
              stockNumber: newStockNumber,
              specifications: {
                ...vehicleData.specifications,
                stockNumber: newStockNumber,
              },
            });
          
          totalFixed++;
        }
      }
      
      return NextResponse.json({ 
        success: true,
        fixed: totalFixed,
        skipped: totalSkipped,
        message: `Corregidos ${totalFixed} vehículos en todos los tenants`,
      });
    }

    // Obtener todos los vehículos del tenant
    const vehiclesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .get();

    // Obtener todos los stockNumbers existentes
    const existingStockNumbers: string[] = [];
    vehiclesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const stockNumber = data.stockNumber || data.specifications?.stockNumber;
      if (stockNumber) {
        existingStockNumbers.push(stockNumber);
      }
    });

    let fixed = 0;
    let skipped = 0;

    // Procesar cada vehículo
    for (const vehicleDoc of vehiclesSnapshot.docs) {
      const vehicleData = vehicleDoc.data();
      const vehicleId = vehicleDoc.id;
      
      // Verificar si ya tiene stockNumber
      const existingStockNumber = vehicleData.stockNumber || vehicleData.specifications?.stockNumber;
      
      if (existingStockNumber) {
        skipped++;
        continue;
      }
      
      // Generar nuevo stockNumber
      const newStockNumber = await generateStockNumber(tenantId, existingStockNumbers);
      existingStockNumbers.push(newStockNumber);
      
      // Actualizar el vehículo
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .doc(vehicleId)
        .update({
          stockNumber: newStockNumber,
          specifications: {
            ...vehicleData.specifications,
            stockNumber: newStockNumber,
          },
        });
      
      fixed++;
    }

    return NextResponse.json({ 
      success: true,
      fixed,
      skipped,
      total: vehiclesSnapshot.size,
    });
  } catch (error: any) {
    console.error('Error fixing stock numbers:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

