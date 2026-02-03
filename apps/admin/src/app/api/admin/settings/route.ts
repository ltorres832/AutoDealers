export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener configuración del sistema (colección global)
    const settingsDoc = await db.collection('system_settings').doc('main').get();

    if (!settingsDoc.exists) {
      // Retornar configuración por defecto si no existe
      return NextResponse.json({
        settings: getDefaultSettings(),
      });
    }

    return NextResponse.json({
      settings: settingsDoc.data(),
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings are required' },
        { status: 400 }
      );
    }

    // Guardar configuración en colección global
    await db.collection('system_settings').doc('main').set({
      ...settings,
      updatedAt: new Date(),
      updatedBy: auth.userId,
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada exitosamente',
    });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: error.message || 'Error al guardar configuración' },
      { status: 500 }
    );
  }
}

function getDefaultSettings() {
  return {
    vehicleStates: {
      enabled: true,
      allowedStates: ['AVAILABLE', 'IN_NEGOTIATION', 'SOLD_PENDING_VERIFICATION', 'SOLD_VERIFIED', 'SOLD_EXTERNAL'],
    },
    purchaseIntent: {
      enabled: true,
      requireInteraction: true,
      minInteractionTime: 1,
      autoVerify: false,
      fraudThreshold: 30,
    },
    antifraud: {
      enabled: true,
      checkClientCreation: true,
      checkIPMatch: true,
      checkInteractionTime: true,
      checkExternalSales: true,
      checkDuplicateVIN: true,
      checkMultipleSales: true,
      autoFlagThreshold: 31,
      autoSuspendThreshold: 61,
    },
    certificates: {
      enabled: true,
      autoGenerate: true,
      includeQR: true,
      emailToClient: true,
    },
    roadside: {
      enabled: true,
      durationMonths: 6,
      autoActivate: true,
    },
    partners: {
      insurance: {
        enabled: true,
        visible: false,
        referralFee: 0,
      },
      banks: {
        enabled: true,
        visible: false,
        referralFee: 0,
      },
      roadside: {
        enabled: true,
        visible: false,
        referralFee: 0,
      },
    },
    earnings: {
      enabled: true,
      visibleToAdmin: true,
      autoTrack: true,
    },
    dashboard: {
      showKPIs: true,
      showFraudAlerts: true,
      showEarnings: true,
      showTopDealers: true,
    },
  };
}
