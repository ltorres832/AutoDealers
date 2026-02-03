import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, getAuth } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid Content-Type. Expected application/json.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { userId, token } = body;

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'User ID and token are required' },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const db = getFirestore();

    // Verificar el token de Firebase
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error: any) {
      console.error('Error verifying ID token:', error);
      return NextResponse.json(
        { error: 'Token de autenticación inválido o expirado' },
        { status: 401 }
      );
    }

    // Asegurarse de que el UID del token coincide con el userId enviado
    if (decodedToken.uid !== userId) {
      return NextResponse.json(
        { error: 'Token no coincide con el usuario' },
        { status: 401 }
      );
    }

    // Obtener información del usuario desde Firestore
    let userDoc = await db.collection('users').doc(userId).get();
    
    // Si no está en users, buscar en tenants/{tenantId}/sub_users
    if (!userDoc.exists) {
      // Buscar en todos los tenants
      const tenantsSnapshot = await db.collection('tenants').limit(100).get();
      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        const subUserDoc = await db
          .collection('tenants')
          .doc(tenantId)
          .collection('sub_users')
          .doc(userId)
          .get();
        
        if (subUserDoc.exists) {
          const subUserData = subUserDoc.data();
          // Verificar que sea dealer
          if (subUserData?.role === 'dealer') {
            // Verificar que la cuenta esté activa
            if (subUserData.status !== 'active' && subUserData.isActive !== true) {
              return NextResponse.json(
                { error: 'Tu cuenta no está activa. Por favor, verifica tu email o contacta a soporte.' },
                { status: 403 }
              );
            }
            
            return NextResponse.json({
              success: true,
              user: {
                id: userId,
                email: subUserData.email || decodedToken.email || '',
                name: subUserData.name || subUserData.email || 'Usuario',
                role: 'dealer',
                tenantId: tenantId,
              },
            });
          }
        }
      }
      
      return NextResponse.json(
        { error: 'Usuario no encontrado en la base de datos o no tiene permisos de dealer' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (!userData) {
      return NextResponse.json(
        { error: 'Datos de usuario incompletos' },
        { status: 500 }
      );
    }

    // Verificar que sea dealer
    if (userData.role !== 'dealer') {
      console.log('❌ Usuario no es dealer. Rol:', userData.role);
      return NextResponse.json(
        { error: 'Solo dealers pueden acceder aquí. Tu rol actual es: ' + (userData.role || 'no definido') },
        { status: 403 }
      );
    }

    // Verificar que la cuenta esté activa (permitir si no tiene status o si está activo)
    if (userData.status && userData.status !== 'active' && userData.isActive !== true) {
      console.log('❌ Usuario no está activo. Status:', userData.status, 'isActive:', userData.isActive);
      return NextResponse.json(
        { error: 'Tu cuenta no está activa. Por favor, verifica tu email o contacta a soporte.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userData.email || decodedToken.email || '',
        name: userData.name || userData.email || 'Usuario',
        role: userData.role,
        tenantId: userData.tenantId || userId, // Si no tiene tenantId, usar userId como fallback
      },
    });
  } catch (error: any) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json(
      { error: error.message || 'Error al iniciar sesión' },
      { status: 500 }
    );
  }
}


