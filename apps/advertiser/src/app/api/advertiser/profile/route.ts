import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAdvertiserById } from '@autodealers/core';
import { getFirestore, getStorage } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

// GET - Obtener perfil
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const advertiser = await getAdvertiserById(auth.userId);
    
    if (!advertiser) {
      return NextResponse.json(
        { error: 'Anunciante no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ advertiser });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar perfil
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      companyName,
      contactName,
      phone,
      website,
      industry,
    } = body;

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (companyName !== undefined) updateData.companyName = companyName;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (industry !== undefined) updateData.industry = industry;

    await db.collection('advertisers').doc(auth.userId).update(updateData);

    // Actualizar displayName en Auth si cambió contactName
    if (contactName !== undefined) {
      const { getAuth } = await import('@autodealers/core');
      const authInstance = getAuth();
      await authInstance.updateUser(auth.userId, {
        displayName: contactName,
      });
    }

    const updatedAdvertiser = await getAdvertiserById(auth.userId);

    return NextResponse.json({
      success: true,
      advertiser: updatedAdvertiser,
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Subir logo
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo no debe exceder 5MB' },
        { status: 400 }
      );
    }

    const storage = getStorage();
    const bucket = storage.bucket();
    const fileName = `advertisers/${auth.userId}/logo/${Date.now()}_${file.name}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const fileRef = bucket.file(fileName);
    await fileRef.save(fileBuffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Hacer público el archivo
    await fileRef.makePublic();

    const logoUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Actualizar en Firestore
    await db.collection('advertisers').doc(auth.userId).update({
      logoUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      logoUrl,
    });
  } catch (error: any) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

