// Gestión de membresías

import { Membership, MembershipType } from './types';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

// NO inicializar db aquí - se inicializa en cada función
let db: any = null;

function getDb() {
  if (!db) {
    db = getFirestore();
  }
  return db;
}

/**
 * Crea una nueva membresía
 */
export async function createMembership(
  membership: Omit<Membership, 'id' | 'createdAt'>
): Promise<Membership> {
  const docRef = getDb().collection('memberships').doc();

  const fieldValue = getFirestoreFieldValue();
  await docRef.set({
    ...membership,
    createdAt: fieldValue.serverTimestamp(),
  } as any);

  return {
    id: docRef.id,
    ...membership,
    createdAt: new Date(),
  };
}

/**
 * Obtiene todas las membresías (para admin)
 */
export async function getMemberships(
  type?: MembershipType
): Promise<Membership[]> {
  console.log(`🔍 getMemberships: Obteniendo membresías${type ? ` (tipo: ${type})` : ' (todas)'}`);

  try {
    // Primero intentar sin orderBy para evitar problemas de índice
    let query: any = getDb().collection('memberships');

    if (type) {
      query = query.where('type', '==', type);
    }

    console.log(`📡 Ejecutando query de Firestore...`);
    const snapshot = await query.get();

    console.log(`📊 getMemberships: Encontradas ${snapshot.size} membresías en Firestore`);

    if (snapshot.empty) {
      console.warn(`⚠️ getMemberships: No se encontraron membresías${type ? ` de tipo ${type}` : ''}`);
      // Verificar si hay membresías sin filtro
      if (type) {
        const allSnapshot = await getDb().collection('memberships').limit(10).get();
        console.log(`📋 Total de membresías en Firestore (sin filtro): ${allSnapshot.size}`);
        if (allSnapshot.size > 0) {
          console.log(`📋 Primeras membresías encontradas:`);
          allSnapshot.docs.forEach((doc, i) => {
            const data = doc.data();
            console.log(`  ${i + 1}. ID: ${doc.id}, Nombre: ${data.name}, Tipo: ${data.type}, Precio: ${data.price}, Activa: ${data.isActive}`);
          });
        }
      }
      return [];
    }

    const memberships = snapshot.docs.map((doc) => {
      const data = doc.data();
      const membership = {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
      } as Membership;

      console.log(`  ✓ ${membership.name} (${membership.type}) - $${membership.price} - Activa: ${membership.isActive}`);
      return membership;
    });

    // Ordenar manualmente por precio (más confiable que orderBy en query)
    memberships.sort((a, b) => (a.price || 0) - (b.price || 0));

    console.log(`✅ getMemberships: Retornando ${memberships.length} membresías ordenadas`);
    return memberships;
  } catch (error: any) {
    console.error(`❌ Error in getMemberships:`, error);
    console.error(`Stack:`, error.stack);

    // Último recurso: obtener todas sin filtros
    try {
      console.log(`🔄 Intentando obtener todas las membresías sin filtros...`);
      const allSnapshot = await getDb().collection('memberships').get();

      if (allSnapshot.empty) {
        console.warn(`⚠️ No hay membresías en Firestore`);
        return [];
      }

      const allMemberships = allSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data?.createdAt?.toDate() || new Date(),
        } as Membership;
      });

      // Filtrar por tipo si se especificó
      const filtered = type
        ? allMemberships.filter(m => m.type?.toLowerCase() === type.toLowerCase())
        : allMemberships;

      // Ordenar por precio
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));

      console.log(`✅ getMemberships (fallback): Retornando ${filtered.length} membresías`);
      return filtered;
    } catch (finalError) {
      console.error(`❌ Error en fallback final de getMemberships:`, finalError);
      return [];
    }
  }
}

/**
 * Obtiene todas las membresías activas
 */
