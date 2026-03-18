export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkMultiDealerAccess } from '@autodealers/core';
import { getMemberships } from '@autodealers/billing';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

/**
 * API pública para obtener membresías disponibles
 * IMPORTANTE: Las membresías Multi Dealer NO se muestran hasta que el usuario tenga acceso aprobado
 * 
 * Usa la misma función getMemberships que el admin para garantizar consistencia
 */
export async function GET(request: NextRequest) {
  const db = getFirestore();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'dealer' | 'seller' | null;
  const userId = searchParams.get('userId'); // Opcional: para verificar acceso Multi Dealer
  const showMultiDealer = searchParams.get('showMultiDealer') === 'true'; // Para permitir ver planes en registro

  try {
    // Usar la misma función que el admin para obtener membresías
    let allMemberships;
    try {
      allMemberships = await getMemberships(type || undefined);
    } catch (getMembershipsError: any) {
      console.error('Error calling getMemberships:', getMembershipsError);
      // Continuar con fallback
      allMemberships = [];
    }

    // Filtrar solo las activas (el admin puede ver inactivas, pero el público solo activas)
    let memberships = Array.isArray(allMemberships)
      ? allMemberships.filter((m) => m.isActive === true)
      : [];

    // IMPORTANTE: Filtrar membresías Multi Dealer
    // Solo mostrarlas si el usuario tiene acceso aprobado y activo (dentro de 48 horas)
    const filteredMemberships: any[] = [];

    for (const membership of memberships) {
      const isMultiDealer = membership.features?.multiDealerEnabled === true;

      if (!isMultiDealer) {
        // Membresías normales: siempre visibles
        filteredMemberships.push(membership);
      } else {
        // Membresías Multi Dealer: NO se muestran hasta que el admin apruebe la solicitud
        // EXCEPCIÓN: Si showMultiDealer=true (para el formulario de registro inicial)
        if (showMultiDealer) {
          filteredMemberships.push(membership);
        } else if (userId) {
          const access = await checkMultiDealerAccess(userId);

          if (access.hasAccess && !access.isExpired) {
            // Verificar que la membresía coincida con la aprobada
            const requestDoc = await db.collection('multi_dealer_requests').doc(userId).get();
            if (requestDoc.exists) {
              const request = requestDoc.data();
              if (request?.membershipId === membership.id) {
                filteredMemberships.push(membership);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      memberships: filteredMemberships,
      total: filteredMemberships.length,
    });
  } catch (error: any) {
    console.error('Error fetching memberships:', error);

    // Fallback: intentar obtener directamente de Firestore si getMemberships falla
    try {
      console.log('🔄 Intentando fallback directo de Firestore...');
      let query: admin.firestore.Query = db
        .collection('memberships')
        .where('isActive', '==', true);

      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query.get();
      const fallbackMemberships = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      });

      // Filtrar Multi Dealer igual que arriba
      const filtered: any[] = [];
      for (const membership of fallbackMemberships as any[]) {
        const isMultiDealer = membership.features?.multiDealerEnabled === true;
        if (!isMultiDealer) {
          filtered.push(membership);
        } else if (showMultiDealer) {
          filtered.push(membership);
        } else if (userId) {
          const access = await checkMultiDealerAccess(userId);
          if (access.hasAccess && !access.isExpired) {
            const requestDoc = await db.collection('multi_dealer_requests').doc(userId).get();
            if (requestDoc.exists) {
              const request = requestDoc.data();
              if (request?.membershipId === membership.id) {
                filtered.push(membership);
              }
            }
          }
        }
      }

      return NextResponse.json({
        memberships: filtered,
        total: filtered.length,
      });
    } catch (fallbackError: any) {
      console.error('Error in fallback:', fallbackError);
      return NextResponse.json(
        {
          error: 'Error al obtener membresías',
          details: error.message,
        },
        { status: 500 }
      );
    }
  }
}


