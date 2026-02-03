import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getAuth } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();
const auth = getAuth();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authData = await verifyAuth(request);
    if (!authData || !authData.tenantId || authData.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener usuarios gestores/asistentes asociados a este seller
    const usersSnapshot = await db
      .collection('users')
      .where('role', 'in', ['assistant', 'manager'])
      .where('sellerId', '==', authData.tenantId)
      .get();

    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        permissions: data.permissions || {},
        createdAt: data.createdAt?.toDate()?.toISOString(),
      };
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, users: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authData = await verifyAuth(request);
    if (!authData || !authData.tenantId || authData.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, role, permissions } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role !== 'assistant' && role !== 'manager') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Validar que al menos un permiso esté seleccionado
    if (!permissions || Object.values(permissions).every((p: any) => !p)) {
      return NextResponse.json({ error: 'At least one permission must be selected' }, { status: 400 });
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
      tenantId: authData.tenantId,
      sellerId: authData.tenantId,
    });

    // Crear documento en Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role,
      tenantId: authData.tenantId,
      sellerId: authData.tenantId,
      status: 'active',
      permissions: permissions || {},
      membershipId: '',
      membershipType: 'seller',
      settings: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      userId: userRecord.uid,
      message: 'Usuario creado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



