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
    
    // Obtener información del usuario (foto, bio)
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();
    
    const profile = {
      name: tenantData?.name || '',
      email: tenantData?.contactEmail || '',
      phone: tenantData?.contactPhone || '',
      photo: userData?.photo || userData?.profilePhoto || '',
      bio: userData?.bio || '',
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

    // Actualizar tenant del seller
    await db.collection('tenants').doc(auth.tenantId).update({
      name: name || admin.firestore.FieldValue.delete(),
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

    // Actualizar información del usuario (foto, bio)
    if (auth.userId) {
      const userUpdate: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      if (photo !== undefined) {
        userUpdate.photo = photo || admin.firestore.FieldValue.delete();
        userUpdate.profilePhoto = photo || admin.firestore.FieldValue.delete();
      }
      
      if (bio !== undefined) {
        userUpdate.bio = bio || admin.firestore.FieldValue.delete();
      }
      
      await db.collection('users').doc(auth.userId).update(userUpdate);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


