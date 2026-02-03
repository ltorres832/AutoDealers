export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createMembership, getMemberships, updateMembership, getMembershipById } from '@autodealers/billing';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'dealer' | 'seller' | null;
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    console.log(`🔍 GET /api/admin/memberships - type: ${type}, activeOnly: ${activeOnly}`);
    
    // Verificar directamente en Firestore primero
    try {
      const directCheck = await db.collection('memberships').limit(10).get();
      console.log(`🔍 Verificación directa: ${directCheck.size} membresías en Firestore`);
      if (directCheck.size > 0) {
        directCheck.docs.forEach((doc, i) => {
          const data = doc.data();
          console.log(`  ${i + 1}. ID: ${doc.id}, Nombre: ${data.name}, Tipo: ${data.type}, Activa: ${data.isActive}, Precio: ${data.price}`);
        });
      }
    } catch (checkError) {
      console.error('Error en verificación directa:', checkError);
    }
    
    let memberships;
    try {
      // Si se solicita solo activas, usar getActiveMemberships
      if (activeOnly) {
        const { getActiveMemberships } = await import('@autodealers/billing');
        memberships = await getActiveMemberships(type || undefined);
        console.log(`📦 getActiveMemberships retornó ${memberships.length} membresías`);
      } else {
        // Para admin, mostrar todas (activas e inactivas)
        memberships = await getMemberships(type || undefined);
        console.log(`📦 getMemberships retornó ${memberships.length} membresías`);
        
        // Log detallado de cada membresía retornada
        if (memberships.length > 0) {
          console.log(`📋 Detalles de membresías retornadas:`);
          memberships.forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.name} (${m.type}) - $${m.price} - Activa: ${m.isActive} - ID: ${m.id}`);
          });
        }
      }
    } catch (error: any) {
      // Si hay un error (como índice faltante), intentar fallback
      console.error('❌ Error fetching memberships from Firestore:', error);
      console.error('Stack:', error.stack);
      try {
        // Fallback: obtener todas directamente de Firestore
        console.log('🔄 Intentando fallback directo de Firestore...');
        const snapshot = await db.collection('memberships').get();
        console.log(`📊 Fallback: Encontradas ${snapshot.size} membresías en Firestore`);
        
        memberships = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
          };
        });
        
        // Filtrar por tipo si se especificó
        if (type) {
          memberships = memberships.filter((m: any) => m.type === type);
        }
        
        // Filtrar por activas si se solicitó
        if (activeOnly) {
          memberships = memberships.filter((m: any) => m.isActive === true);
        }
        
        // Ordenar por precio
        memberships.sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
        
        console.log(`✅ Fallback: Retornando ${memberships.length} membresías`);
      } catch (fallbackError: any) {
        console.error('❌ Error in fallback:', fallbackError);
        console.error('Stack:', fallbackError.stack);
        return NextResponse.json({ memberships: [] });
      }
    }

    // Si no hay membresías, devolver array vacío
    if (!memberships || memberships.length === 0) {
      console.warn(`⚠️ GET /api/admin/memberships: No se encontraron membresías`);
      // Verificar directamente en Firestore
      try {
        const directCheck = await db.collection('memberships').limit(5).get();
        console.log(`🔍 Verificación directa: ${directCheck.size} membresías en Firestore`);
        if (directCheck.size > 0) {
          directCheck.docs.forEach((doc, i) => {
            const data = doc.data();
            console.log(`  ${i + 1}. ${data.name} (${data.type}) - Activa: ${data.isActive}`);
          });
        }
      } catch (checkError) {
        console.error('Error en verificación directa:', checkError);
      }
      return NextResponse.json({ memberships: [] });
    }
    
    console.log(`✅ GET /api/admin/memberships: Retornando ${memberships.length} membresías`);

    // Agregar conteo de tenants usando cada membresía
    try {
      const membershipsWithCount = await Promise.all(
        memberships.map(async (membership) => {
          try {
            const snapshot = await db
              .collection('tenants')
              .where('membershipId', '==', membership.id)
              .get();

            return {
              ...membership,
              tenantCount: snapshot.size,
            };
          } catch (error) {
            // Si hay error al contar tenants, devolver membresía sin count
            console.error(`Error counting tenants for membership ${membership.id}:`, error);
            return {
              ...membership,
              tenantCount: 0,
            };
          }
        })
      );

      return NextResponse.json({ memberships: membershipsWithCount });
    } catch (error) {
      // Si hay error al contar, devolver membresías sin count
      console.error('Error counting tenants for memberships:', error);
      const membershipsWithZeroCount = memberships.map((m) => ({
        ...m,
        tenantCount: 0,
      }));
      return NextResponse.json({ memberships: membershipsWithZeroCount });
    }
  } catch (error) {
    console.error('Error in GET /api/admin/memberships:', error);
    // Siempre devolver array vacío en lugar de error
    return NextResponse.json({ memberships: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, price, currency, billingCycle, features, isActive, createStripeProduct } = body;

    let stripePriceId = body.stripePriceId || '';

    // Si se solicita crear producto en Stripe automáticamente
    if (createStripeProduct && price > 0) {
      try {
        const { getStripeInstance } = await import('@autodealers/core');
        const stripe = await getStripeInstance();

        // Crear producto en Stripe
        const product = await stripe.products.create({
          name: `${name} - ${type === 'dealer' ? 'Dealer' : 'Vendedor'}`,
          description: `Plan de membresía ${name} para ${type === 'dealer' ? 'dealers' : 'vendedores'}`,
          metadata: {
            type: type,
            managedBy: 'autodealers',
          },
        });

        // Crear precio en Stripe
        const stripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(price * 100), // Convertir a centavos
          currency: currency.toLowerCase(),
          recurring: {
            interval: billingCycle === 'monthly' ? 'month' : 'year',
          },
        });

        stripePriceId = stripePrice.id;
        console.log(`✅ Producto Stripe creado: ${product.id}, Precio: ${stripePrice.id}`);
      } catch (stripeError) {
        console.error('Error creando producto en Stripe:', stripeError);
        // Continuar sin Stripe si falla (mejor UX)
        console.warn('⚠️  Membresía se creará sin vinculación a Stripe');
      }
    }

    // Validar que features tenga el formato correcto
    const validatedFeatures = {
      maxSellers: features?.maxSellers || undefined,
      maxInventory: features?.maxInventory || undefined,
      customSubdomain: features?.customSubdomain || false,
      aiEnabled: features?.aiEnabled || false,
      socialMediaEnabled: features?.socialMediaEnabled || false,
      marketplaceEnabled: features?.marketplaceEnabled || false,
      advancedReports: features?.advancedReports || false,
      // Agregar todos los features recibidos
      ...features,
    };

    const membership = await createMembership({
      name,
      type,
      price,
      currency,
      billingCycle,
      features: validatedFeatures as any,
      stripePriceId: stripePriceId,
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json({ 
      membership,
      stripeCreated: !!stripePriceId && createStripeProduct,
      stripePriceId: stripePriceId,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating membership:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Membership ID required' }, { status: 400 });
    }

    await updateMembership(id, updates);

    const updated = await getMembershipById(id);
    return NextResponse.json({ membership: updated });
  } catch (error) {
    console.error('Error updating membership:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

