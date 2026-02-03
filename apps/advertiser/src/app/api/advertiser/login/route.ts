import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@autodealers/core';
import { getAdvertiserById } from '@autodealers/core';
import * as admin from 'firebase-admin';

const auth = getAuth();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña requeridos' },
        { status: 400 }
      );
    }

    // Verificar credenciales con Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    
    // Verificar que el usuario tiene rol de advertiser
    const customClaims = userRecord.customClaims || {};
    if (customClaims.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'Esta cuenta no es de anunciante' },
        { status: 403 }
      );
    }

    // Verificar que el anunciante está activo
    const advertiser = await getAdvertiserById(userRecord.uid);
    if (!advertiser) {
      return NextResponse.json(
        { error: 'Anunciante no encontrado' },
        { status: 404 }
      );
    }

    // Permitir login si está activo (con o sin plan)
    if (advertiser.status !== 'active') {
      return NextResponse.json(
        { error: 'Tu cuenta está suspendida o pendiente de aprobación' },
        { status: 403 }
      );
    }

    // Crear token personalizado (Firebase Admin SDK)
    // El cliente debe intercambiar este custom token por un ID token usando Firebase Client SDK
    const customToken = await admin.auth().createCustomToken(userRecord.uid, {
      role: 'advertiser',
      advertiserId: advertiser.id,
    });

    // Crear cookie HttpOnly segura con el UID
    // Nota: En producción ideal, el cliente debería intercambiar el custom token por un ID token
    // y enviar ese ID token en la cookie. Por simplicidad, usamos el UID directamente.
    const sessionData = {
      uid: userRecord.uid,
      role: 'advertiser',
      advertiserId: advertiser.id,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 días
    };
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    // Crear cookie HttpOnly segura
    const response = NextResponse.json({
      success: true,
      customToken, // Enviar para que el cliente pueda intercambiarlo si es necesario
      advertiser: {
        id: advertiser.id,
        email: advertiser.email,
        companyName: advertiser.companyName,
        plan: advertiser.plan,
      },
    });

    // Establecer cookie HttpOnly
    response.cookies.set('authToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error in advertiser login:', error);
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

