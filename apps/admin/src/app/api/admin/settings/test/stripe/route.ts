export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { StripeService } from '@autodealers/billing';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener credenciales de Stripe
    const credentialsDoc = await db.collection('system_settings').doc('credentials').get();
    const credentials = credentialsDoc.exists ? (credentialsDoc.data() || {}) : {};
    
    const stripeSecretKey = credentials.stripeSecretKey;
    
    if (!stripeSecretKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Stripe Secret Key no configurada' 
      }, { status: 400 });
    }

    try {
      // Probar conexión con Stripe
      const stripeService = new StripeService(stripeSecretKey);
      
      // Intentar obtener información de la cuenta
      // En Stripe, podemos usar cualquier endpoint simple para verificar la conexión
      // Por ejemplo, listar productos (endpoint simple y seguro)
      const stripe = (stripeService as any).stripe;
      await stripe.products.list({ limit: 1 });

      return NextResponse.json({ 
        success: true, 
        message: 'Conexión con Stripe exitosa' 
      });
    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      return NextResponse.json({ 
        success: false, 
        error: stripeError.message || 'Error al conectar con Stripe' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error testing Stripe connection:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}





