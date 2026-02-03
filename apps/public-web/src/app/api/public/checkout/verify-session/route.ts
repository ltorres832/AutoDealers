import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID is required' },
      { status: 400 }
    );
  }

  try {

    const stripe = await getStripeInstance();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verificar si el pago está completo
    const paid = session.payment_status === 'paid';
    
    // NO verificar membresía aquí - solo verificar el pago
    // El webhook se encargará de activar la membresía
    // Esto evita problemas de timing y errores de Firebase Auth
    let membershipActive = false;
    
    // Opcional: intentar verificar membresía solo si el pago está pagado
    // Pero no bloquear si hay errores
    if (paid && session.metadata?.userId && session.metadata?.tenantId) {
      try {
        const { getFirestore } = await import('@autodealers/core');
        const db = getFirestore();
        
        // Verificar que existe una suscripción activa para este tenant
        const subscriptionSnapshot = await db
          .collection('subscriptions')
          .where('tenantId', '==', session.metadata.tenantId)
          .where('status', '==', 'active')
          .limit(1)
          .get();
        
        membershipActive = !subscriptionSnapshot.empty;
        
        console.log('🔍 [VERIFY SESSION] Verificación de membresía:', {
          sessionId,
          paid,
          tenantId: session.metadata.tenantId,
          membershipActive,
          subscriptionFound: !subscriptionSnapshot.empty,
        });
      } catch (membershipError: any) {
        // Silenciar errores de verificación de membresía - no son críticos
        // El webhook procesará el pago y activará la membresía
        membershipActive = false;
      }
    }

    return NextResponse.json({
      verified: true,
      paid,
      membershipActive, // Nuevo campo: indica si la membresía está activa
      status: session.status,
      subscriptionId: session.subscription,
    });
  } catch (error: any) {
    console.error('❌ [VERIFY SESSION] Error verifying checkout session:', error);
    console.error('❌ [VERIFY SESSION] Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    
    // Si el error es de Firebase Auth, ignorarlo y retornar solo el estado del pago
    if (error?.code?.includes('auth') || error?.message?.includes('auth')) {
      console.warn('⚠️ [VERIFY SESSION] Error de Firebase Auth ignorado, retornando solo estado de pago');
      // Intentar obtener al menos el estado del pago desde Stripe
      try {
        const stripe = await getStripeInstance();
        const session = await stripe.checkout.sessions.retrieve(sessionId!);
        return NextResponse.json({
          verified: true,
          paid: session.payment_status === 'paid',
          membershipActive: false, // No podemos verificar, asumir false
          status: session.status,
          subscriptionId: session.subscription,
          warning: 'No se pudo verificar la membresía, pero el pago está procesado',
        });
      } catch (stripeError: any) {
        console.error('❌ [VERIFY SESSION] Error obteniendo sesión de Stripe:', stripeError);
      }
    }
    
    return NextResponse.json(
      {
        error: 'Error al verificar la sesión',
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}

