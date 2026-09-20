import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { grantCourtesyDays } from '@/lib/grant-courtesy-days';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await grantCourtesyDays({
      tenantId: body.tenantId,
      userId: body.userId,
      days: body.days,
      adminUserId: auth.userId,
    });

    const typeLabel = result.tenantType === 'dealer' ? 'dealer' : 'vendedor';
    const endLabel = new Date(result.newPeriodEnd).toLocaleDateString('es-PR');
    const stripeNote = result.stripeUpdated
      ? ' Stripe también se actualizó (prueba/periodo extendido).'
      : result.stripeError
        ? ` Firestore ya da acceso hasta ${endLabel}. Stripe no se actualizó: ${result.stripeError}`
        : ' Esta cuenta no tenía suscripción de Stripe; el acceso quedó activo en Firestore.';

    return NextResponse.json({
      success: true,
      ...result,
      message: `Se otorgaron ${result.days} día${result.days === 1 ? '' : 's'} de cortesía al ${typeLabel} “${result.tenantName}”. El acceso queda activo hasta el ${endLabel}.${stripeNote}`,
    });
  } catch (error: unknown) {
    const status = typeof (error as { status?: number })?.status === 'number'
      ? (error as { status: number }).status
      : 500;
    const message = error instanceof Error ? error.message : 'Error al otorgar días de cortesía';
    console.error('Error granting courtesy days:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
