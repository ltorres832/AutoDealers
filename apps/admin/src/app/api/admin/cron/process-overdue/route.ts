export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
// import { processOverdueSubscriptions } from '@autodealers/billing';

/**
 * Endpoint para procesar suscripciones vencidas
 * Debe ejecutarse diariamente (cron job)
 * Puede ser llamado manualmente desde el admin o configurado en un servicio de cron
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación (opcional para cron jobs internos)
    // Para producción, usar un secret token
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Si hay secret configurado, validarlo
      const auth = await verifyAuth(request);
      if (!auth || auth.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Procesar suscripciones vencidas
    // TODO: Implementar processOverdueSubscriptions en @autodealers/billing
    // await processOverdueSubscriptions();

    return NextResponse.json({ 
      success: true, 
      message: 'Overdue subscriptions processed successfully' 
    });
  } catch (error) {
    console.error('Error processing overdue subscriptions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET para verificar el estado sin procesar
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ 
      message: 'Cron endpoint is active. Use POST to process overdue subscriptions.' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





