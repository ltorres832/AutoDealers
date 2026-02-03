// API route para gestionar el Gerente F&I designado
// PUT: Designar o remover gerente F&I

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es dealer
    if (user.role !== 'dealer') {
      return NextResponse.json({ error: 'Solo dealers pueden designar gerente F&I' }, { status: 403 });
    }

    // TODO: Verificar membresía - solo Dealers PRO y Enterprise pueden designar gerente F&I
    // Esto se implementará después de verificar la estructura de membresías

    const body = await request.json();
    const { fiManagerId, fiManagerPhone, fiManagerEmail } = body;

    // Si se está designando un gerente, verificar que el usuario existe y pertenece al tenant
    if (fiManagerId) {
      const managerDoc = await db.collection('users').doc(fiManagerId).get();
      if (!managerDoc.exists) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }

      const managerData = managerDoc.data();
      if (managerData?.tenantId !== user.tenantId) {
        return NextResponse.json(
          { error: 'El usuario no pertenece a este tenant' },
          { status: 403 }
        );
      }

      // Verificar que el usuario es dealer o tiene permisos F&I
      if (managerData?.role !== 'dealer' && !managerData?.permissions?.canManageFI) {
        return NextResponse.json(
          { error: 'El usuario debe ser dealer o tener permisos F&I' },
          { status: 400 }
        );
      }
    }

    // Actualizar el tenant con el fiManagerId y datos de contacto
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    if (fiManagerId) {
      updateData.fiManagerId = fiManagerId;
      if (fiManagerPhone) updateData.fiManagerPhone = fiManagerPhone;
      if (fiManagerEmail) updateData.fiManagerEmail = fiManagerEmail;
    } else {
      updateData.fiManagerId = admin.firestore.FieldValue.delete();
      updateData.fiManagerPhone = admin.firestore.FieldValue.delete();
      updateData.fiManagerEmail = admin.firestore.FieldValue.delete();
    }
    
    await db.collection('tenants').doc(user.tenantId).update(updateData);

    return NextResponse.json({
      success: true,
      fiManagerId: fiManagerId || null,
      fiManagerPhone: fiManagerPhone || null,
      fiManagerEmail: fiManagerEmail || null,
      message: fiManagerId
        ? 'Gerente F&I designado correctamente'
        : 'Gerente F&I removido correctamente',
    });
  } catch (error: any) {
    console.error('Error en PUT /api/settings/fi-manager:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar gerente F&I' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es dealer
    if (user.role !== 'dealer') {
      return NextResponse.json({ error: 'Solo dealers pueden ver esta información' }, { status: 403 });
    }

    const tenantDoc = await db.collection('tenants').doc(user.tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const tenantData = tenantDoc.data();
    let fiManager = null;

    if (tenantData?.fiManagerId) {
      const managerDoc = await db.collection('users').doc(tenantData.fiManagerId).get();
      if (managerDoc.exists) {
        const managerData = managerDoc.data();
        fiManager = {
          id: managerDoc.id,
          name: managerData?.name,
          email: managerData?.email,
          role: managerData?.role,
        };
      }
    }

    return NextResponse.json({
      fiManagerId: tenantData?.fiManagerId || null,
      fiManagerPhone: tenantData?.fiManagerPhone || null,
      fiManagerEmail: tenantData?.fiManagerEmail || null,
      fiManager,
    });
  } catch (error: any) {
    console.error('Error en GET /api/settings/fi-manager:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener gerente F&I' },
      { status: 500 }
    );
  }
}

