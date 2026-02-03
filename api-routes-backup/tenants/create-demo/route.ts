import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Inicializar Firebase Admin directamente
function getFirestore() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error: any) {
      if (error.code === 'app/duplicate-app') {
        return admin.firestore();
      }
      throw error;
    }
  }
  return admin.firestore();
}

export async function POST(request: NextRequest) {
  try {
    const db = getFirestore();
    
    // Verificar si ya existe un tenant demo
    const existingDemo = await db
      .collection('tenants')
      .where('subdomain', '==', 'demo')
      .limit(1)
      .get();
    
    if (!existingDemo.empty) {
      const existing = existingDemo.docs[0];
      return NextResponse.json({
        success: true,
        subdomain: 'demo',
        tenantId: existing.id,
        message: 'Tenant demo ya existe',
      });
    }
    
    // Crear tenant demo
    const tenantRef = db.collection('tenants').doc();
    const now = admin.firestore.Timestamp.now();
    
    const tenantData = {
      name: 'AutoDealers Demo',
      type: 'dealer',
      subdomain: 'demo',
      status: 'active',
      membershipId: '',
      branding: {
        primaryColor: '#2563EB',
        secondaryColor: '#1E40AF',
      },
      settings: {},
      description: 'Concesionario de demostración - Tu concesionario de confianza con más de 10 años de experiencia',
      contactEmail: 'demo@autodealers.com',
      contactPhone: '+1 (555) 123-4567',
      address: {
        street: '123 Calle Principal',
        city: 'Ciudad',
        state: 'Estado',
        zipCode: '12345',
        country: 'País',
      },
      website: 'https://demo.autodealers.com',
      businessHours: 'Lunes a Viernes: 9:00 AM - 6:00 PM\nSábados: 10:00 AM - 4:00 PM',
      socialMedia: {
        facebook: 'https://facebook.com/demo',
        instagram: 'https://instagram.com/demo',
        tiktok: 'https://tiktok.com/@demo',
      },
      createdAt: now,
      updatedAt: now,
    };
    
    await tenantRef.set(tenantData);
    
    console.log('Demo tenant created:', tenantRef.id);
    
    return NextResponse.json({
      success: true,
      subdomain: 'demo',
      tenantId: tenantRef.id,
      message: 'Tenant demo creado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creating demo tenant:', error);
    // Retornar error pero con información útil
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        details: error.message,
        hint: 'Verifica que Firebase esté configurado correctamente'
      },
      { status: 500 }
    );
  }
}

