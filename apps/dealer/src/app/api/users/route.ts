import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getAuth } from '@autodealers/core';
import { createNotification } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();
const auth = getAuth();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authData = await verifyAuth(request);
    if (!authData || !authData.tenantId || authData.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener usuarios gestores/administradores asociados a este dealer
    const usersSnapshot = await db
      .collection('users')
      .where('role', 'in', ['manager', 'dealer_admin'])
      .where('dealerId', '==', authData.tenantId)
      .get();

    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        role: data.role,
        status: data.status,
        tenantId: data.tenantId,
        dealerId: data.dealerId,
        permissions: data.permissions || {},
        settings: data.settings || {},
        createdAt: data.createdAt?.toDate()?.toISOString(),
        updatedAt: data.updatedAt?.toDate()?.toISOString(),
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
    if (!authData || !authData.tenantId || authData.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      email, 
      password, 
      phone,
      role, 
      permissions 
    } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validar que el rol sea manager o dealer_admin
    if (role !== 'manager' && role !== 'dealer_admin') {
      return NextResponse.json({ 
        error: 'Invalid role. Must be "manager" or "dealer_admin"' 
      }, { status: 400 });
    }

    // Validar que al menos un permiso esté seleccionado
    if (!permissions || Object.values(permissions).every((p: any) => !p)) {
      return NextResponse.json({ 
        error: 'At least one permission must be selected' 
      }, { status: 400 });
    }

    // Crear usuario en Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone || undefined,
    });

    // Establecer custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      tenantId: authData.tenantId,
      dealerId: authData.tenantId,
    });

    // Crear documento en Firestore con toda la información
    const userData: any = {
      email,
      name,
      role,
      tenantId: authData.tenantId,
      dealerId: authData.tenantId,
      status: 'active',
      permissions: permissions || {},
      membershipId: '',
      membershipType: 'dealer',
      settings: {
        notifications: {
          system: true,
          email: true,
          sms: phone ? true : false,
          whatsapp: phone ? true : false,
        },
        // Configuración para recibir notificaciones del negocio
        businessNotifications: {
          newLeads: true,
          newMessages: true,
          newAppointments: true,
          newSales: true,
          newRequests: true,
          systemAlerts: true,
        },
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (phone) {
      userData.phone = phone;
    }

    await db.collection('users').doc(userRecord.uid).set(userData);

    // Enviar notificación de bienvenida al nuevo usuario
    try {
      await createNotification({
        userId: userRecord.uid,
        tenantId: authData.tenantId,
        type: 'system_alert',
        title: 'Bienvenido a la plataforma',
        message: `Tu cuenta ha sido creada como ${role === 'manager' ? 'Gerente' : 'Administrador'}. Ya puedes acceder y ver las operaciones del negocio.`,
        channels: ['system', 'email'],
      });
    } catch (notifError) {
      console.error('Error sending welcome notification:', notifError);
      // No fallar la creación si la notificación falla
    }

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

