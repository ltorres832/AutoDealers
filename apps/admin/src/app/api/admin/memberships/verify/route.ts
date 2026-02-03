export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 [VERIFY] Verificando membresías en Firestore...');
    
    // Obtener todas las membresías sin filtros
    const allMemberships = await db.collection('memberships').get();
    
    console.log(`📊 [VERIFY] Total de membresías encontradas: ${allMemberships.size}`);
    
    if (allMemberships.empty) {
      console.warn('⚠️ [VERIFY] NO HAY MEMBRESÍAS EN FIRESTORE!');
      return NextResponse.json({
        total: 0,
        memberships: [],
        duplicates: [],
        summary: {
          dealers: 0,
          sellers: 0,
          active: 0,
          inactive: 0,
        },
        warning: 'No se encontraron membresías en Firestore. Esto puede indicar un problema grave.',
      });
    }
    
    const membershipsData = allMemberships.docs.map(doc => {
      const data = doc.data();
      const membership = {
        id: doc.id,
        name: data.name,
        type: data.type,
        price: data.price,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || 'N/A',
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || 'N/A',
        stripePriceId: data.stripePriceId || 'N/A',
        hasFeatures: !!data.features,
        featuresCount: data.features ? Object.keys(data.features).length : 0,
      };
      
      console.log(`  ✓ ${membership.name} (${membership.type}) - $${membership.price} - Activa: ${membership.isActive} - ID: ${membership.id}`);
      
      return membership;
    });

    // Agrupar por nombre y tipo para detectar duplicados
    const grouped = new Map<string, any[]>();
    membershipsData.forEach(m => {
      const key = `${m.name}|${m.type}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(m);
    });

    const duplicates: any[] = [];
    grouped.forEach((memberships, key) => {
      if (memberships.length > 1) {
        duplicates.push({
          name: key.split('|')[0],
          type: key.split('|')[1],
          count: memberships.length,
          ids: memberships.map(m => m.id),
        });
      }
    });

    // Verificar usando getMemberships también
    let getMembershipsResult: any[] = [];
    try {
      const { getMemberships } = await import('@autodealers/billing');
      getMembershipsResult = await getMemberships();
      console.log(`📦 [VERIFY] getMemberships retornó ${getMembershipsResult.length} membresías`);
    } catch (error: any) {
      console.error('❌ [VERIFY] Error usando getMemberships:', error.message);
    }

    return NextResponse.json({
      total: allMemberships.size,
      memberships: membershipsData,
      duplicates: duplicates,
      getMembershipsCount: getMembershipsResult.length,
      summary: {
        dealers: membershipsData.filter(m => m.type === 'dealer').length,
        sellers: membershipsData.filter(m => m.type === 'seller').length,
        active: membershipsData.filter(m => m.isActive === true).length,
        inactive: membershipsData.filter(m => m.isActive === false).length,
      },
      comparison: {
        directQuery: allMemberships.size,
        getMemberships: getMembershipsResult.length,
        match: allMemberships.size === getMembershipsResult.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [VERIFY] Error verificando membresías:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

