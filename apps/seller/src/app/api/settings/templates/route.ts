import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTemplates } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');
    const type = typeParam === 'all' || !typeParam 
      ? undefined 
      : (typeParam as 'email' | 'sms' | 'whatsapp' | 'message');

    // Obtener templates del tenant específico (sin índice compuesto para evitar errores)
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    
    let snapshot;
    try {
      // Intentar con filtro compuesto primero
      if (type) {
        snapshot = await db
          .collection('templates')
          .where('tenantId', '==', auth.tenantId)
          .where('type', '==', type)
          .get();
      } else {
        snapshot = await db
          .collection('templates')
          .where('tenantId', '==', auth.tenantId)
          .get();
      }
    } catch (error: any) {
      // Si falla (por índice faltante), obtener todos y filtrar en memoria
      console.warn('Query with index failed, filtering in memory:', error.message);
      const allSnapshot = await db
        .collection('templates')
        .where('tenantId', '==', auth.tenantId)
        .get();
      
      snapshot = allSnapshot;
    }
    
    let templates = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate()?.toISOString(),
        updatedAt: data?.updatedAt?.toDate()?.toISOString(),
      };
    });

    // Filtrar por tipo en memoria si fue necesario
    if (type && templates.length > 0) {
      templates = templates.filter((t: any) => t.type === type);
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, templates: [] },
      { status: 500 }
    );
  }
}



