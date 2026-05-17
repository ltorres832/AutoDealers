import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener información del tenant (puede ser el tenant propio del seller o el del dealer)
    const tenantDoc = await db.collection('tenants').doc(auth.tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantData = tenantDoc.data();

    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

    // Nombre / email / teléfono visibles deben coincidir con la sesión (`users/{uid}`), no solo con el tenant.
    // Antes se tomaban solo del tenant y el layout mostraba `users` → dos personas distintas en pantalla.
    const name =
      (typeof userData?.name === 'string' && userData.name.trim()) ||
      (typeof tenantData?.name === 'string' && tenantData.name) ||
      '';
    const email =
      (typeof userData?.email === 'string' && userData.email.trim()) ||
      (typeof tenantData?.contactEmail === 'string' && tenantData.contactEmail) ||
      '';
    const phone =
      (typeof userData?.phone === 'string' && userData.phone.trim()) ||
      (typeof tenantData?.contactPhone === 'string' && tenantData.contactPhone) ||
      '';

    const addr = (tenantData?.address || {}) as Record<string, string | undefined>;
    const profile = {
      userId: auth.userId,
      name,
      email,
      phone,
      photo: userData?.photo || userData?.profilePhoto || '',
      bio: userData?.bio || '',
      address: typeof addr.street === 'string' ? addr.street : '',
      city: typeof addr.city === 'string' ? addr.city : '',
      state: typeof addr.state === 'string' ? addr.state : '',
      zipCode: typeof addr.zipCode === 'string' ? addr.zipCode : '',
      country: typeof addr.country === 'string' ? addr.country : '',
      website: tenantData?.website || '',
      description: tenantData?.description || '',
      businessHours: tenantData?.businessHours || '',
      socialMedia: tenantData?.socialMedia || {},
      title: (typeof userData?.title === 'string' && userData.title.trim()) ||
        (typeof userData?.jobTitle === 'string' && userData.jobTitle.trim()) ||
        '',
      // Calificaciones
      sellerRating: userData?.sellerRating || 0,
      sellerRatingCount: userData?.sellerRatingCount || 0,
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
      email,
      phone,
      photo,
      bio,
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

    const tenantRef = db.collection('tenants').doc(auth.tenantId);
    const tenantSnap = await tenantRef.get();
    const tenantRow = tenantSnap.data() || {};
    const userRef = db.collection('users').doc(auth.userId);
    const userSnap = await userRef.get();
    const userRow = userSnap.data() || {};

    // Vendedor independiente: el tenant tipo `seller` es su negocio; nombre/email/tel deben ir en users y en tenant.
    const isIndependentSellerWorkspace =
      tenantRow.type === 'seller' && !userRow.dealerId;

    const userUpdate: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name !== undefined) userUpdate.name = name || admin.firestore.FieldValue.delete();
    if (email !== undefined) userUpdate.email = email || admin.firestore.FieldValue.delete();
    if (phone !== undefined) userUpdate.phone = phone || admin.firestore.FieldValue.delete();

    if (photo !== undefined) {
      userUpdate.photo = photo || admin.firestore.FieldValue.delete();
      userUpdate.profilePhoto = photo || admin.firestore.FieldValue.delete();
    }

    if (bio !== undefined) {
      userUpdate.bio = bio || admin.firestore.FieldValue.delete();
    }

    const { title, jobTitle } = body as { title?: string; jobTitle?: string };
    if (title !== undefined) {
      userUpdate.title = title.trim() || admin.firestore.FieldValue.delete();
    }
    if (jobTitle !== undefined) {
      userUpdate.jobTitle = jobTitle.trim() || admin.firestore.FieldValue.delete();
    }

    await userRef.update(userUpdate);

    const tenantPatch: Record<string, unknown> = {
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
    };

    if (isIndependentSellerWorkspace) {
      tenantPatch.name = name || admin.firestore.FieldValue.delete();
      tenantPatch.contactEmail = email || admin.firestore.FieldValue.delete();
      tenantPatch.contactPhone = phone || admin.firestore.FieldValue.delete();
    }
    // Vendedor de un dealer: no tocar nombre ni contacto del tenant (son del concesionario).

    await tenantRef.update(tenantPatch);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


