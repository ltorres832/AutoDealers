export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getMaintenanceMode, updateMaintenanceMode } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mode = await getMaintenanceMode();
    return NextResponse.json(mode || {
      enabled: false,
      message: '',
      affectedDashboards: [],
    });
  } catch (error: any) {
    console.error('Error fetching maintenance mode:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener modo de mantenimiento' },
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
    const {
      enabled,
      message,
      scheduledStart,
      scheduledEnd,
      currentEnd,
      affectedDashboards,
    } = body;

    const mode = await updateMaintenanceMode({
      enabled: enabled === true,
      message: message || 'La plataforma está en mantenimiento. Por favor, vuelve más tarde.',
      scheduledStart: scheduledStart ? new Date(scheduledStart) : undefined,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined,
      currentEnd: currentEnd ? new Date(currentEnd) : undefined,
      affectedDashboards: affectedDashboards || ['admin', 'dealer', 'seller', 'public'],
    });

    return NextResponse.json(mode);
  } catch (error: any) {
    console.error('Error updating maintenance mode:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar modo de mantenimiento' },
      { status: 500 }
    );
  }
}


