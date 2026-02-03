import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createUser, getUserByReferralCode, getFirestore, getStripeInstance } from '@autodealers/core';
import { createTenant, getTenantBySubdomain } from '@autodealers/core';
import { getMembershipById, SubscriptionService } from '@autodealers/billing';
import { hasFeature } from '@autodealers/billing';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, subdomain, phone, membershipId, accountType, companyName, referralCode, paymentIntentId, subscriptionId } = body;
    
    // Obtener referralCode de query params si no viene en body
    const { searchParams } = new URL(request.url);
    const refCode = referralCode || searchParams.get('ref');

    // Validaciones básicas
    if (!name || !email || !password || !membershipId || !accountType) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Validar tipo de cuenta
    if (accountType !== 'dealer' && accountType !== 'seller') {
      return NextResponse.json(
        { error: 'Tipo de cuenta inválido' },
        { status: 400 }
      );
    }

    // Obtener membresía
    const membership = await getMembershipById(membershipId);
    if (!membership) {
      return NextResponse.json(
        { error: 'Membresía no encontrada' },
        { status: 404 }
      );
    }

    // Validar que la membresía corresponda al tipo de cuenta
    if (membership.type !== accountType) {
      return NextResponse.json(
        { error: `La membresía seleccionada no es válida para ${accountType === 'dealer' ? 'dealers' : 'vendedores'}` },
        { status: 400 }
      );
    }

    // Validar subdominio si la membresía lo permite
    let finalSubdomain: string | undefined = undefined;
    if (hasFeature(membership, 'customSubdomain')) {
      if (!subdomain) {
        return NextResponse.json(
          { error: 'Debes proporcionar un subdominio' },
          { status: 400 }
        );
      }

      // Validar formato
      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        return NextResponse.json(
          {
            error:
              'El subdominio solo puede contener letras minúsculas, números y guiones',
          },
          { status: 400 }
        );
      }

      // Validar que no esté en uso
      const existing = await getTenantBySubdomain(subdomain);
      if (existing) {
        return NextResponse.json(
          { error: 'El subdominio ya está en uso' },
          { status: 400 }
        );
      }

      finalSubdomain = subdomain;
    } else if (subdomain) {
      // Si proporcionó subdominio pero la membresía no lo permite
      return NextResponse.json(
        { error: 'Tu membresía no incluye subdominio personalizado' },
        { status: 400 }
      );
    }

    // Validar que el email no esté en uso
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const existingUser = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      );
    }

    // Crear tenant
    const tenant = await createTenant(
      name,
      accountType,
      finalSubdomain,
      membershipId,
      accountType === 'dealer' ? companyName : undefined // Solo para dealers
    );

    // Crear usuario (esto generará automáticamente el código de referido)
    const user = await createUser(
      email,
      password,
      name,
      accountType,
      tenant.id,
      undefined, // dealerId (no aplica para usuarios independientes)
      membershipId
    );

    // Guardar código de referido si existe (el usuario fue referido por alguien)
    if (refCode) {
      const referrerId = await getUserByReferralCode(refCode);
      if (referrerId && referrerId !== user.id) {
        // Guardar referencia en el usuario
        await db.collection('users').doc(user.id).update({
          referredBy: referrerId,
          referralCodeUsed: refCode,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        } as any);
      }
    }

    // Actualizar tenant con información de contacto si se proporciona
    if (phone) {
      await db.collection('tenants').doc(tenant.id).update({
        contactPhone: phone,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Crear suscripción en Stripe si se proporcionó un paymentIntentId o subscriptionId
    let stripeCustomerId: string | null = null;
    let stripeSubscriptionId: string | null = null;

    if (paymentIntentId || subscriptionId) {
      try {
        const stripe = await getStripeInstance();
        
        // Si hay subscriptionId, obtener la suscripción de Stripe
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          stripeCustomerId = subscription.customer as string;
          stripeSubscriptionId = subscription.id;

          // Verificar que el pago fue exitoso
          const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);
          if (invoice.payment_status !== 'paid') {
            throw new Error('El pago de la suscripción no fue completado');
          }
        } else if (paymentIntentId) {
          // Si hay paymentIntentId, obtener el Payment Intent
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (paymentIntent.status !== 'succeeded') {
            throw new Error('El pago no fue completado');
          }

          // Crear cliente en Stripe si no existe
          let customer: Stripe.Customer;
          const existingCustomers = await stripe.customers.list({
            email: email,
            limit: 1,
          });

          if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
          } else {
            customer = await stripe.customers.create({
              email,
              name,
              metadata: {
                tenantId: tenant.id,
                userId: user.id,
                membershipId,
              },
            });
          }

          stripeCustomerId = customer.id;

          // Crear suscripción si hay stripePriceId
          if (membership.stripePriceId) {
            const { getStripeService } = await import('@autodealers/core');
            const stripeService = await getStripeService();
            const subscriptionService = new SubscriptionService(stripeService);
            
            const subscription = await subscriptionService.createSubscription(
              tenant.id,
              user.id,
              membershipId,
              email,
              name,
              membership.stripePriceId
            );

            stripeSubscriptionId = subscription.stripeSubscriptionId;
          }
        }

        // Guardar información de Stripe en el usuario y tenant
        await db.collection('users').doc(user.id).update({
          stripeCustomerId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        } as any);

        if (stripeSubscriptionId) {
          await db.collection('tenants').doc(tenant.id).update({
            stripeSubscriptionId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (error: any) {
        console.error('Error creando suscripción en Stripe:', error);
        // No fallar el registro si hay error con Stripe, pero registrar el error
        await db.collection('users').doc(user.id).update({
          stripeError: error.message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        } as any);
      }
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          subdomain: tenant.subdomain,
        },
        referralCode: refCode || null,
        userReferralCode: user.referralCode || null, // Código generado para el nuevo usuario
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Error al registrar usuario',
      },
      { status: 500 }
    );
  }
}

