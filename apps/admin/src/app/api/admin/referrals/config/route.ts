import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getRewardConfig, updateRewardConfig } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    console.log('🔐 Referrals config GET - Auth result:', {
      hasAuth: !!auth,
      role: auth?.role,
      userId: auth?.userId,
    });
    
    if (!auth) {
      console.warn('⚠️ Referrals config GET - No auth found');
      return NextResponse.json(
        { error: 'No autorizado', details: 'No se encontró autenticación' },
        { status: 401 }
      );
    }
    
    if (auth.role !== 'admin') {
      console.warn('⚠️ Referrals config GET - Not admin role:', auth.role);
      return NextResponse.json(
        { error: 'No autorizado', details: `Rol incorrecto: ${auth.role}` },
        { status: 403 }
      );
    }

    // Verificar que el admin existe (opcional, pero útil para debugging)
    const adminUser = await db.collection('admin_users').doc(auth.userId).get();
    if (!adminUser.exists) {
      console.error('❌ Referrals config GET - Admin user not found:', auth.userId);
      return NextResponse.json(
        { error: 'Usuario admin no encontrado', details: `Admin ID: ${auth.userId}` },
        { status: 404 }
      );
    }

    // Todos los admins pueden gestionar configuración de referidos
    const config = await getRewardConfig();

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('❌ Error getting referral config:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const adminUser = await db.collection('admin_users').doc(auth.userId).get();
    if (!adminUser.exists) {
      return NextResponse.json(
        { error: 'Usuario admin no encontrado' },
        { status: 404 }
      );
    }

    // Todos los admins pueden gestionar configuración de referidos
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Configuración requerida' },
        { status: 400 }
      );
    }

    await updateRewardConfig(config);

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada correctamente',
    });
  } catch (error: any) {
    console.error('Error updating referral config:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

