import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - carga dinámica para evitar errores de tipos en build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createUser, createTenant, getTenantBySubdomain, getUserByReferralCode, getFirestore } = require('@autodealers/core') as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getMembershipById, hasFeature } = require('@autodealers/billing') as any;

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, subdomain, phone, membershipId, referralCode } = body;
    
    // Obtener referralCode de query params si no viene en body
    const { searchParams } = new URL(request.url);
    const refCode = referralCode || searchParams.get('ref');

    // Validaciones básicas
    if (!name || !email || !password || !membershipId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
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

    if (membership.type !== 'dealer') {
      return NextResponse.json(
        { error: 'Membresía inválida para dealers' },
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

    // Crear tenant
    const tenant = await createTenant(
      name,
      'dealer',
      finalSubdomain,
      membershipId
    );

    // Crear usuario
    const user = await createUser(
      email,
      password,
      name,
      'dealer',
      tenant.id,
      undefined, // dealerId (no aplica para dealers)
      membershipId
    );

    // Guardar código de referido si existe
    if (refCode) {
      const referrerId = await getUserByReferralCode(refCode);
      if (referrerId && referrerId !== user.id) {
        // Guardar referencia en el usuario
        await db.collection('users').doc(user.id).update({
          referredBy: referrerId,
          referralCodeUsed: refCode,
          updatedAt: require('firebase-admin').firestore.FieldValue.serverTimestamp(),
        } as any);
      }
    }

    // TODO: Aquí se debería crear la suscripción en Stripe
    // Cuando se detecte el pago, se procesará el referido en el webhook

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
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
    console.error('Error registering dealer:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Error al registrar dealer',
      },
      { status: 500 }
    );
  }
}





