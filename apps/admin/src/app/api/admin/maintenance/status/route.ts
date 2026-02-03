export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceMode, isMaintenanceModeActive } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const isActive = await isMaintenanceModeActive();
    const mode = await getMaintenanceMode();
    
    if (!mode) {
      return NextResponse.json({
        enabled: false,
        message: '',
      });
    }
    
    return NextResponse.json({
      enabled: isActive,
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