export async function getActiveMemberships(
  type?: MembershipType
): Promise<Membership[]> {
  console.log(`🔍 getActiveMemberships: Obteniendo membresías activas${type ? ` (tipo: ${type})` : ' (todas)'}`);

  try {
    // Primero intentar sin orderBy para evitar problemas de índice
    let query: any = getDb()
      .collection('memberships')
      .where('isActive', '==', true);

    if (type) {
      query = query.where('type', '==', type);
    }

    console.log(`📡 Ejecutando query de Firestore para membresías activas...`);
    const snapshot = await query.get();

    console.log(`📊 getActiveMemberships: Encontradas ${snapshot.size} membresías activas en Firestore`);

    if (snapshot.empty) {
      console.warn(`⚠️ getActiveMemberships: No se encontraron membresías activas${type ? ` de tipo ${type}` : ''}`);
      // Verificar si hay membresías activas sin filtro
      if (type) {
        const allActiveSnapshot = await getDb()
          .collection('memberships')
          .where('isActive', '==', true)
          .limit(10)
          .get();
        console.log(`📋 Total de membresías activas en Firestore (sin filtro de tipo): ${allActiveSnapshot.size}`);
        if (allActiveSnapshot.size > 0) {
          console.log(`📋 Primeras membresías activas encontradas:`);
          allActiveSnapshot.docs.forEach((doc, i) => {
            const data = doc.data();
            console.log(`  ${i + 1}. ID: ${doc.id}, Nombre: ${data.name}, Tipo: ${data.type}, Precio: ${data.price}`);
          });
        }
      }
      return [];
    }

    const memberships = snapshot.docs.map((doc) => {
      const data = doc.data();
      const membership = {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
      } as Membership;

      console.log(`  ✓ ${membership.name} (${membership.type}) - $${membership.price}`);
      return membership;
    });

    // Ordenar manualmente por precio (más confiable que orderBy en query)
    memberships.sort((a, b) => (a.price || 0) - (b.price || 0));

    console.log(`✅ getActiveMemberships: Retornando ${memberships.length} membresías activas ordenadas`);
    return memberships;
  } catch (error: any) {
    console.error(`❌ Error in getActiveMemberships:`, error);
    console.error(`Stack:`, error.stack);

    // Fallback: obtener todas y filtrar manualmente
    try {
      console.log(`🔄 Intentando fallback: obtener todas las membresías y filtrar manualmente...`);
      const allSnapshot = await getDb().collection('memberships').get();

      if (allSnapshot.empty) {
        console.warn(`⚠️ No hay membresías en Firestore`);
        return [];
      }

      const allMemberships = allSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data?.createdAt?.toDate() || new Date(),
        } as Membership;
      });

      // Filtrar por activas y tipo
      let filtered = allMemberships.filter(m => m.isActive === true);
      if (type) {
        filtered = filtered.filter(m => m.type?.toLowerCase() === type.toLowerCase());
      }

      // Ordenar por precio
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));

      console.log(`✅ getActiveMemberships (fallback): Retornando ${filtered.length} membresías activas`);
      return filtered;
    } catch (finalError: any) {
      console.error(`❌ Error en fallback final de getActiveMemberships:`, finalError);
      console.error(`Stack:`, finalError.stack);
      return [];
    }
  }
}

/**
 * Obtiene una membresía por ID
 */
export async function getMembershipById(
  membershipId: string
): Promise<Membership | null> {
  if (!membershipId || membershipId.trim() === '') {
    console.error('❌ getMembershipById: membershipId vacío o inválido');
    return null;
  }

  try {
    console.log(`🔍 getMembershipById: Buscando membresía con ID: ${membershipId}`);

    const membershipDoc = await getDb()
      .collection('memberships')
      .doc(membershipId)
      .get();

    if (!membershipDoc.exists) {
      console.warn(`⚠️ getMembershipById: Membership ${membershipId} not found in Firestore`);
      // Verificar si hay membresías en la colección
      const allMemberships = await getDb().collection('memberships').limit(5).get();
      console.log(`📊 Total de membresías en Firestore: ${allMemberships.size}`);
      if (allMemberships.size > 0) {
        console.log(`📋 Primeras membresías encontradas:`);
        allMemberships.docs.forEach((doc, i) => {
          const data = doc.data();
          console.log(`  ${i + 1}. ID: ${doc.id}, Nombre: ${data.name}, Tipo: ${data.type}`);
        });
      }
      return null;
    }

    const data = membershipDoc.data();
    if (!data) {
      console.warn(`⚠️ getMembershipById: Membership ${membershipId} exists but has no data`);
      return null;
    }

    const membership = {
      id: membershipDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
    } as Membership;

    console.log(`✅ getMembershipById: Encontrada membresía ${membership.name} (${membership.type}) - Activa: ${membership.isActive}`);
    return membership;
  } catch (error: any) {
    console.error(`❌ getMembershipById: Error fetching membership ${membershipId}:`, error);
    console.error(`Stack:`, error.stack);
    return null;
  }
}

/**
 * Actualiza una membresía
 * Limpia todos los valores undefined antes de actualizar
 */
export async function updateMembership(
  membershipId: string,
  updates: Partial<Membership>
): Promise<void> {
  // Función recursiva para limpiar undefined
  function removeUndefined(obj: any): any {
    if (obj === undefined || obj === null) {
      return null; // Firestore acepta null, no undefined
    }
    if (Array.isArray(obj)) {
      return obj.map(removeUndefined);
    }
    if (typeof obj === 'object' && obj !== null) {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = removeUndefined(obj[key]);
        }
      }
      return cleaned;
    }
    return obj;
  }

  const cleanedUpdates = removeUndefined(updates);

  const fieldValue = getFirestoreFieldValue();
  // Asegurar que updatedAt y syncVersion estén presentes
  const finalUpdates = {
    ...cleanedUpdates,
    updatedAt: fieldValue.serverTimestamp(),
    syncVersion: fieldValue.increment(1),
  };

  console.log('💾 updateMembership - Final updates (no undefined):', JSON.stringify(finalUpdates, null, 2));

  await getDb().collection('memberships').doc(membershipId).update(finalUpdates as any);
}

/**
 * Verifica si una membresía tiene una feature específica
 */
export function hasFeature(
  membership: Membership,
  feature: keyof Membership['features']
): boolean {
  return membership.features[feature] === true;
}

/**
 * Verifica límites de membresía
 */
export function checkLimit(
  membership: Membership,
  limit: 'maxSellers' | 'maxInventory' | 'maxLeadsPerMonth',
  currentCount: number
): boolean {
  const maxLimit = membership.features[limit] as number | undefined;
  if (maxLimit === undefined || maxLimit === null) {
    return true; // Sin límite
  }
  return currentCount < maxLimit;
}

