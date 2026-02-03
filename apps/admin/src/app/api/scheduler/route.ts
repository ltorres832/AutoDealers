export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { runScheduledTasks, getSchedulerServiceStatus, startSchedulerService, stopSchedulerService } from '@autodealers/core';

// Endpoint para ejecutar tareas programadas (llamado por cron job)
export async function POST(request: NextRequest) {
  try {
    // Verificar secret para seguridad
    const authHeader = request.headers.get('authorization');
    const secret = process.env.SCHEDULER_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await runScheduledTasks();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Scheduler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Endpoint GET para obtener el estado del scheduler
export async function GET(request: NextRequest) {
  try {
    const status = getSchedulerServiceStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



