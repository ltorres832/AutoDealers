import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, normalizeLoginEmail, syncLoginEmail } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener información del tenant
    const tenantDoc = await db.collection('tenants').doc(auth.tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantData = tenantDoc.data();
    
    // Obtener información del usuario para calificaciones
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();
    
    const profile = {
      name: tenantData?.name || '',
      companyName: tenantData?.companyName || '', // Nombre de la compañía (solo para dealers)
      email:
        (typeof userData?.email === 'string' && userData.email.trim()) ||
        tenantData?.contactEmail ||
        '',
      phone: tenantData?.contactPhone || '',
      address: tenantData?.address?.street || '',
      city: tenantData?.address?.city || '',
      state: tenantData?.address?.state || '',
      zipCode: tenantData?.address?.zipCode || '',
      country: tenantData?.address?.country || '',
      website: tenantData?.website || '',
      description: tenantData?.description || '',
      businessHours: tenantData?.businessHours || '',
      socialMedia: tenantData?.socialMedia || {},
      // Calificaciones
      dealerRating: userData?.dealerRating || 0,
      dealerRatingCount: userData?.dealerRatingCount || 0,
    };

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      companyName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      website,
      description,
      businessHours,
      socialMedia,
    } = body;

    const userRef = db.collection('users').doc(auth.userId);
    const userSnap = await userRef.get();
    const userRow = userSnap.data() || {};

    if (email !== undefined && typeof email === 'string' && email.trim()) {
      const normalizedEmail = normalizeLoginEmail(email);
      const currentEmail =
        typeof userRow.email === 'string' ? normalizeLoginEmail(userRow.email) : '';
      if (normalizedEmail !== currentEmail) {
        try {
          await syncLoginEmail(auth.userId, normalizedEmail);
        } catch (syncErr: unknown) {
          const code =
            syncErr && typeof syncErr === 'object' && 'code' in syncErr
              ? (syncErr as { code?: string }).code
              : '';
          const msg =
            code === 'auth/email-already-exists'
              ? 'Ese email ya está en uso en otra cuenta'
              : syncErr instanceof Error
                ? syncErr.message
                : 'No se pudo actualizar el email de inicio de sesión';
          return NextResponse.json({ error: msg }, { status: 400 });
        }
      }
      await userRef.update({
        email: normalizedEmail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    if (phone !== undefined) {
      await userRef.update({
        phone: phone || admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Actualizar tenant
    await db.collection('tenants').doc(auth.tenantId).update({
      name: name || admin.firestore.FieldValue.delete(),
      companyName: companyName || admin.firestore.FieldValue.delete(), // Nombre de la compañía
      contactEmail: email || admin.firestore.FieldValue.delete(),
      contactPhone: phone || admin.firestore.FieldValue.delete(),
      address: {
        street: address || '',
        city: city || '',
        state: state || '',
        zipCode: zipCode || '',
        country: country || '',
      },
      website: website || admin.firestore.FieldValue.delete(),
      description: description || admin.firestore.FieldValue.delete(),
      businessHours: businessHours || admin.firestore.FieldValue.delete(),
      socialMedia: socialMedia || {},
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


