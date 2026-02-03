export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const db = getFirestore();
    const auth = getAuth();
    
    const body = await request.json();
    const {
      name,
      email,
      password,
      phone,
      companyName,
      companyAddress,
      companyCity,
      companyState,
      companyZip,
      companyCountry,
      taxId,
      businessType,
      numberOfLocations,
      yearsInBusiness,
      currentInventory,
      expectedDealers,
      reasonForMultiDealer,
      additionalInfo,
      membershipId,
      referralCode,
    } = body;

    // Validaciones básicas
    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (!companyName || !companyAddress || !companyCity || !companyCountry) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos de la empresa' },
        { status: 400 }
      );
    }

    if (!membershipId) {
      return NextResponse.json(
        { error: 'Debes seleccionar una membresía' },
        { status: 400 }
      );
    }

    // Verificar que la membresía sea Multi Dealer
    const membershipDoc = await db.collection('memberships').doc(membershipId).get();
    if (!membershipDoc.exists) {
      return NextResponse.json(
        { error: 'Membresía no encontrada' },
        { status: 404 }
      );
    }

    const membership = membershipDoc.data();
    if (!membership?.features?.multiDealerEnabled) {
      return NextResponse.json(
        { error: 'La membresía seleccionada no es Multi Dealer' },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    try {
      await auth.getUserByEmail(email);
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      );
    } catch (error: any) {
      // Si el error es que el usuario no existe, continuar
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Crear usuario en Firebase Auth (pero con estado pendiente)
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      disabled: true, // Deshabilitado hasta aprobación
    });

    // Crear documento de usuario en Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      phone,
      role: 'master_dealer',
      status: 'pending', // Pendiente de aprobación
      membershipId,
      membershipType: 'dealer',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      referralCode: referralCode || null,
    });

    // Crear documento de solicitud Multi Dealer
    await db.collection('multi_dealer_requests').doc(userRecord.uid).set({
      userId: userRecord.uid,
      email,
      name,
      phone,
      membershipId,
      // Información de la empresa
      companyName,
      companyAddress,
      companyCity,
      companyState: companyState || null,
      companyZip: companyZip || null,
      companyCountry,
      taxId: taxId || null,
      // Información del negocio
      businessType: businessType || null,
      numberOfLocations: numberOfLocations ? parseInt(numberOfLocations) : null,
      yearsInBusiness: yearsInBusiness ? parseInt(yearsInBusiness) : null,
      currentInventory: currentInventory ? parseInt(currentInventory) : null,
      expectedDealers: expectedDealers ? parseInt(expectedDealers) : null,
      // Información adicional
      reasonForMultiDealer,
      additionalInfo: additionalInfo || null,
      // Estado
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: null,
    });

    // Crear notificación para admin
    await db.collection('notifications').add({
      type: 'multi_dealer_request',
      title: 'Nueva Solicitud Multi Dealer',
      message: `${name} (${email}) ha solicitado acceso Multi Dealer`,
      userId: 'admin', // Notificación para admin
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      data: {
        requestId: userRecord.uid,
        userName: name,
        userEmail: email,
        membershipId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud enviada exitosamente',
      userId: userRecord.uid,
    });
  } catch (error: any) {
    console.error('Error creating multi dealer request:', error);
    return NextResponse.json(
      {
        error: 'Error al crear solicitud',
        details: error.message,
      },
      { status: 500 }
    );
  }
}


