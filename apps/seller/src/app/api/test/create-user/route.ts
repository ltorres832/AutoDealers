import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * API para crear usuarios de prueba (solo en desarrollo)
 * POST /api/test/create-user
 * Body: { email, password, name, role, tenantId?, dealerId? }
 */
export async function POST(request: NextRequest) {
  try {
    // Solo permitir en desarrollo (verificar también por hostname)
    const isDevelopment = 
      process.env.NODE_ENV !== 'production' || 
      process.env.NODE_ENV === undefined;
    
    if (!isDevelopment) {
      return NextResponse.json(
        { error: 'Esta funcionalidad solo está disponible en desarrollo' },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Body inválido. Se espera JSON.' },
        { status: 400 }
      );
    }
    const { email, password, name, role, tenantId, dealerId } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: email, password, name, role' },
        { status: 400 }
      );
    }

    if (role !== 'dealer' && role !== 'seller') {
      return NextResponse.json(
        { error: 'El rol debe ser "dealer" o "seller"' },
        { status: 400 }
      );
    }

    // Inicializar Firebase Admin (puede lanzar error si no está configurado)
    let auth, db;
    try {
      auth = getAuth();
      db = getFirestore();
    } catch (firebaseError: any) {
      console.error('Error inicializando Firebase:', firebaseError);
      return NextResponse.json(
        {
          error: 'Error de configuración de Firebase',
          details: firebaseError.message || 'Firebase Admin no está configurado correctamente. Verifica las variables de entorno: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY',
          code: firebaseError.code,
        },
        { status: 500 }
      );
    }

    // Verificar si el usuario ya existe
    try {
      const existingUser = await auth.getUserByEmail(email);
      return NextResponse.json(
        { 
          error: 'El usuario ya existe',
          userId: existingUser.uid,
          message: 'El usuario ya existe en Firebase Auth. Puedes intentar iniciar sesión o actualizar la contraseña.'
        },
        { status: 400 }
      );
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Crear o usar tenant
    let finalTenantId = tenantId;
    if (!finalTenantId) {
      const tenantRef = db.collection('tenants').doc();
      await tenantRef.set({
        name: name,
        type: role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      finalTenantId = tenantRef.id;
    }

    // Crear usuario en Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Establecer custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      tenantId: finalTenantId,
      dealerId: dealerId || undefined,
    });

    // Crear documento en Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role,
      tenantId: finalTenantId,
      dealerId: dealerId || undefined,
      membershipId: '',
      membershipType: role,
      status: 'active',
      settings: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);

    return NextResponse.json({
      success: true,
      user: {
        id: userRecord.uid,
        email,
        name,
        role,
        tenantId: finalTenantId,
        dealerId: dealerId || undefined,
      },
      message: 'Usuario creado exitosamente. Ahora puedes iniciar sesión.',
    });
  } catch (error: any) {
    console.error('Error creating test user:', error);
    console.error('Error stack:', error.stack);
    
    // Mejorar el mensaje de error para problemas comunes
    let errorMessage = 'Error al crear usuario';
    let errorDetails = error.message || 'Error desconocido';
    
    if (error.message?.includes('Firebase credentials not configured')) {
      errorMessage = 'Firebase no está configurado';
      errorDetails = 'Las credenciales de Firebase Admin no están configuradas. Verifica las variables de entorno: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY';
    } else if (error.message?.includes('Firebase Admin solo puede usarse en el servidor')) {
      errorMessage = 'Error de configuración';
      errorDetails = 'Firebase Admin solo puede usarse en el servidor';
    } else if (error.code === 'auth/email-already-exists') {
      errorMessage = 'El email ya está en uso';
      errorDetails = 'Ya existe un usuario con este email';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Email inválido';
      errorDetails = 'El formato del email no es válido';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Contraseña débil';
      errorDetails = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

