import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

function getFirestore() {
  if (!admin.apps.length) {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase credentials are not configured');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (error: any) {
      if (error.code === 'app/duplicate-app') {
        return admin.firestore();
      }
      throw error;
    }
  }
  return admin.firestore();
}

export async function POST(request: NextRequest) {
  try {
    // Solo permitir en desarrollo o con token secreto
    const secretToken = request.headers.get('x-migration-token');
    if (process.env.NODE_ENV === 'production' && secretToken !== process.env.MIGRATION_SECRET_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const { tenantId } = await request.json();
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Obtener todos los vehículos del tenant sin bodyType
    const vehiclesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .get();

    const updates: any[] = [];
    const skipped: any[] = [];

    for (const doc of vehiclesSnapshot.docs) {
      const data = doc.data();
      const currentBodyType = data.bodyType || data.specifications?.bodyType;
      
      if (!currentBodyType || currentBodyType === '' || currentBodyType === 'undefined') {
        // Intentar inferir el bodyType desde otros campos si es posible
        // Por ahora, solo marcamos para actualización manual
        skipped.push({
          id: doc.id,
          make: data.make,
          model: data.model,
          year: data.year,
          reason: 'No tiene bodyType y no se puede inferir automáticamente',
        });
      } else {
        // Normalizar el bodyType existente
        let normalizedBodyType = String(currentBodyType).trim().toLowerCase();
        
        // Mapear variaciones
        const bodyTypeMap: Record<string, string> = {
          'pickup truck': 'pickup-truck',
          'pickup': 'pickup-truck',
          'pick-up': 'pickup-truck',
          'pick_up': 'pickup-truck',
          'plug-in hybrid': 'plug-in-hybrid',
          'plugin hybrid': 'plug-in-hybrid',
          'plug_in_hybrid': 'plug-in-hybrid',
          'plug in hybrid': 'plug-in-hybrid',
        };
        
        normalizedBodyType = bodyTypeMap[normalizedBodyType] || normalizedBodyType;
        
        // Validar que sea un ID válido
        const validIds = [
          'suv', 'sedan', 'pickup-truck', 'coupe', 'hatchback', 
          'wagon', 'convertible', 'minivan', 'van', 'luxury', 
          'crossover', 'electric', 'hybrid', 'plug-in-hybrid'
        ];
        
        if (validIds.includes(normalizedBodyType)) {
          // Actualizar el vehículo con el bodyType normalizado
          await doc.ref.update({
            bodyType: normalizedBodyType,
            'specifications.bodyType': normalizedBodyType,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          updates.push({
            id: doc.id,
            make: data.make,
            model: data.model,
            oldBodyType: currentBodyType,
            newBodyType: normalizedBodyType,
          });
        } else {
          skipped.push({
            id: doc.id,
            make: data.make,
            model: data.model,
            bodyType: currentBodyType,
            normalized: normalizedBodyType,
            reason: 'BodyType no válido o no reconocido',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      tenantId,
      totalVehicles: vehiclesSnapshot.size,
      updated: updates.length,
      skipped: skipped.length,
      updates: updates.slice(0, 10), // Primeros 10 para preview
      skippedVehicles: skipped.slice(0, 10), // Primeros 10 para preview
      message: `Actualizados ${updates.length} vehículos, ${skipped.length} necesitan actualización manual`,
    });
  } catch (error: any) {
    console.error('Error en migración:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

