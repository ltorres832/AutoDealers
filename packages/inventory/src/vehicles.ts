// Gestión de vehículos

import { Vehicle, VehicleFilters, VehicleStatus } from './types';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

/**
 * Genera un número de stock único para un vehículo
 * Formato: STK-YYYYMMDD-XXXX (donde XXXX es un número secuencial)
 */
async function generateStockNumber(tenantId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  
  // Buscar el último número de stock del día para este tenant
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  try {
    const vehiclesSnapshot = await getDb()
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .where('stockNumber', '>=', `STK-${dateStr}-0001`)
      .where('stockNumber', '<=', `STK-${dateStr}-9999`)
      .get();
    
    // Encontrar el número más alto del día
    let maxNumber = 0;
    vehiclesSnapshot.docs.forEach((doc: any) => {
      const stockNumber = doc.data()?.stockNumber;
      if (stockNumber && stockNumber.startsWith(`STK-${dateStr}-`)) {
        const numberPart = parseInt(stockNumber.split('-')[2] || '0');
        if (numberPart > maxNumber) {
          maxNumber = numberPart;
        }
      }
    });
    
    // Generar nuevo número (incrementar en 1)
    const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
    return `STK-${dateStr}-${nextNumber}`;
  } catch (error) {
    // Si hay error, usar timestamp como fallback
    console.warn('⚠️ Error generando número de stock secuencial, usando timestamp:', error);
    const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos del timestamp
    return `STK-${dateStr}-${timestamp}`;
  }
}

/**
 * Crea un nuevo vehículo
 */
