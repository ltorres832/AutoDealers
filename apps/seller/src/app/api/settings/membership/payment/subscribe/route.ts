import { NextRequest, NextResponse } from 'next/server';

import { verifyAuth } from '@/lib/auth';

import { getStripeInstance } from '@autodealers/core';

import { getFirestore } from '@autodealers/core';

import { getSubscriptionByTenantId, syncMembershipForSubscription } from '@autodealers/billing';

import { getMembershipById, assertSelfServiceMembership } from '@autodealers/billing';

import {

  getMembershipTrialDays,

  isEligibleForMembershipTrial,

  stripeSubscriptionPeriodFields,

} from '@autodealers/billing/membership-trial';

import { dealerManagedBillingResponse } from '@/lib/dealer-managed-guard';

import * as admin from 'firebase-admin';



export const dynamic = 'force-dynamic';



export async function POST(request: NextRequest) {

  try {

    const auth = await verifyAuth(request);

    if (!auth || !auth.tenantId || auth.role !== 'seller') {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    }



    const dealerBlock = dealerManagedBillingResponse(auth);

    if (dealerBlock) return dealerBlock;



    const body = await request.json();

    const { membershipId, paymentMethodId } = body;



    if (!membershipId || !paymentMethodId) {

      return NextResponse.json(

        { error: 'Membership ID and Payment Method ID are required' },

        { status: 400 }

      );

    }



    const stripe = await getStripeInstance();

    const db = getFirestore();



    const membership = await getMembershipById(membershipId);

    if (!membership || !membership.isActive || membership.type !== 'seller') {

      return NextResponse.json({ error: 'Invalid membership' }, { status: 400 });

    }



    const selfServiceCheck = assertSelfServiceMembership(membership);

    if (!selfServiceCheck.ok) {

      return NextResponse.json({ error: selfServiceCheck.error }, { status: 403 });

    }



    if (!membership.stripePriceId) {

      return NextResponse.json(

        { error: 'Membership does not have a Stripe price configured' },

        { status: 400 }

      );

    }



    const userDoc = await db.collection('users').doc(auth.userId).get();

    const userData = userDoc.data();



    let customerId: string;

    const subscription = await getSubscriptionByTenantId(auth.tenantId);

    

    if (subscription?.stripeCustomerId) {

      customerId = subscription.stripeCustomerId;

    } else {

      const customer = await stripe.customers.create({

        email: userData?.email,

        name: userData?.name || userData?.email,

        metadata: {

          tenantId: auth.tenantId,

          userId: auth.userId,

        },

      });

      customerId = customer.id;

    }



    await stripe.paymentMethods.attach(paymentMethodId, {

      customer: customerId,

    });



    await stripe.customers.update(customerId, {

      invoice_settings: {

        default_payment_method: paymentMethodId,

      },

    });



    let taxRateId: string | undefined;

    try {

      const taxRates = await stripe.taxRates.list({ limit: 100 });

      const existingTaxRate = taxRates.data.find(

        (tr) => tr.percentage === 11.5 && tr.active

      );

      if (existingTaxRate) {

        taxRateId = existingTaxRate.id;

      } else {

        const newTaxRate = await stripe.taxRates.create({

          display_name: 'IVA',

          percentage: 11.5,

          inclusive: false,

        });

        taxRateId = newTaxRate.id;

      }

    } catch (error) {

      console.warn('Error obteniendo tax rate:', error);

    }



    let stripeSubscriptionId: string;

    let stripeSubscription: Awaited<ReturnType<typeof stripe.subscriptions.create>>;

    

    if (subscription?.stripeSubscriptionId) {

      const existingStripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

      const primaryItem = existingStripeSub.items.data[0];

      if (!primaryItem?.id) {

        return NextResponse.json(

          { error: 'La suscripción en Stripe no tiene ítems de línea; contacta soporte.' },

          { status: 400 }

        );

      }

      stripeSubscription = await stripe.subscriptions.update(

        subscription.stripeSubscriptionId,

        {

          items: [{ id: primaryItem.id, price: membership.stripePriceId }],

          proration_behavior: 'create_prorations',

          default_payment_method: paymentMethodId,

          metadata: {

            tenantId: auth.tenantId,

            userId: auth.userId,

            membershipId: membershipId,

          },

        }

      );

      stripeSubscriptionId = stripeSubscription.id;

    } else {

      const trialDays = isEligibleForMembershipTrial(subscription)

        ? getMembershipTrialDays()

        : 0;



      stripeSubscription = await stripe.subscriptions.create({

        customer: customerId,

        items: [{ price: membership.stripePriceId }],

        payment_settings: {

          payment_method_types: ['card', 'us_bank_account'],

          save_default_payment_method: 'on_subscription',

        },

        default_payment_method: paymentMethodId,

        expand: ['latest_invoice.payment_intent'],

        ...(taxRateId && { default_tax_rates: [taxRateId] }),

        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),

        metadata: {

          tenantId: auth.tenantId,

          userId: auth.userId,

          membershipId: membershipId,

        },

      });

      stripeSubscriptionId = stripeSubscription.id;

    }



    const periodFields = stripeSubscriptionPeriodFields(stripeSubscription);



    let firestoreSubscriptionId: string;



    const subscriptionPayload = {

      membershipId: membershipId,

      stripeSubscriptionId: stripeSubscriptionId,

      stripeCustomerId: customerId,

      status: periodFields.status,

      currentPeriodStart: admin.firestore.Timestamp.fromDate(periodFields.currentPeriodStart),

      currentPeriodEnd: admin.firestore.Timestamp.fromDate(periodFields.currentPeriodEnd),

      ...(periodFields.trialEndsAt

        ? { trialEndsAt: admin.firestore.Timestamp.fromDate(periodFields.trialEndsAt) }

        : {}),

      ...(periodFields.nextPaymentDate

        ? { nextPaymentDate: admin.firestore.Timestamp.fromDate(periodFields.nextPaymentDate) }

        : {}),

      updatedAt: admin.firestore.FieldValue.serverTimestamp(),

    };



    if (subscription) {

      firestoreSubscriptionId = subscription.id;

      await db.collection('subscriptions').doc(subscription.id).update(subscriptionPayload);

    } else {

      const subscriptionRef = db.collection('subscriptions').doc();

      firestoreSubscriptionId = subscriptionRef.id;

      await subscriptionRef.set({

        id: subscriptionRef.id,

        tenantId: auth.tenantId,

        userId: auth.userId,

        billingSource: 'stripe',

        cancelAtPeriodEnd: false,

        createdAt: admin.firestore.FieldValue.serverTimestamp(),

        ...subscriptionPayload,

      });

    }



    await syncMembershipForSubscription(firestoreSubscriptionId, membershipId);



    return NextResponse.json({

      success: true,

      message:

        periodFields.status === 'trialing'

          ? `Prueba gratuita activada. El primer cobro será el ${periodFields.trialEndsAt?.toLocaleDateString('es')}.`

          : 'Suscripción creada exitosamente',

      subscriptionId: stripeSubscriptionId,

      status: periodFields.status,

      trialEndsAt: periodFields.trialEndsAt?.toISOString() ?? null,

    });

  } catch (error: any) {

    console.error('Error creating subscription:', error);

    return NextResponse.json(

      { error: 'Internal server error', details: error.message },

      { status: 500 }

    );

  }

}


