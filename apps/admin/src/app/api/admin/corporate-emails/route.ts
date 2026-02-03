import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebase } from '@autodealers/core';

initializeFirebase();

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const emailsSnapshot = await db.collection('corporate_emails').get();
    const emails = emailsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));

    return NextResponse.json({ emails });
  } catch (error: any) {
    console.error('Error fetching corporate emails:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


