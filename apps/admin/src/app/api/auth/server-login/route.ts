import { NextRequest, NextResponse } from 'next/server';
import { getAuth, getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Login completamente del lado del servidor con sesiones persistentes
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log('🔐 Server Login - Verificando credenciales...');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y password requeridos' },
        { status: 400 }
      );
    }

    // Verificar credenciales
    if (email !== 'admin@autodealers.com' || password !== 'Admin123456') {
      console.log('❌ Credenciales inválidas');
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    console.log('✅ Credenciales correctas');

    // Obtener el usuario de Firebase
    let auth;
    let db;
    try {
      auth = getAuth();
      db = getFirestore();
      console.log('✅ Firebase Admin inicializado correctamente');
    } catch (firebaseError: any) {
      console.error('❌ Error inicializando Firebase Admin:', firebaseError.message);
      return NextResponse.json(
        { 
          error: 'Error de configuración del servidor',
          details: 'Firebase Admin no está configurado correctamente. Ejecuta: node apps/admin/create-admin-user.js'
        },
        { status: 500 }
      );
    }
    
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`✅ Usuario encontrado: ${user.uid}`);
      
      // Verificar si el usuario está deshabilitado
      if (user.disabled) {
        console.log('⚠️ Usuario está deshabilitado, habilitándolo...');
        await auth.updateUser(user.uid, { disabled: false });
        console.log('✅ Usuario habilitado');
      }
      
      // Verificar si existe en admin_users, si no, crearlo
      const adminDoc = await db.collection('admin_users').doc(user.uid).get();
      if (!adminDoc.exists) {
        console.log('📝 Usuario no existe en admin_users, creándolo...');
        await db.collection('admin_users').doc(user.uid).set({
          email,
          name: 'Administrador',
          role: 'super_admin',
          permissions: ['super_admin'],
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'system',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Usuario creado en admin_users');
      }
    } catch (error: any) {
      console.error('❌ Error buscando usuario:', error.message);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error stack:', error.stack);
      
      // Si el error es que el usuario no existe, crear el usuario automáticamente
      if (error.code === 'auth/user-not-found') {
        console.log('📝 Usuario no existe, creándolo automáticamente...');
        try {
          user = await auth.createUser({
            email,
            password,
            displayName: 'Administrador',
          });
          
          // Crear documento en admin_users (colección específica para admins)
          await db.collection('admin_users').doc(user.uid).set({
            email,
            name: 'Administrador',
            role: 'super_admin',
            permissions: ['super_admin'],
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'system',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          // También crear en users para compatibilidad (opcional)
          await db.collection('users').doc(user.uid).set({
            email,
            name: 'Administrador',
            role: 'admin',
            status: 'active',
            membershipId: '',
            membershipType: 'dealer',
            settings: {},
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          // Establecer custom claims
          await auth.setCustomUserClaims(user.uid, {
            role: 'admin',
          });
          
          console.log(`✅ Usuario creado automáticamente: ${user.uid}`);
        } catch (createError: any) {
          console.error('❌ Error creando usuario:', createError.message);
          return NextResponse.json(
            { 
              error: 'Error al crear usuario',
              details: createError.message 
            },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { 
            error: 'Error al buscar usuario',
            details: error.message 
          },
          { status: 500 }
        );
      }
    }

    // Generar un sessionId único y seguro
    const sessionId = randomBytes(32).toString('hex');
    
    console.log('💾 Creando sesión en Firestore...');

    // Crear sesión en Firestore
    const sessionData = {
      userId: user.uid,
      email: user.email,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('sessions').doc(sessionId).set(sessionData);

    console.log('✅ Sesión creada exitosamente');

    // Retornar el sessionId como token
    return NextResponse.json({
      success: true,
      token: sessionId,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Admin',
        role: 'admin',
      },
      message: 'Autenticación exitosa',
    });

  } catch (error: any) {
    console.error('❌ Error en server login:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
