import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, normalizeLoginEmail, syncLoginEmail } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeSocialMedia(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

function formatBusinessHoursFromFirestore(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantDoc = await db.collection('tenants').doc(auth.tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantData = tenantDoc.data();
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data() || {};
    const dealerManaged = Boolean(userData.dealerId);

    const tenantAddr = (tenantData?.address || {}) as Record<string, string | undefined>;
    const userAddr =
      userData.address && typeof userData.address === 'object' && !Array.isArray(userData.address)
        ? (userData.address as Record<string, string | undefined>)
        : null;

    const name =
      safeTrim(userData.name) ||
      (dealerManaged ? '' : safeTrim(tenantData?.name)) ||
      '';
    const email = safeTrim(userData.email) || safeTrim(tenantData?.contactEmail) || '';
    const phone = safeTrim(userData.phone) || safeTrim(tenantData?.contactPhone) || '';

    const profile = {
      userId: auth.userId,
      name,
      email,
      phone,
      photo: userData.photo || userData.profilePhoto || '',
      bio: safeTrim(userData.bio),
      address:
        safeTrim(userData.address && typeof userData.address === 'string' ? userData.address : userAddr?.street) ||
        (dealerManaged ? '' : safeTrim(tenantAddr.street)),
      city: safeTrim(userData.city) || (dealerManaged ? '' : safeTrim(tenantAddr.city)),
      state: safeTrim(userData.state) || (dealerManaged ? '' : safeTrim(tenantAddr.state)),
      zipCode: safeTrim(userData.zipCode) || (dealerManaged ? '' : safeTrim(tenantAddr.zipCode)),
      country: safeTrim(userData.country) || (dealerManaged ? '' : safeTrim(tenantAddr.country)),
      website: safeTrim(userData.website) || (dealerManaged ? '' : safeTrim(tenantData?.website)),
      description: safeTrim(userData.description) || (dealerManaged ? '' : safeTrim(tenantData?.description)),
      businessHours:
        formatBusinessHoursFromFirestore(userData.businessHours) ||
        (dealerManaged ? '' : formatBusinessHoursFromFirestore(tenantData?.businessHours)),
      socialMedia: dealerManaged
        ? sanitizeSocialMedia(userData.socialMedia)
        : {
            ...sanitizeSocialMedia(tenantData?.socialMedia),
            ...sanitizeSocialMedia(userData.socialMedia),
          },
      title: safeTrim(userData.title) || safeTrim(userData.jobTitle),
      sellerRating: userData.sellerRating || 0,
      sellerRatingCount: userData.sellerRatingCount || 0,
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
      title,
      jobTitle,
    } = body as Record<string, unknown>;

    const tenantRef = db.collection('tenants').doc(auth.tenantId);
    const tenantSnap = await tenantRef.get();
    const tenantRow = tenantSnap.data() || {};
    const userRef = db.collection('users').doc(auth.userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    const userRow = userSnap.data() || {};

    const dealerManaged = Boolean(userRow.dealerId);
    const isIndependentSellerWorkspace = tenantRow.type === 'seller' && !dealerManaged;
    const cleanSocial = sanitizeSocialMedia(socialMedia);

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
    if (photo !== undefined) {
      const photoUrl = safeTrim(photo);
      userUpdate.photo = photoUrl || admin.firestore.FieldValue.delete();
      userUpdate.profilePhoto = photoUrl || admin.firestore.FieldValue.delete();
    }
    if (bio !== undefined) {
      userUpdate.bio = safeTrim(bio) || admin.firestore.FieldValue.delete();
    }
    if (businessHours !== undefined) {
      userUpdate.businessHours =
        safeTrim(businessHours) || admin.firestore.FieldValue.delete();
    }
    if (title !== undefined) {
      userUpdate.title = safeTrim(title) || admin.firestore.FieldValue.delete();
    }
    if (jobTitle !== undefined) {
      userUpdate.jobTitle = safeTrim(jobTitle) || admin.firestore.FieldValue.delete();
    }
    if (description !== undefined) {
      userUpdate.description = safeTrim(description) || admin.firestore.FieldValue.delete();
    }
    if (website !== undefined) {
      userUpdate.website = safeTrim(website) || admin.firestore.FieldValue.delete();
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
    if (socialMedia !== undefined) {
      userUpdate.socialMedia = cleanSocial;
    }

    await userRef.update(userUpdate);

    if (!dealerManaged) {
      const tenantPatch: Record<string, unknown> = {
        address: {
          street: safeTrim(address),
          city: safeTrim(city),
          state: safeTrim(state),
          zipCode: safeTrim(zipCode),
          country: safeTrim(country),
        },
        website: safeTrim(website) || admin.firestore.FieldValue.delete(),
        description: safeTrim(description) || admin.firestore.FieldValue.delete(),
        businessHours: safeTrim(businessHours) || admin.firestore.FieldValue.delete(),
        socialMedia: cleanSocial,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (isIndependentSellerWorkspace) {
        tenantPatch.name = safeTrim(name) || admin.firestore.FieldValue.delete();
        if (email !== undefined) {
          const contactEmail = safeTrim(email) ? normalizeLoginEmail(safeTrim(email)) : admin.firestore.FieldValue.delete();
          tenantPatch.contactEmail = contactEmail;
        }
        tenantPatch.contactPhone = safeTrim(phone) || admin.firestore.FieldValue.delete();
      }

      await tenantRef.update(tenantPatch);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating profile:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
