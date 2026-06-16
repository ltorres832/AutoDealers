import { NextRequest, NextResponse } from 'next/server';
import {
  createUser,
  finalizeUserRegistration,
  getUserByReferralCode,
  upsertNewsletterSubscriber,
  announceNewRegistrationOnFacebook,
  isTenantSubdomainSlugAvailable,
  validateTenantSubdomainSlug,
  normalizeLoginEmail,
} from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const db = getFirestore();

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const {
      name,
      email,
      password,
      phone,
      companyName,
      subdomain,
      accountType,
      referralCode,
      taxId,
      address,
      city,
      country,
      website,
      acceptPlatformTerms,
    } = body;

    if (acceptPlatformTerms !== true) {
      return NextResponse.json(
        { error: 'Debes aceptar los términos y condiciones de la plataforma' },
        { status: 400 }
      );
    }

    // Validaciones básicas
    if (!name || !email || !password || !accountType) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeLoginEmail(String(email));
    if (
      normalizedEmail.length < 5 ||
      normalizedEmail.length > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return NextResponse.json(
        { error: 'Correo electrónico inválido' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Validar nombre de compañía para dealers
    if (accountType === 'dealer' && !companyName) {
      return NextResponse.json(
        { error: 'El nombre de la compañía es requerido para dealers' },
        { status: 400 }
      );
    }

    // Validar subdominio solicitado (se activa solo si la membresía incluye customSubdomain)
    let pendingSubdomain: string | null = null;
    if (typeof subdomain === 'string' && subdomain.trim()) {
      const format = validateTenantSubdomainSlug(subdomain);
      if (!format.ok) {
        return NextResponse.json({ error: format.error }, { status: 400 });
      }
      const available = await isTenantSubdomainSlugAvailable(format.slug);
      if (!available) {
        return NextResponse.json({ error: 'El subdominio ya está en uso' }, { status: 400 });
      }
      pendingSubdomain = format.slug;
    }

    // Crear usuario sin membresía (se asignará después)
    const role = accountType === 'dealer' ? 'dealer' : 'seller';

    // Crear tenant primero
    const tenantRef = db.collection('tenants').doc();
    const tenantId = tenantRef.id;

    await tenantRef.set({
      name: accountType === 'dealer' ? companyName : name,
      type: accountType,
      status: 'active',
      subdomain: null,
      ...(pendingSubdomain ? { pendingSubdomain } : {}),
      phone: phone || null,
      taxId: taxId || null,
      address: address || null,
      city: city || null,
      country: country || null,
      website: website || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Crear usuario
    const user = await createUser(
      normalizedEmail,
      password,
      name,
      role,
      tenantId,
      undefined, // dealerId
      undefined  // membershipId - se asignará después
    );

    await db.collection('users').doc(user.id).update({
      platformTermsAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Actualizar tenant con ownerId
    await tenantRef.update({
      ownerId: user.id,
    });

    await finalizeUserRegistration(user.id);

    await upsertNewsletterSubscriber({
      email: normalizedEmail,
      source: 'user_registration',
      name,
      role,
      userId: user.id,
    });

    if (referralCode && typeof referralCode === 'string') {
      const refCode = referralCode.trim();
      if (refCode) {
        const referrerId = await getUserByReferralCode(refCode);
        if (referrerId && referrerId !== user.id) {
          await db.collection('users').doc(user.id).update({
            referredBy: referrerId,
            referralCodeUsed: refCode,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // Facebook: anuncio en página AutoDealers + en página propia si ya está conectada (si no, queda pendiente)
    announceNewRegistrationOnFacebook({
      tenantId,
      userId: user.id,
      displayName: accountType === 'dealer' ? (companyName || name) : name,
      accountType: accountType === 'dealer' ? 'dealer' : 'seller',
      companyName: companyName || undefined,
    }).catch((err) => console.warn('registration Facebook announce:', err));

    // Retornar también email y name para que el frontend pueda usarlos
    return NextResponse.json({
      success: true,
      userId: user.id,
      tenantId,
      userEmail: normalizedEmail,
      userName: name,
      message: 'Cuenta creada exitosamente',
    });
  } catch (error: any) {
    console.error('Error creating account:', error);

    // Manejar errores específicos
    if (error.code === 'auth/email-already-in-use') {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Error al crear la cuenta' },
      { status: 500 }
    );
  }
}
