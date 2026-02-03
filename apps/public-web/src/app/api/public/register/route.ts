import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const db = getFirestore();
    
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const {
      name,
      email,
      password,
      phone,
      companyName,
      subdomain,
      accountType,
      referralCode,
    } = body;

    // Validaciones básicas
    if (!name || !email || !password || !accountType) {
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

    // Validar nombre de compañía para dealers
    if (accountType === 'dealer' && !companyName) {
      return NextResponse.json(
        { error: 'El nombre de la compañía es requerido para dealers' },
        { status: 400 }
      );
    }

    // Crear usuario sin membresía (se asignará después)
    const role = accountType === 'dealer' ? 'dealer' : 'seller';
    
    // Crear tenant primero
    const tenantRef = db.collection('tenants').doc();
    const tenantId = tenantRef.id;

    await tenantRef.set({
      name: accountType === 'dealer' ? companyName : name,
      type: accountType,
      status: 'active',
      subdomain: subdomain || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // No incluir membershipId aquí - se asignará después
    });

    // Crear usuario
    const user = await createUser(
      email,
      password,
      name,
      role,
      tenantId,
      undefined, // dealerId
      undefined  // membershipId - se asignará después
    );

    // Actualizar tenant con ownerId
    await tenantRef.update({
      ownerId: user.id,
    });

    // Si hay código de referido, procesarlo (opcional)
    if (referralCode) {
      // Lógica de referidos aquí si es necesario
      console.log('Referral code:', referralCode);
    }

    // Retornar también email y name para que el frontend pueda usarlos
    return NextResponse.json({
      success: true,
      userId: user.id,
      tenantId,
      userEmail: email,
      userName: name,
      message: 'Cuenta creada exitosamente',
    });
  } catch (error: any) {
    console.error('Error creating account:', error);
    
    // Manejar errores específicos
    if (error.code === 'auth/email-already-in-use') {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Error al crear la cuenta' },
      { status: 500 }
    );
  }
}