export async function createVehicle(
  tenantId: string,
  vehicleData: Omit<Vehicle, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'stockNumber'>,
  sellerId?: string // ID del seller que crea el vehículo (se asigna automáticamente si se proporciona)
): Promise<Vehicle> {
  const docRef = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('vehicles')
    .doc();

  // SIEMPRE generar número de stock automáticamente si no se proporciona uno válido
  // Verificar tanto en el nivel superior como en specifications
  let stockNumber = (vehicleData as any).stockNumber || (vehicleData as any).specifications?.stockNumber;
  
  // Si está vacío, undefined, o no es válido, generar uno nuevo
  if (!stockNumber || (typeof stockNumber === 'string' && stockNumber.trim() === '')) {
    console.log('📦 Generando número de stock automáticamente para tenant:', tenantId);
    try {
      stockNumber = await generateStockNumber(tenantId);
      console.log('✅ Número de stock generado automáticamente:', stockNumber);
    } catch (error: any) {
      console.error('❌ Error generando stockNumber:', error.message);
      // Fallback: usar timestamp
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const timestamp = Date.now().toString().slice(-6);
      stockNumber = `STK-${dateStr}-${timestamp}`;
      console.log('⚠️ Usando fallback:', stockNumber);
    }
  } else {
    console.log('📦 Usando stockNumber proporcionado:', stockNumber);
  }
  
  // Asegurar que siempre tengamos un stockNumber válido (doble verificación)
  if (!stockNumber || (typeof stockNumber === 'string' && stockNumber.trim() === '')) {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const timestamp = Date.now().toString().slice(-6);
    stockNumber = `STK-${dateStr}-${timestamp}`;
    console.log('⚠️ Generando stockNumber de emergencia (doble verificación):', stockNumber);
  }

  // Si stockNumber está en specifications, moverlo al nivel superior
  // También asegurar que bodyType esté en ambos lugares para compatibilidad
  let bodyType = (vehicleData as any).bodyType || (vehicleData as any).specifications?.bodyType;
  
  // Normalizar bodyType: convertir a string, quitar espacios, convertir a minúsculas
  // Solo guardar si tiene un valor válido (no vacío, no undefined, no null)
  if (bodyType) {
    const originalBodyType = String(bodyType).trim();
    if (originalBodyType !== '' && originalBodyType !== 'undefined' && originalBodyType !== 'null') {
      bodyType = originalBodyType.toLowerCase();
    } else {
      bodyType = undefined;
    }
  } else {
    bodyType = undefined;
  }
  
  // Preparar datos finales
  const finalVehicleData: any = {
    ...vehicleData,
    stockNumber,
  };

  // Asignar sellerId automáticamente si se proporciona y no está en vehicleData
  if (sellerId && !finalVehicleData.sellerId && !finalVehicleData.assignedTo) {
    finalVehicleData.sellerId = sellerId;
    console.log(`👤 Asignando sellerId automáticamente: ${sellerId}`);
  }

  // Si vehicleData ya tiene sellerId o assignedTo, mantenerlo
  if (finalVehicleData.sellerId) {
    console.log(`✅ Vehículo tiene sellerId: ${finalVehicleData.sellerId}`);
  }
  if (finalVehicleData.assignedTo) {
    console.log(`✅ Vehículo tiene assignedTo: ${finalVehicleData.assignedTo}`);
  }
  
  // Solo incluir bodyType si tiene un valor válido
  if (bodyType) {
    finalVehicleData.bodyType = bodyType;
  }
  
  // Preparar specifications
  finalVehicleData.specifications = {
    ...vehicleData.specifications,
    stockNumber, // También guardarlo en specifications para compatibilidad
  };
  
  // Solo incluir bodyType en specifications si tiene un valor válido
  if (bodyType) {
    finalVehicleData.specifications.bodyType = bodyType;
  }

  console.log('💾 Guardando vehículo en Firestore:', {
    vehicleId: docRef.id,
    tenantId,
    stockNumber,
    bodyType: bodyType || 'NO DEFINIDO',
    bodyTypeSource: (vehicleData as any).bodyType ? 'nivel superior' : (vehicleData as any).specifications?.bodyType ? 'specifications' : 'ninguno',
    bodyTypeOriginal: (vehicleData as any).bodyType || (vehicleData as any).specifications?.bodyType || 'ninguno',
    willSaveBodyType: !!bodyType,
    finalVehicleDataBodyType: finalVehicleData.bodyType,
    finalVehicleDataSpecsBodyType: finalVehicleData.specifications?.bodyType,
    finalVehicleDataSpecs: finalVehicleData.specifications,
    photosCount: finalVehicleData.photos?.length || 0,
    hasPhotos: !!(finalVehicleData.photos && finalVehicleData.photos.length > 0),
  });

  // Asegurar que el vehículo tenga status 'available' por defecto si no se especifica
  const vehicleStatus = finalVehicleData.status || 'available';
  
  const dataToSave = {
    tenantId,
    ...finalVehicleData,
    status: vehicleStatus,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  console.log('💾 Datos que se guardarán en Firestore:', {
    vehicleId: docRef.id,
    tenantId,
    sellerId: dataToSave.sellerId || 'NO ASIGNADO',
    assignedTo: dataToSave.assignedTo || 'NO ASIGNADO',
    bodyType: dataToSave.bodyType || 'NO DEFINIDO',
    specificationsBodyType: dataToSave.specifications?.bodyType || 'NO DEFINIDO',
    status: dataToSave.status,
    specificationsKeys: dataToSave.specifications ? Object.keys(dataToSave.specifications) : [],
  });
  
  await docRef.set(dataToSave as any);
  
  // Verificar que se guardó correctamente
  const savedDoc = await docRef.get();
  const savedData = savedDoc.data();
  console.log('✅ Vehículo guardado exitosamente en Firestore:', {
    vehicleId: docRef.id,
    stockNumber,
    sellerIdGuardado: savedData?.sellerId || 'NO GUARDADO',
    assignedToGuardado: savedData?.assignedTo || 'NO GUARDADO',
    bodyTypeGuardado: savedData?.bodyType || 'NO GUARDADO',
    specificationsBodyTypeGuardado: savedData?.specifications?.bodyType || 'NO GUARDADO',
    statusGuardado: savedData?.status,
  });

  return {
    id: docRef.id,
    tenantId,
    ...finalVehicleData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene un vehículo por ID
 */
export async function getVehicleById(
  tenantId: string,
  vehicleId: string
): Promise<Vehicle | null> {
  const vehicleDoc = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('vehicles')
    .doc(vehicleId)
    .get();

  if (!vehicleDoc.exists) {
    return null;
  }

  const data = vehicleDoc.data();
  return {
    id: vehicleDoc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
    soldAt: data?.soldAt?.toDate(),
  } as Vehicle;
}

/**
 * Obtiene vehículos con filtros
 */
export async function getVehicles(
  tenantId: string,
  filters?: VehicleFilters
): Promise<Vehicle[]> {
  console.log(`   📦 getVehicles() llamado con filtros:`, JSON.stringify(filters));
  
  let query: admin.firestore.Query = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('vehicles');

  if (filters?.status) {
    console.log(`   🔎 Agregando filtro: status == '${filters.status}'`);
    query = query.where('status', '==', filters.status);
  }

  if (filters?.make) {
    query = query.where('make', '==', filters.make);
  }

  if (filters?.model) {
    query = query.where('model', '==', filters.model);
  }

  if (filters?.minYear) {
    query = query.where('year', '>=', filters.minYear);
  }

  if (filters?.maxYear) {
    query = query.where('year', '<=', filters.maxYear);
  }

  if (filters?.minPrice) {
    query = query.where('price', '>=', filters.minPrice);
  }

  if (filters?.maxPrice) {
    query = query.where('price', '<=', filters.maxPrice);
  }

  if (filters?.condition) {
    query = query.where('condition', '==', filters.condition);
  }

  // Intentar ordenar por createdAt, pero si falla por falta de índice, obtener sin orderBy
  query = query.orderBy('createdAt', 'desc');

  let snapshot;
  let vehicles: Vehicle[];
  
  try {
    snapshot = await query.get();
    console.log(`   ✅ Consulta exitosa: ${snapshot.docs.length} documentos`);
    vehicles = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        soldAt: data.soldAt?.toDate ? data.soldAt.toDate() : data.soldAt,
      } as Vehicle;
    });
  } catch (queryError: any) {
    console.log(`   ❌ Consulta falló:`, queryError.message);
    // Si la consulta falla por falta de índice, intentar sin orderBy
    const isIndexError = queryError.code === 9 || 
                         queryError.message?.includes('index') || 
                         queryError.details?.includes('index') ||
                         queryError.message?.includes('FAILED_PRECONDITION');
    
    if (isIndexError) {
      console.warn(`⚠️ Consulta falló por falta de índice compuesto para tenant ${tenantId}, reintentando sin orderBy...`);
      
      try {
        // Reconstruir la consulta sin orderBy
        let fallbackQuery: admin.firestore.Query = getDb()
          .collection('tenants')
          .doc(tenantId)
          .collection('vehicles');
        
        if (filters?.status) {
          fallbackQuery = fallbackQuery.where('status', '==', filters.status);
        }
        if (filters?.make) {
          fallbackQuery = fallbackQuery.where('make', '==', filters.make);
        }
        if (filters?.model) {
          fallbackQuery = fallbackQuery.where('model', '==', filters.model);
        }
        if (filters?.minYear) {
          fallbackQuery = fallbackQuery.where('year', '>=', filters.minYear);
        }
        if (filters?.maxYear) {
          fallbackQuery = fallbackQuery.where('year', '<=', filters.maxYear);
        }
        if (filters?.minPrice) {
          fallbackQuery = fallbackQuery.where('price', '>=', filters.minPrice);
        }
        if (filters?.maxPrice) {
          fallbackQuery = fallbackQuery.where('price', '<=', filters.maxPrice);
        }
        if (filters?.condition) {
          fallbackQuery = fallbackQuery.where('condition', '==', filters.condition);
        }
        
        // Obtener sin orderBy
        snapshot = await fallbackQuery.get();
        console.log(`   ✅ Fallback exitoso: ${snapshot.docs.length} documentos`);
        vehicles = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
            soldAt: data.soldAt?.toDate ? data.soldAt.toDate() : data.soldAt,
          } as Vehicle;
        });
      } catch (fallbackError: any) {
        // Si el fallback también falla, retornar array vacío en lugar de lanzar error
        console.error(`   ❌ Fallback también falló para tenant ${tenantId}:`, fallbackError.message);
        vehicles = [];
      }
    } else {
      // Si no es error de índice, lanzar el error original
      throw queryError;
    }
  }
  
  // Ordenar en memoria por createdAt (más recientes primero)
  vehicles = vehicles.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
  
  // Filtro de búsqueda de texto (si existe)
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    vehicles = vehicles.filter(
      (v) =>
        v.make.toLowerCase().includes(searchLower) ||
        v.model.toLowerCase().includes(searchLower) ||
        (v.description && v.description.toLowerCase().includes(searchLower))
    );
  }

  // Limitar resultados para evitar respuestas muy grandes (máximo 100 por tenant)
  const maxResults = filters?.limit || 100;
  vehicles = vehicles.slice(0, maxResults);

  console.log(`   🎁 getVehicles() retorna: ${vehicles.length} vehículos`);
  return vehicles;
}

