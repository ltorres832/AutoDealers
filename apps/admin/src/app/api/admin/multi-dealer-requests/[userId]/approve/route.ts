export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getAuth } from '@autodealers/shared';
import {
  createUser,
  finalizeUserRegistration,
  generateReferralCode,
  resolveReferrerByCode,
  notifyUser,
  sendPasswordResetEmailViaProvider,
} from '@autodealers/core';
import { resolveDealerUrl, resolvePublicWebUrl } from '@autodealers/shared/platform-urls';
import * as admin from 'firebase-admin';

const db = getFirestore();
const auth = getAuth();

const DEFAULT_DEALER_SETTINGS = {
  notifications: {
    push: true,
    email: true,
    sms: true,
    whatsapp: true,
    sound: true,
  },
  businessNotifications: {
    newLeads: true,
    newMessages: true,
    newAppointments: true,
    newSales: true,
    documents: true,
    tasks: true,
    catalogInterest: true,
    systemAlerts: true,
  },
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json().catch(() => ({}));
    const { reviewNotes } = body;

    const requestRef = db.collection('multi_dealer_requests').doc(userId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    const requestData = requestDoc.data() || {};
    if (requestData.status !== 'pending') {
      return NextResponse.json({ error: 'La solicitud ya fue procesada' }, { status: 400 });
    }

    const isLead = requestData.isLead === true;

    // ─────────────────────────────────────────────────────────────
    // NUEVO FLUJO: la solicitud es un lead (sin cuenta). Al aprobar se
    // crea la cuenta master_dealer y se envía email para poner contraseña.
    // ─────────────────────────────────────────────────────────────
    if (isLead) {
      const email = String(requestData.email || '').trim().toLowerCase();
      const name = String(requestData.name || '').trim();
      const phone = requestData.phone ? String(requestData.phone).trim() : null;

      if (!email || !name) {
        return NextResponse.json(
          { error: 'La solicitud no tiene nombre o correo válidos' },
          { status: 400 }
        );
      }

      // Evitar duplicados: si ya existe una cuenta con ese correo, no crear otra
      try {
        await auth.getUserByEmail(email);
        return NextResponse.json(
          { error: 'Ya existe una cuenta registrada con este correo. Revísala en Usuarios.' },
          { status: 400 }
        );
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code !== 'auth/user-not-found') {
          throw err;
        }
      }

      // Contraseña temporal aleatoria (el usuario la reemplaza con el email)
      const tempPassword = randomBytes(24).toString('base64url');

      const newUser = await createUser(email, tempPassword, name, 'master_dealer');

      // Resolver referido (si vino en la solicitud) sin sobrescribir el código propio
      let referredBy: string | null = null;
      let referredByType: 'user' | 'affiliate' | null = null;
      let referralCodeUsed: string | null = null;
      const refCode = requestData.referralCodeUsed
        ? String(requestData.referralCodeUsed).trim()
        : '';
      if (refCode) {
        const referrer = await resolveReferrerByCode(refCode);
        if (referrer && referrer.id !== newUser.id) {
          referredBy = referrer.id;
          referredByType = referrer.type;
          referralCodeUsed = refCode;
        }
      }

      // Generar código de referido propio (createUser no lo hace para master_dealer)
      let ownReferralCode: string | null = null;
      try {
        ownReferralCode = await generateReferralCode(newUser.id);
      } catch (refErr) {
        console.warn('No se pudo generar código de referido para master_dealer:', refErr);
      }

      await db.collection('users').doc(newUser.id).update({
        role: 'master_dealer',
        membershipType: 'dealer',
        status: 'active',
        multiDealerAccess: true,
        approvedByAdmin: true,
        createdByAdmin: true,
        mustChangePassword: true,
        adminMembershipSelectionRequired: true,
        settings: DEFAULT_DEALER_SETTINGS,
        platformTermsAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(phone ? { phone } : {}),
        ...(ownReferralCode ? { referralCode: ownReferralCode } : {}),
        ...(referredBy
          ? { referredBy, referredByType, referralCodeUsed }
          : {}),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } as Record<string, unknown>);

      // Vincular perfiles de autenticación entre apps
      try {
        await finalizeUserRegistration(newUser.id);
      } catch (finErr) {
        console.warn('finalizeUserRegistration falló (no bloqueante):', finErr);
      }

      // Marcar la solicitud como aprobada y enlazar la cuenta creada
      await requestRef.update({
        status: 'approved',
        userId: newUser.id,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        reviewedBy: authUser.userId,
        reviewNotes: reviewNotes || null,
      });

      // Enviar email para que el usuario cree su contraseña (portal dealer)
      let emailSent = false;
      try {
        const result = await sendPasswordResetEmailViaProvider({
          email,
          appName: 'AutoDealersOnline Dealer',
          appKey: 'dealer',
          appBaseUrl: resolveDealerUrl(),
          actionBaseUrl: resolvePublicWebUrl(),
          loginPath: '/login',
        });
        emailSent = result.sent && !result.skipped;
        if (!result.sent) {
          console.warn('Email para poner contraseña no enviado:', result.error);
        }
      } catch (mailErr) {
        console.warn('Error enviando email de contraseña:', mailErr);
      }

      return NextResponse.json({
        success: true,
        message: emailSent
          ? 'Solicitud aprobada. Se creó la cuenta y se envió un email para crear la contraseña.'
          : 'Solicitud aprobada y cuenta creada, pero no se pudo enviar el email de contraseña. Revisa la configuración de correo o usa "Recuperar contraseña".',
        userId: newUser.id,
        emailSent,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // FLUJO LEGADO: la solicitud ya tenía una cuenta deshabilitada creada
    // en el registro público. Se habilita por 48 horas (comportamiento previo).
    // ─────────────────────────────────────────────────────────────
    const now = new Date();
    const approvedUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    await requestRef.update({
      status: 'approved',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: authUser.userId,
      reviewNotes: reviewNotes || null,
      approvedUntil: admin.firestore.Timestamp.fromDate(approvedUntil),
    });

    await auth.updateUser(userId, { disabled: false });

    await db.collection('users').doc(userId).update({
      status: 'active',
      multiDealerAccess: true,
      multiDealerAccessUntil: admin.firestore.Timestamp.fromDate(approvedUntil),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const userDoc = await db.collection('users').doc(userId).get();
    const userTenantId = userDoc.data()?.tenantId as string | undefined;

    if (userTenantId) {
      await notifyUser(userTenantId, userId, {
        type: 'system_alert',
        title: 'Solicitud Multi Dealer Aprobada',
        message: `Tu solicitud Multi Dealer ha sido aprobada. Tienes acceso por 48 horas hasta ${approvedUntil.toLocaleString('es-ES')}`,
        metadata: {
          approvedUntil: approvedUntil.toISOString(),
          membershipId: requestData.membershipId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitud aprobada exitosamente',
      approvedUntil: approvedUntil.toISOString(),
    });
  } catch (error: unknown) {
    console.error('Error approving multi dealer request:', error);
    const message = error instanceof Error ? error.message : 'Error al aprobar solicitud';
    return NextResponse.json({ error: 'Error al aprobar solicitud', details: message }, { status: 500 });
  }
}
