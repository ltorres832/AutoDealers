import { NextRequest, NextResponse } from 'next/server';
import { createAdvertiser, getAdvertiserPricingConfig, getStripeInstance } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      contactName,
      email,
      password,
      phone,
      website,
      industry,
      message,
      plan,
    } = body;

    // Validaciones
    if (!companyName || !contactName || !email || !password) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Crear usuario en Firebase Auth primero con la contraseña proporcionada
    const { getAuth } = await import('@autodealers/core');
    const auth = getAuth();
    
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: contactName,
    });

    // Establecer custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'advertiser',
    });

    // Crear anunciante en Firestore
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const advertiserRef = db.collection('advertisers').doc(userRecord.uid);
    
    await advertiserRef.set({
      email,
      companyName,
      contactName,
      phone: phone || '',
      website: website || '',
      industry: industry || 'other',
      status: 'active', // Activo sin plan - pueden acceder a todo
      plan: null, // Sin plan inicialmente
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const advertiser = {
      id: userRecord.uid,
      email,
      companyName,
      contactName,
      phone: phone || '',
      website: website || '',
      industry: industry || 'other',
      status: 'active' as const,
      plan: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      advertiserId: advertiser.id,
      advertiser,
    });
  } catch (error: any) {
    console.error('Error registering advertiser:', error);
    return NextResponse.json(
      { error: error.message || 'Error al registrar anunciante' },
      { status: 500 }
    );
  }
}

