export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAffiliatePartner, notifyPlatformAdminsOfRegistration, sendAffiliateRegistrationWelcomeEmail } from '@autodealers/core';
import { buildAffiliateAuthResponse } from '@/lib/affiliate-session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim();
    const phone = body.phone ? String(body.phone).trim() : undefined;
    const password = String(body.password ?? '');
    const confirmPassword = String(body.confirmPassword ?? password);

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 });
    }

    const affiliate = await createAffiliatePartner({
      name,
      email,
      phone,
      password,
      selfRegistered: true,
    });

    const authUserId = affiliate.authUserId || affiliate.id;

    void notifyPlatformAdminsOfRegistration({
      kind: 'affiliate',
      name: affiliate.name,
      email: affiliate.email,
      title: 'Nuevo afiliado registrado',
      message: `${affiliate.name} (${affiliate.email}) se registró en el portal de afiliados.`,
      adminRoute: '/admin/referrals/affiliates',
      audience: 'platform',
      metadata: {
        affiliateId: affiliate.id,
        referralCode: affiliate.referralCode,
      },
      details: [
        { label: 'Código de referido', value: affiliate.referralCode },
        ...(phone ? [{ label: 'Teléfono', value: phone }] : []),
      ],
    }).catch((err) => console.warn('[affiliate/register] admin notify failed:', err));

    void sendAffiliateRegistrationWelcomeEmail({
      name: affiliate.name,
      email: affiliate.email,
      referralCode: affiliate.referralCode,
      selfRegistered: true,
    }).catch((err) =>
      console.warn('[affiliate/register] welcome email failed:', err instanceof Error ? err.message : err)
    );

    return buildAffiliateAuthResponse(
      {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        referralCode: affiliate.referralCode,
      },
      authUserId
    );
  } catch (error: unknown) {
    console.error('affiliate register:', error);
    const message = error instanceof Error ? error.message : 'Error al registrar';

    if (message.includes('afiliado con este correo')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message || 'Error al registrar' }, { status: 400 });
  }
}
