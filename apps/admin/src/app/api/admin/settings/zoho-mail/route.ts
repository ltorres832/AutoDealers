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

    const docRef = db.collection('system_settings').doc('credentials');
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data() || {};
      return NextResponse.json({
        config: {
          clientId: data.zohoClientId || '',
          clientSecret: data.zohoClientSecret || '',
          refreshToken: data.zohoRefreshToken || '',
          domain: data.zohoDomain || '',
          organizationId: data.zohoOrganizationId || '',
          smtpUser: data.zohoSmtpUser || '',
          smtpPassword: data.zohoSmtpPassword || '',
        },
      });
    }

    return NextResponse.json({
      config: {
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        domain: '',
        organizationId: '',
        smtpUser: '',
        smtpPassword: '',
      },
    });
  } catch (error: any) {
    console.error('Error fetching Zoho Mail config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { config } = await request.json();

    if (!config) {
      return NextResponse.json({ error: 'config es requerido' }, { status: 400 });
    }

    const docRef = db.collection('system_settings').doc('credentials');
    await docRef.set(
      {
        zohoClientId: config.clientId || '',
        zohoClientSecret: config.clientSecret || '',
        zohoRefreshToken: config.refreshToken || '',
        zohoDomain: config.domain || '',
        zohoOrganizationId: config.organizationId || '',
        zohoSmtpUser: config.smtpUser || '',
        zohoSmtpPassword: config.smtpPassword || '',
        updatedAt: new Date(),
        updatedBy: auth.userId,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving Zoho Mail config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


