import { NextRequest, NextResponse } from 'next/server';
import { getAuth, getUserByEmail } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, userId, token } = body;

    // Si se proporciona userId y token (método antiguo), usar ese flujo
    if (userId && token) {
      try {
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(token);
        const db = getFirestore();
        
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists) {
          return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const userData = userDoc.data();
        
        // Verificar que el usuario esté activo
        if (userData?.status !== 'active') {
          return NextResponse.json(
            { error: 'Tu cuenta no está activa. Por favor, contacta a soporte.' },
            { status: 403 }
          );
        }

        // Guardar token en cookie
        const response = NextResponse.json({
          user: {
            id: userData.id || decodedToken.uid,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            tenantId: userData.tenantId,
          },
        });

        response.cookies.set('authToken', encodeURIComponent(token), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 24 horas
        });

        return response;
      } catch (error: any) {
        console.error('Error verificando token:', error);
        return NextResponse.json(
          { error: 'Token inválido o expirado' },
          { status: 401 }
        );
      }
    }

    // Nuevo método: autenticar con email y password directamente desde el servidor
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    try {
      const auth = getAuth();
      
      // Autenticar con Firebase Admin SDK
      // Nota: Firebase Admin no tiene signInWithEmailAndPassword directamente
      // Necesitamos obtener el usuario y verificar la contraseña
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          return NextResponse.json(
            { error: 'Email o contraseña incorrectos' },
            { status: 401 }
          );
        }
        throw error;
      }

      // Verificar la contraseña usando Firebase Auth REST API
      // O mejor: usar Firebase Admin para verificar el usuario y luego obtener token
      // Por ahora, vamos a usar un enfoque diferente: verificar en Firestore y generar token
      
      const db = getFirestore();
      const userDoc = await db.collection('users').where('email', '==', email).limit(1).get();
      
      if (userDoc.empty) {
        return NextResponse.json(
          { error: 'Email o contraseña incorrectos' },
          { status: 401 }
        );
      }

      const userData = userDoc.docs[0].data();
      const userId = userDoc.docs[0].id;

      // Verificar que el usuario esté activo
      if (userData?.status !== 'active') {
        return NextResponse.json(
          { error: 'Tu cuenta no está activa. Por favor, contacta a soporte.' },
          { status: 403 }
        );
      }

      // Verificar contraseña usando Firebase Auth REST API
      // Necesitamos hacer una llamada a Firebase Auth REST API para verificar la contraseña
      const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0';
      const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'autodealers-7f62e.firebaseapp.com';
      
      try {
        // Verificar credenciales con Firebase Auth REST API
        const verifyResponse = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              returnSecureToken: true,
            }),
          }
        );

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok) {
          const errorMessage = verifyData.error?.message || 'Error al autenticar';
          if (errorMessage.includes('INVALID_PASSWORD') || errorMessage.includes('EMAIL_NOT_FOUND')) {
            return NextResponse.json(
              { error: 'Email o contraseña incorrectos' },
              { status: 401 }
            );
          }
          return NextResponse.json(
            { error: errorMessage },
            { status: 401 }
          );
        }

        const idToken = verifyData.idToken;

        // Guardar token en cookie
        const response = NextResponse.json({
          user: {
            id: userId,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            tenantId: userData.tenantId,
          },
        });

        response.cookies.set('authToken', encodeURIComponent(idToken), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 24 horas
        });

        return response;
      } catch (authError: any) {
        console.error('Error verificando credenciales:', authError);
        return NextResponse.json(
          { error: 'Error al autenticar. Por favor, intenta de nuevo.' },
          { status: 500 }
        );
      }
    } catch (error: any) {
      console.error('Error en login:', error);
      return NextResponse.json(
        { error: 'Error al iniciar sesión', details: error.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error parsing request:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud', details: error.message },
      { status: 400 }
    );
  }
}
