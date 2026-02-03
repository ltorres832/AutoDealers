export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const saleId = searchParams.get('saleId');
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');

    let query: any = db
      .collection('tenants')
      .doc(auth.tenantId!)
      .collection('contracts');

    if (saleId) {
      query = query.where('saleId', '==', saleId);
    }
    if (leadId) {
      query = query.where('leadId', '==', leadId);
    }
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    const contracts = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate(),
      };
    });

    return NextResponse.json({ contracts });
  } catch (error: any) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener contratos' },
      { status: 500 }
    );
  }
}

