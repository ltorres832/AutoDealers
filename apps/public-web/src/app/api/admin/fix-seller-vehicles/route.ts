import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint para corregir sellerId en vehículos existentes
 * Asigna sellerId basándose en el tenantId del vehículo y los sellers del tenant
 * 
 * Uso:
 * POST /api/admin/fix-seller-vehicles
 * Body: { tenantId: "xxx", sellerId?: "xxx" }
 * 
 * Si se proporciona sellerId, asigna todos los vehículos sin sellerId a ese seller
 * Si no se proporciona sellerId, asigna a cada seller los vehículos de su tenant
 */
export async function POST(request: NextRequest) {
  try {
    const db = getFirestore();
    const { tenantId, sellerId, assignAllToSeller } = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    console.log(`🔧 Fixing sellerId for vehicles in tenant ${tenantId}${sellerId ? ` for seller ${sellerId}` : ''}`);

    // Obtener todos los vehículos del tenant
    const vehiclesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .get();

    console.log(`📦 Found ${vehiclesSnapshot.size} vehicles in tenant ${tenantId}`);

    // Obtener todos los sellers del tenant
    const sellersSnapshot = await db
      .collection('users')
      .where('tenantId', '==', tenantId)
      .where('role', '==', 'seller')
      .where('status', '==', 'active')
      .get();

    const sellers = sellersSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      name: doc.data().name,
      ...doc.data(),
    }));

    console.log(`👥 Found ${sellers.length} active sellers in tenant:`, sellers.map((s: any) => ({ id: s.id, name: s.name })));

    const results = {
      totalVehicles: vehiclesSnapshot.size,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as any[],
    };

    // Si se especifica un sellerId, asignar todos los vehículos sin sellerId a ese seller
    if (sellerId) {
      console.log(`📝 Assigning all vehicles without sellerId to seller ${sellerId}`);
      
      for (const vehicleDoc of vehiclesSnapshot.docs) {
        try {
          const vehicleData = vehicleDoc.data();
          
          // Solo actualizar si no tiene sellerId o si assignAllToSeller es true
          if (assignAllToSeller || (!vehicleData.sellerId && !vehicleData.assignedTo)) {
            await vehicleDoc.ref.update({
              sellerId: sellerId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            results.updated++;
            results.details.push({
              vehicleId: vehicleDoc.id,
              make: vehicleData.make,
              model: vehicleData.model,
              year: vehicleData.year,
              action: assignAllToSeller ? 'reassigned' : 'assigned',
              sellerId: sellerId,
              previousSellerId: vehicleData.sellerId || 'none',
            });
            
            console.log(`✅ Assigned vehicle ${vehicleDoc.id} (${vehicleData.make} ${vehicleData.model}) to seller ${sellerId}`);
          } else {
            results.skipped++;
            console.log(`⏭️ Skipped vehicle ${vehicleDoc.id} - already has sellerId: ${vehicleData.sellerId}`);
          }
        } catch (error: any) {
          const errorMsg = `Error updating vehicle ${vehicleDoc.id}: ${error.message}`;
          results.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
    } else {
      // Si no se especifica sellerId, distribuir vehículos entre todos los sellers del tenant
      if (sellers.length > 0) {
        console.log(`📝 Distributing vehicles among ${sellers.length} sellers`);
        
        let sellerIndex = 0;
        for (const vehicleDoc of vehiclesSnapshot.docs) {
          try {
            const vehicleData = vehicleDoc.data();
            
            // Solo actualizar si no tiene sellerId
            if (!vehicleData.sellerId && !vehicleData.assignedTo) {
              const assignedSellerId = sellers[sellerIndex % sellers.length].id;
              const assignedSellerName = sellers[sellerIndex % sellers.length].name;
              
              await vehicleDoc.ref.update({
                sellerId: assignedSellerId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              
              results.updated++;
              results.details.push({
                vehicleId: vehicleDoc.id,
                make: vehicleData.make,
                model: vehicleData.model,
                year: vehicleData.year,
                action: 'assigned',
                sellerId: assignedSellerId,
                sellerName: assignedSellerName,
              });
              
              console.log(`✅ Assigned vehicle ${vehicleDoc.id} to seller ${assignedSellerName} (${assignedSellerId})`);
              sellerIndex++;
            } else {
              results.skipped++;
            }
          } catch (error: any) {
            const errorMsg = `Error updating vehicle ${vehicleDoc.id}: ${error.message}`;
            results.errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        }
      } else {
        return NextResponse.json(
          { error: 'No hay sellers activos en el tenant' },
          { status: 400 }
        );
      }
    }

    console.log(`✅ Fix completed: ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Se actualizaron ${results.updated} vehículos`,
      results,
    });
  } catch (error: any) {
    console.error('❌ Error fixing seller vehicles:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

