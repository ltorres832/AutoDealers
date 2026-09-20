export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import { notifyPlatformAdmins } from '@autodealers/core';
import { resolveAdminUrl } from '@autodealers/shared/platform-urls';
import * as admin from 'firebase-admin';

/**
 * Solicitud de información Multi Dealer (LEAD).
 *
 * Este endpoint NO crea cuentas ni pide contraseña: solo registra una
 * solicitud de información que el equipo revisa en el panel admin
 * (Solicitudes Multi Dealer). La cuenta se crea únicamente al aprobar.
 */
export async function POST(request: NextRequest) {
  try {
    const db = getFirestore();

    const body = await request.json().catch(() => ({}));

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
    const companyCity = typeof body.companyCity === 'string' ? body.companyCity.trim() : '';
    const companyCountry = typeof body.companyCountry === 'string' ? body.companyCountry.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const referralCode =
      typeof body.referralCode === 'string' && body.referralCode.trim()
        ? body.referralCode.trim()
        : null;

    const toCount = (raw: unknown): number | null =>
      raw !== undefined &&
      raw !== null &&
      `${raw}`.trim() !== '' &&
      Number.isFinite(Number(raw))
        ? Math.max(0, Math.trunc(Number(raw)))
        : null;

    const expectedDealers = toCount(body.expectedDealers);
    const numberOfSellers = toCount(body.numberOfSellers);

    // Validaciones (solo datos de contacto, sin contraseña)
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Tu nombre es requerido' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 });
    }
    if (!phone || phone.length < 7) {
      return NextResponse.json({ error: 'Teléfono de contacto requerido' }, { status: 400 });
    }
    if (!companyName) {
      return NextResponse.json({ error: 'El nombre de la empresa es requerido' }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return NextResponse.json(
        { error: 'Cuéntanos un poco sobre tu negocio (al menos 10 caracteres)' },
        { status: 400 }
      );
    }

    // Crear la solicitud como LEAD (sin cuenta asociada todavía)
    const docRef = db.collection('multi_dealer_requests').doc();
    const id = docRef.id;

    await docRef.set({
      // Contacto
      name,
      email,
      phone,
      // Empresa
      companyName,
      companyAddress: null,
      companyCity: companyCity || null,
      companyState: null,
      companyZip: null,
      companyCountry: companyCountry || null,
      taxId: null,
      // Negocio
      businessType: null,
      numberOfLocations: null,
      yearsInBusiness: null,
      currentInventory: null,
      expectedDealers,
      numberOfSellers,
      // Mensaje / necesidad (se muestra en el panel admin)
      reasonForMultiDealer: message,
      additionalInfo: null,
      // Referido (se aplica a la cuenta cuando se aprueba)
      referralCodeUsed: referralCode,
      // Membresía se asigna al aprobar
      membershipId: null,
      // Marca de lead sin cuenta
      isLead: true,
      // Estado
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: null,
    });

    // Notificar a los administradores de la plataforma
    void notifyPlatformAdmins({
      type: 'system_alert',
      title: 'Nueva solicitud de información Multi Dealer',
      message: `${name} (${email}${phone ? ` · ${phone}` : ''}) solicitó información Multi Dealer${
        companyName ? ` — ${companyName}` : ''
      }`,
      audience: 'public',
      metadata: {
        multiDealerRequestId: id,
        route: '/admin/multi-dealer-requests',
      },
    }).catch((err) => console.warn('[multi-dealer request] notify failed', err));

    return NextResponse.json({
      success: true,
      message: 'Solicitud enviada. Nuestro equipo te contactará pronto.',
      requestId: id,
      adminUrl: `${resolveAdminUrl()}/admin/multi-dealer-requests`,
    });
  } catch (error: unknown) {
    console.error('Error creating multi dealer request:', error);
    const message = error instanceof Error ? error.message : 'Error al enviar la solicitud';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
