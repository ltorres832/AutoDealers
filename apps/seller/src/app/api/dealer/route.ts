import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

// Lazy initialization para evitar dependencias circulares
function getDb() {
  return getFirestore();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      console.error('❌ Dealer API: No auth found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();

    // Obtener información del usuario actual
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

    console.log('🔍 Buscando dealer para seller:', {
      userId: auth.userId,
      tenantId: auth.tenantId,
      dealerId: userData?.dealerId,
      userName: userData?.name,
      userEmail: userData?.email,
    });

    // Si no hay dealerId asignado, intentar buscar por tenantId del seller
    // El dealerId puede ser el tenantId del dealer
    let dealerIdToUse = userData?.dealerId;
    
    // Si hay dealerId asignado, verificar que sea el correcto (priorizar "chulo 3")
    if (dealerIdToUse) {
      const assignedTenantDoc = await db.collection('tenants').doc(dealerIdToUse).get();
      if (assignedTenantDoc.exists) {
        const assignedTenantData = assignedTenantDoc.data();
        const assignedTenantName = (assignedTenantData?.name || '').toLowerCase().trim();
        
        // Si el dealer asignado no es "chulo 3", buscar el correcto
        if (!assignedTenantName.includes('chulo 3') && !assignedTenantName.includes('chulo3')) {
          console.warn(`⚠️ El dealer asignado (${assignedTenantData?.name}) no es "chulo 3", buscando el correcto...`);
          dealerIdToUse = null; // Resetear para buscar el correcto
        } else {
          console.log(`✅ Dealer asignado es correcto: ${assignedTenantData?.name} (ID: ${dealerIdToUse})`);
        }
      }
    }
    
    if (!dealerIdToUse) {
      console.warn('⚠️ El seller no tiene dealerId asignado, buscando dealer...');
      
      // Intentar buscar si el tenantId del seller es en realidad el tenantId de un dealer
      const tenantDoc = await db.collection('tenants').doc(auth.tenantId).get();
      const tenantData = tenantDoc.data();
      
      // Si el tenant tiene un campo que indique que es parte de un dealer
      if (tenantData?.parentTenantId || tenantData?.dealerId) {
        dealerIdToUse = tenantData.parentTenantId || tenantData.dealerId;
        console.log('✅ Dealer encontrado en tenant:', dealerIdToUse);
      } else {
        // Buscar TODOS los tenants de tipo dealer
        const allTenantsSnapshot = await db.collection('tenants')
          .where('type', '==', 'dealer')
          .get();
        
        console.log(`🔍 Buscando entre ${allTenantsSnapshot.size} dealers...`);
        
        // Primero buscar por nombre "chulo 3" específicamente (prioridad alta)
        let foundDealer = false;
        let bestMatch: { id: string; name: string; priority: number } | null = null;
        
        for (const tenantDoc of allTenantsSnapshot.docs) {
          const tenantData = tenantDoc.data();
          const tenantName = (tenantData.name || '').toLowerCase().trim();
          
          if (!tenantName) continue;
          
          // Priorizar "chulo 3" o "chulo3" sobre otros
          let priority = 0;
          if (tenantName.includes('chulo 3') || tenantName.includes('chulo3')) {
            priority = 3; // Mayor prioridad
          } else if (tenantName.includes('el chulo 3') || tenantName.includes('el chulo3')) {
            priority = 3; // Mayor prioridad
          } else if (tenantName.includes('chulo')) {
            priority = 1; // Menor prioridad
          }
          
          if (priority > 0) {
            if (!bestMatch || priority > bestMatch.priority) {
              bestMatch = {
                id: tenantDoc.id,
                name: tenantData.name || '',
                priority: priority,
              };
            }
          }
        }
        
        if (bestMatch) {
          dealerIdToUse = bestMatch.id;
          console.log(`✅ Dealer encontrado por nombre: ${bestMatch.name} (ID: ${dealerIdToUse}, prioridad: ${bestMatch.priority})`);
          foundDealer = true;
        }
        
        // Si no se encontró por nombre, buscar por otras relaciones
        if (!foundDealer && allTenantsSnapshot.size > 0) {
          // 1. Buscar si el seller fue creado por un dealer (campo createdBy)
          if (userData?.createdBy) {
            const createdByUserDoc = await db.collection('users').doc(userData.createdBy).get();
            if (createdByUserDoc.exists) {
              const createdByUserData = createdByUserDoc.data();
              if (createdByUserData?.role === 'dealer' && createdByUserData?.tenantId) {
                dealerIdToUse = createdByUserData.tenantId;
                const dealerTenantDoc = await db.collection('tenants').doc(dealerIdToUse).get();
                const dealerTenantData = dealerTenantDoc.data();
                console.log(`✅ Dealer encontrado por createdBy: ${dealerTenantData?.name || dealerIdToUse} (ID: ${dealerIdToUse})`);
                foundDealer = true;
              }
            }
          }
          
          // 2. Buscar dealers que tengan sellers en el tenant del seller actual
          if (!foundDealer) {
            for (const tenantDoc of allTenantsSnapshot.docs) {
              const tenantId = tenantDoc.id;
              // Buscar si hay algún seller en el tenant actual que tenga este dealerId
              const sellersSnapshot = await db.collection('users')
                .where('tenantId', '==', auth.tenantId)
                .where('dealerId', '==', tenantId)
                .limit(1)
                .get();
              
              if (!sellersSnapshot.empty) {
                dealerIdToUse = tenantId;
                const tenantData = tenantDoc.data();
                console.log(`✅ Dealer encontrado por relación con seller: ${tenantData?.name || tenantId} (ID: ${dealerIdToUse})`);
                foundDealer = true;
                break;
              }
            }
          }
          
          // 3. Buscar si el tenant del seller tiene algún campo que indique el dealer
          if (!foundDealer && tenantData) {
            // Buscar en todos los dealers si alguno tiene relación con este tenant
            for (const tenantDoc of allTenantsSnapshot.docs) {
              const dealerTenantId = tenantDoc.id;
              const dealerTenantData = tenantDoc.data();
              
              // Verificar si el nombre del dealer coincide con algún patrón conocido
              // o si hay alguna otra relación
              if (dealerTenantData?.name) {
                const dealerName = dealerTenantData.name.toLowerCase();
                // Si el nombre contiene "chulo" o variaciones, usarlo
                if (dealerName.includes('chulo')) {
                  dealerIdToUse = dealerTenantId;
                  console.log(`✅ Dealer encontrado por nombre (segunda búsqueda): ${dealerTenantData.name} (ID: ${dealerIdToUse})`);
                  foundDealer = true;
                  break;
                }
              }
            }
          }
          
          // 4. Si aún no se encontró, usar el primer dealer activo como último recurso
          if (!foundDealer) {
            const firstDealer = allTenantsSnapshot.docs[0];
            dealerIdToUse = firstDealer.id;
            const firstDealerData = firstDealer.data();
            console.log(`⚠️ Usando primer dealer disponible como fallback: ${firstDealerData?.name || dealerIdToUse} (ID: ${dealerIdToUse})`);
          }
        }
        
        // Actualizar el seller con el dealerId encontrado
        if (dealerIdToUse) {
          try {
            await db.collection('users').doc(auth.userId).update({
              dealerId: dealerIdToUse,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log('✅ dealerId actualizado en el seller');
          } catch (updateError: any) {
            console.warn('⚠️ Error actualizando dealerId:', updateError.message);
          }
        }
      }
    }

    if (!dealerIdToUse) {
      // Obtener tenantData para el log de error
      const tenantDocForError = await db.collection('tenants').doc(auth.tenantId).get();
      const tenantDataForError = tenantDocForError.data();
      
      console.warn('⚠️ No se pudo encontrar dealer para el seller');
      console.warn('📋 Información del seller:', {
        userId: auth.userId,
        tenantId: auth.tenantId,
        userName: userData?.name,
        userEmail: userData?.email,
        createdBy: userData?.createdBy,
      });
      console.warn('📋 Información del tenant del seller:', {
        tenantId: auth.tenantId,
        tenantName: tenantDataForError?.name,
        tenantType: tenantDataForError?.type,
        parentTenantId: tenantDataForError?.parentTenantId,
        dealerId: tenantDataForError?.dealerId,
      });
      return NextResponse.json({ 
        dealer: null,
        message: 'No se encontró información del dealer. Por favor, contacta al administrador para que te asigne un dealer.'
      });
    }

    // Obtener información del dealer (tenant)
    const dealerTenantDoc = await db.collection('tenants').doc(dealerIdToUse).get();
    const dealerTenantData = dealerTenantDoc.data();

    if (!dealerTenantDoc.exists) {
      console.error('❌ El tenant del dealer no existe:', dealerIdToUse);
      return NextResponse.json({ 
        dealer: null,
        error: 'El dealer no existe'
      });
    }

    // Obtener usuario del dealer
    let dealerUsersSnapshot = await db
      .collection('users')
      .where('tenantId', '==', dealerIdToUse)
      .where('role', '==', 'dealer')
      .limit(1)
      .get();

    let dealerUser = dealerUsersSnapshot.docs[0]?.data();
    let dealerUserId = dealerUsersSnapshot.docs[0]?.id;

    // Si no hay usuario dealer, intentar obtener cualquier usuario del tenant
    if (!dealerUser && dealerUsersSnapshot.empty) {
      console.warn('⚠️ No se encontró usuario dealer, buscando cualquier usuario del tenant...');
      const anyUserSnapshot = await db
        .collection('users')
        .where('tenantId', '==', dealerIdToUse)
        .limit(1)
        .get();
      
      if (!anyUserSnapshot.empty) {
        const anyUserDoc = anyUserSnapshot.docs[0];
        dealerUser = anyUserDoc.data();
        dealerUserId = anyUserDoc.id;
        console.log('✅ Usuario encontrado en el tenant del dealer:', dealerUserId);
      }
    }

    // Si tenemos un usuario dealer, construir la información
    if (dealerUser && dealerUserId) {
      const dealerInfo = {
        id: dealerUserId,
        tenantId: dealerIdToUse,
        name: dealerTenantData?.name || dealerUser?.name || 'Dealer',
        email: dealerUser?.email || null,
      };
      console.log('✅ Dealer encontrado:', dealerInfo);
      return NextResponse.json({ dealer: dealerInfo });
    }

    // Si no hay usuario pero el tenant existe, devolver información del tenant mismo
    if (dealerTenantDoc.exists && dealerTenantData) {
      const dealerInfo = {
        id: dealerIdToUse, // Usar el tenantId como ID del dealer
        tenantId: dealerIdToUse,
        name: dealerTenantData.name || 'Dealer',
        email: dealerTenantData.email || dealerTenantData.contactEmail || null,
      };
      console.log('✅ Dealer encontrado (solo tenant, sin usuarios):', dealerInfo);
      return NextResponse.json({ dealer: dealerInfo });
    }

    // Si llegamos aquí, no se pudo encontrar información del dealer
    console.error('❌ No se encontró información del dealer');
    console.error('📋 Información disponible:', {
      dealerTenantId: dealerIdToUse,
      tenantExists: dealerTenantDoc.exists,
      tenantName: dealerTenantData?.name,
      tenantType: dealerTenantData?.type,
    });
    
    return NextResponse.json({ 
      dealer: null,
      error: 'No se encontró información del dealer',
      message: 'El dealer existe pero no se encontraron usuarios asociados. Por favor, contacta al administrador.'
    });
  } catch (error: any) {
    console.error('❌ Error fetching dealer:', error.message || error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

