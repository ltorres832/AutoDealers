import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getRewardConfig, updateRewardConfig } from '@autodealers/core';

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

