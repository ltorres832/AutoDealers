export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceMode, isMaintenanceModeActive } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dashboard = searchParams.get('dashboard') as 'admin' | 'dealer' | 'seller' | 'public' | null;
    
    const isActive = await isMaintenanceModeActive();
    const mode = await getMaintenanceMode();
    
    if (!mode) {
      return NextResponse.json({
        enabled: false,
        message: '',
      });
    }
    
    // Verificar si el dashboard está afectado
    const isAffected = !dashboard || mode.affectedDashboards.includes(dashboard);
    
    return NextResponse.json({
      enabled: isActive && isAffected,
      message: mode.message,
      currentEnd: mode.currentEnd?.toISOString(),
      scheduledEnd: mode.scheduledEnd?.toISOString(),
      affectedDashboards: mode.affectedDashboards,
    });
  } catch (error: any) {
    console.error('Error fetching maintenance status:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener estado de mantenimiento' },
      { status: 500 }
    );
  }
}