/**
 * Actualiza un vehículo
 */
export async function updateVehicle(
  tenantId: string,
  vehicleId: string,
  updates: Partial<Vehicle>
): Promise<void> {
  console.log('🔄 updateVehicle llamado:', { tenantId, vehicleId, updates });
  
  // Obtener el vehículo existente para preservar el stockNumber si no se proporciona
  const existingVehicleDoc = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('vehicles')
    .doc(vehicleId)
    .get();
  
  const existingData = existingVehicleDoc.exists ? existingVehicleDoc.data() : null;
  const existingStockNumber = existingData?.stockNumber || existingData?.specifications?.stockNumber;
  
  // Preparar datos para actualizar, eliminando undefined
  const cleanUpdates: any = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Solo incluir campos que están definidos
  Object.keys(updates).forEach((key) => {
    const value = (updates as any)[key];
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  });
  
  // CRÍTICO: Si no se proporciona stockNumber, preservar el existente O generar uno nuevo si no existe
  if (!cleanUpdates.stockNumber) {
    if (existingStockNumber) {
      // Preservar el existente
      cleanUpdates.stockNumber = existingStockNumber;
      console.log('📦 Preservando stockNumber existente:', existingStockNumber);
      
      // También asegurar que esté en specifications
      if (cleanUpdates.specifications && typeof cleanUpdates.specifications === 'object') {
        cleanUpdates.specifications.stockNumber = existingStockNumber;
      } else if (existingData?.specifications) {
        cleanUpdates.specifications = {
          ...existingData.specifications,
          stockNumber: existingStockNumber,
        };
      }
    } else {
      // Si no existe, generar uno nuevo automáticamente
      console.log('📦 No hay stockNumber existente, generando uno automáticamente...');
      try {
        const newStockNumber = await generateStockNumber(tenantId);
        cleanUpdates.stockNumber = newStockNumber;
        console.log('✅ StockNumber generado automáticamente:', newStockNumber);
        
        // También asegurar que esté en specifications
        if (cleanUpdates.specifications && typeof cleanUpdates.specifications === 'object') {
          cleanUpdates.specifications.stockNumber = newStockNumber;
        } else if (existingData?.specifications) {
          cleanUpdates.specifications = {
            ...existingData.specifications,
            stockNumber: newStockNumber,
          };
        } else {
          cleanUpdates.specifications = {
            ...(cleanUpdates.specifications || {}),
            stockNumber: newStockNumber,
          };
        }
      } catch (error: any) {
        console.error('❌ Error generando stockNumber:', error.message);
        // Fallback: usar timestamp
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const timestamp = Date.now().toString().slice(-6);
        const fallbackStockNumber = `STK-${dateStr}-${timestamp}`;
        cleanUpdates.stockNumber = fallbackStockNumber;
        console.log('⚠️ Usando fallback:', fallbackStockNumber);
        
        if (cleanUpdates.specifications && typeof cleanUpdates.specifications === 'object') {
          cleanUpdates.specifications.stockNumber = fallbackStockNumber;
        } else {
          cleanUpdates.specifications = {
            ...(cleanUpdates.specifications || {}),
            stockNumber: fallbackStockNumber,
          };
        }
      }
    }
  }
  
  // CRÍTICO: Manejar bodyType - asegurar que esté en ambos lugares
  const bodyType = cleanUpdates.bodyType || existingData?.bodyType || existingData?.specifications?.bodyType;
  if (bodyType) {
    const normalizedBodyType = String(bodyType).trim().toLowerCase();
    if (normalizedBodyType !== '' && normalizedBodyType !== 'undefined' && normalizedBodyType !== 'null') {
      cleanUpdates.bodyType = normalizedBodyType;
      console.log('🚗 Guardando bodyType:', normalizedBodyType);
      
      // También asegurar que esté en specifications
      if (cleanUpdates.specifications && typeof cleanUpdates.specifications === 'object') {
        cleanUpdates.specifications.bodyType = normalizedBodyType;
      } else if (existingData?.specifications) {
        cleanUpdates.specifications = {
          ...existingData.specifications,
          bodyType: normalizedBodyType,
        };
      } else {
        cleanUpdates.specifications = {
          ...(cleanUpdates.specifications || {}),
          bodyType: normalizedBodyType,
        };
      }
    }
  }

  console.log('📝 Datos a actualizar en Firestore:', cleanUpdates);
  console.log('📸 Fotos a guardar:', cleanUpdates.photos);
  console.log('🎥 Videos a guardar:', cleanUpdates.videos);

  try {
    await getDb()
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc(vehicleId)
      .update(cleanUpdates);

    console.log('✅ Vehículo actualizado en Firestore exitosamente');
  } catch (error: any) {
    console.error('❌ Error actualizando vehículo en Firestore:', {
      error: error.message,
      tenantId,
      vehicleId,
      updates: cleanUpdates,
    });
    throw error;
  }

  // Verificar que se guardó correctamente
  try {
    const docRef = getDb()
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc(vehicleId);
    const updatedDoc = await docRef.get();
    const data = updatedDoc.data();
    
    console.log('✅ Vehículo actualizado:', {
      id: updatedDoc.id,
      photos: data?.photos,
      videos: data?.videos,
      photosCount: data?.photos?.length || 0,
      videosCount: data?.videos?.length || 0,
    });
    
    // Verificar que las fotos coincidan
    if (cleanUpdates.photos && data?.photos?.length !== cleanUpdates.photos.length) {
      console.error('❌ ERROR CRÍTICO: Las fotos no coinciden después de guardar!', {
        esperadas: cleanUpdates.photos.length,
        guardadas: data?.photos?.length || 0,
        esperadasArray: cleanUpdates.photos,
        guardadasArray: data?.photos,
      });
    }
  } catch (verifyError: any) {
    console.error('❌ Error verificando actualización:', verifyError.message);
  }
}

/**
 * Actualiza el estado de un vehículo
 */
export async function updateVehicleStatus(
  tenantId: string,
  vehicleId: string,
  status: VehicleStatus
): Promise<void> {
  const updateData: any = {
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (status === 'sold') {
    updateData.soldAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('vehicles')
    .doc(vehicleId)
    .update(updateData);
}

/**
 * Elimina un vehículo (soft delete)
 */
export async function deleteVehicle(
  tenantId: string,
  vehicleId: string
): Promise<void> {
  await updateVehicleStatus(tenantId, vehicleId, 'sold');
}

/**
 * Sincroniza inventario con web pública
 */
export async function syncInventoryToWeb(
  tenantId: string
): Promise<void> {
  // Obtener todos los vehículos disponibles
  const vehicles = await getVehicles(tenantId, { status: 'available' });

  // Actualizar caché o índice para web pública
  // Esto se puede hacer con un documento de índice o caché
  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('cache')
    .doc('inventory')
    .set({
      vehicles: vehicles.map((v) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        price: v.price,
        photos: v.photos,
        status: v.status,
      })),
      lastSync: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}

