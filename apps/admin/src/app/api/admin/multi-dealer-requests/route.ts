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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | 'expired' | null;

    let query: admin.firestore.Query = db.collection('multi_dealer_requests');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const requests = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Obtener nombre de la membresía
        let membershipName = '';
        if (data.membershipId) {
          try {
            const membershipDoc = await db.collection('memberships').doc(data.membershipId).get();
            if (membershipDoc.exists) {
              membershipName = membershipDoc.data()?.name || '';
            }
          } catch (error) {
            console.error('Error fetching membership name:', error);
          }
        }

        return {
          userId: doc.id,
          ...data,
          membershipName,
          createdAt: data.createdAt?.toDate?.() || null,
          reviewedAt: data.reviewedAt?.toDate?.() || null,
          approvedUntil: data.approvedUntil?.toDate?.() || null,
        };
      })
    );

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Error fetching multi dealer requests:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes', details: error.message },
      { status: 500 }
    );
  }
}



