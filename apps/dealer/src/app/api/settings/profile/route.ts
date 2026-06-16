import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthIncludingSeller } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { syncLoginEmail } from '@autodealers/core/user-auth-sync';
import {
  businessHoursForStorage,
  normalizeBusinessHoursForForm,
  normalizeLoginEmail,
  safeTrim,
  sanitizeSocialMedia,
} from '@autodealers/shared/settings-profile';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthIncludingSeller(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantDoc = await db.collection('tenants').doc(auth.tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantData = tenantDoc.data() || {};
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data() || {};
    const dealerManagedSeller = auth.role === 'seller' && Boolean(userData.dealerId);
    const tenantAddr = (tenantData.address || {}) as Record<string, string | undefined>;

    const profile = {
      name:
        safeTrim(userData.name) ||
        (dealerManagedSeller ? '' : safeTrim(tenantData.name)),
      companyName: dealerManagedSeller ? '' : safeTrim(tenantData.companyName),
      email:
        safeTrim(userData.email) ||
        (dealerManagedSeller ? '' : safeTrim(tenantData.contactEmail)),
      phone:
        safeTrim(userData.phone) ||
        (dealerManagedSeller ? '' : safeTrim(tenantData.contactPhone)),
      address:
        safeTrim(typeof userData.address === 'string' ? userData.address : undefined) ||
        (dealerManagedSeller ? '' : safeTrim(tenantAddr.street)),
      city: safeTrim(userData.city) || (dealerManagedSeller ? '' : safeTrim(tenantAddr.city)),
      state: safeTrim(userData.state) || (dealerManagedSeller ? '' : safeTrim(tenantAddr.state)),
      zipCode: safeTrim(userData.zipCode) || (dealerManagedSeller ? '' : safeTrim(tenantAddr.zipCode)),
      country: safeTrim(userData.country) || (dealerManagedSeller ? '' : safeTrim(tenantAddr.country)),
      website: safeTrim(userData.website) || (dealerManagedSeller ? '' : safeTrim(tenantData.website)),
      description:
        safeTrim(userData.description) ||
        (dealerManagedSeller ? '' : safeTrim(tenantData.description)),
      businessHours:
        normalizeBusinessHoursForForm(userData.businessHours) ||
        (dealerManagedSeller ? '' : normalizeBusinessHoursForForm(tenantData.businessHours)),
      socialMedia: dealerManagedSeller
        ? sanitizeSocialMedia(userData.socialMedia)
        : {
            ...sanitizeSocialMedia(tenantData.socialMedia),
            ...sanitizeSocialMedia(userData.socialMedia),
          },
      dealerRating: userData.dealerRating || 0,
      dealerRatingCount: userData.dealerRatingCount || 0,
    };

    return NextResponse.json({ profile });
  } catch (error: unknown) {
    console.error('Error fetching profile:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuthIncludingSeller(request);
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
    } = body as Record<string, unknown>;

    const userRef = db.collection('users').doc(auth.userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    const userRow = userSnap.data() || {};
    const dealerManagedSeller = auth.role === 'seller' && Boolean(userRow.dealerId);
    const cleanSocial = sanitizeSocialMedia(socialMedia);
    const hours = businessHoursForStorage(businessHours);

    const userUpdate: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name !== undefined) {
      userUpdate.name = safeTrim(name) || admin.firestore.FieldValue.delete();
    }
    if (email !== undefined) {
      const normalizedEmail = safeTrim(email) ? normalizeLoginEmail(safeTrim(email)) : '';
      if (normalizedEmail) {
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
        userUpdate.email = normalizedEmail;
      } else {
        userUpdate.email = admin.firestore.FieldValue.delete();
      }
    }
    if (phone !== undefined) {
      userUpdate.phone = safeTrim(phone) || admin.firestore.FieldValue.delete();
    }
    if (description !== undefined) {
      userUpdate.description = safeTrim(description) || admin.firestore.FieldValue.delete();
    }
    if (website !== undefined) {
      userUpdate.website = safeTrim(website) || admin.firestore.FieldValue.delete();
    }
    if (businessHours !== undefined) {
      userUpdate.businessHours = hours || admin.firestore.FieldValue.delete();
    }
    if (socialMedia !== undefined) {
      userUpdate.socialMedia = cleanSocial;
    }
    if (address !== undefined) {
      userUpdate.address = safeTrim(address) || admin.firestore.FieldValue.delete();
    }
    if (city !== undefined) {
      userUpdate.city = safeTrim(city) || admin.firestore.FieldValue.delete();
    }
    if (state !== undefined) {
      userUpdate.state = safeTrim(state) || admin.firestore.FieldValue.delete();
    }
    if (zipCode !== undefined) {
      userUpdate.zipCode = safeTrim(zipCode) || admin.firestore.FieldValue.delete();
    }
    if (country !== undefined) {
      userUpdate.country = safeTrim(country) || admin.firestore.FieldValue.delete();
    }

    await userRef.update(userUpdate);

    if (!dealerManagedSeller) {
      const tenantPatch: Record<string, unknown> = {
        name: safeTrim(name) || admin.firestore.FieldValue.delete(),
        companyName: safeTrim(companyName) || admin.firestore.FieldValue.delete(),
        contactEmail: safeTrim(email)
          ? normalizeLoginEmail(safeTrim(email))
          : admin.firestore.FieldValue.delete(),
        contactPhone: safeTrim(phone) || admin.firestore.FieldValue.delete(),
        address: {
          street: safeTrim(address),
          city: safeTrim(city),
          state: safeTrim(state),
          zipCode: safeTrim(zipCode),
          country: safeTrim(country),
        },
        website: safeTrim(website) || admin.firestore.FieldValue.delete(),
        description: safeTrim(description) || admin.firestore.FieldValue.delete(),
        businessHours: hours || admin.firestore.FieldValue.delete(),
        socialMedia: cleanSocial,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('tenants').doc(auth.tenantId).update(tenantPatch);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating profile:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
