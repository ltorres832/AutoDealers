// API route para gestionar solicitudes F&I (Seller)
// GET: Obtener todas las solicitudes del vendedor
// POST: Crear una nueva solicitud F&I

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

// Implementación directa para evitar problemas de webpack
function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function createFIRequestDirect(
  tenantId: string,
  requestData: {
    clientId: string;
    employment: any;
    creditInfo: any;
    personalInfo: any;
    status: string;
    sellerNotes?: string;
    createdBy: string;
  }
) {
  const db = getFirestore();
  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc();

  const initialHistory = {
    id: generateRandomId(),
    action: 'created',
    performedBy: requestData.createdBy,
    timestamp: new Date(),
    notes: 'Solicitud F&I creada',
  };

  const request = {
    ...requestData,
    tenantId,
    status: requestData.status || 'draft',
    history: [initialHistory],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log('💾 createFIRequestDirect: Guardando en Firestore...');
  console.log('  createdBy que se guardará:', request.createdBy);
  console.log('  status que se guardará:', request.status);
  console.log('  clientId:', request.clientId);

  await requestRef.set(request);

  console.log('✅ createFIRequestDirect: Solicitud guardada exitosamente');
  console.log('  Document ID:', requestRef.id);

  // Verificar inmediatamente después de guardar
  const verifyDoc = await requestRef.get();
  if (verifyDoc.exists) {
    const verifyData = verifyDoc.data();
    console.log('✅ createFIRequestDirect: Verificación post-guardado OK');
    console.log('  createdBy verificado:', verifyData?.createdBy);
    console.log('  status verificado:', verifyData?.status);
  } else {
    console.error('❌ createFIRequestDirect: ERROR - Documento no existe después de guardar');
  }

  return {
    id: requestRef.id,
    ...requestData,
    tenantId,
    history: [initialHistory],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function getFIRequestsDirect(
  tenantId: string,
  filters?: {
    status?: string;
    clientId?: string;
    createdBy?: string;
  }
) {
  const db = getFirestore();
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests');

  // Aplicar filtros
  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }
  if (filters?.clientId) {
    query = query.where('clientId', '==', filters.clientId);
  }
  if (filters?.createdBy) {
    query = query.where('createdBy', '==', filters.createdBy);
  }

  // Intentar con orderBy, pero si falla por índice faltante, hacer sin orderBy
  let snapshot;
  try {
    snapshot = await query.orderBy('createdAt', 'desc').get();
  } catch (error: any) {
    // Si es error de índice, hacer sin orderBy y ordenar en memoria
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      console.log('⚠️ Índice faltante, obteniendo sin orderBy y ordenando en memoria');
      snapshot = await query.get();
    } else {
      throw error;
    }
  }

  const requests = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      history: (data.history || []).map((h: any) => ({
        ...h,
        timestamp: h.timestamp?.toDate() || new Date(),
      })),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      submittedAt: data.submittedAt?.toDate() || undefined,
      reviewedAt: data.reviewedAt?.toDate() || undefined,
    };
  });

  // Ordenar en memoria por createdAt (más reciente primero)
  requests.sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    return bTime - aTime;
  });

  return requests;
}

async function submitFIRequestDirect(
  tenantId: string,
  requestId: string,
  submittedBy: string,
  sellerNotes?: string
) {
  const db = getFirestore();
  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);

  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) {
    throw new Error('Solicitud F&I no encontrada');
  }

  const currentData = requestDoc.data();
  const currentHistory = currentData?.history || [];

  const historyEntry = {
    id: generateRandomId(),
    action: 'submitted',
    performedBy: submittedBy,
    timestamp: new Date(),
    previousStatus: currentData?.status,
    newStatus: 'submitted',
    notes: sellerNotes || 'Solicitud enviada a F&I',
  };

  await requestRef.update({
    status: 'submitted',
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    submittedBy,
    sellerNotes: sellerNotes || currentData?.sellerNotes,
    history: [...currentHistory, historyEntry],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es seller
    if (user.role !== 'seller') {
      return NextResponse.json({ error: 'Solo vendedores pueden acceder' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const clientId = searchParams.get('clientId') || undefined;

    const requests = await getFIRequestsDirect(user.tenantId!, {
      status,
      clientId,
      createdBy: user.userId, // Solo las solicitudes creadas por este vendedor
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Error en GET /api/fi/requests:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener solicitudes F&I' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es seller
    if (user.role !== 'seller') {
      return NextResponse.json({ error: 'Solo vendedores pueden crear solicitudes F&I' }, { status: 403 });
    }

    const body = await request.json();
    const {
      clientId,
      employment,
      creditInfo,
      personalInfo,
      sellerNotes,
      submit = false, // Si es true, envía directamente a F&I
    } = body;

    if (!clientId || !employment || !creditInfo || !personalInfo) {
      return NextResponse.json(
        { error: 'Datos incompletos. Se requiere clientId, employment, creditInfo y personalInfo' },
        { status: 400 }
      );
    }

    console.log('📝 POST /api/fi/requests: Creando solicitud F&I');
    console.log('  tenantId:', user.tenantId);
    console.log('  userId (createdBy):', user.userId);
    console.log('  clientId:', clientId);
    console.log('  status inicial:', 'draft');

    // Crear la solicitud
    const fiRequest = await createFIRequestDirect(
      user.tenantId!,
      {
        clientId,
        employment,
        creditInfo,
        personalInfo,
        status: 'draft',
        sellerNotes,
        createdBy: user.userId, // Este es el userId que debe coincidir con user.id del frontend
      }
    );

    console.log('✅ POST /api/fi/requests: Solicitud creada exitosamente');
    console.log('  requestId:', fiRequest.id);
    console.log('  createdBy guardado:', user.userId);
    console.log('  status:', fiRequest.status || 'draft');

    // Verificar que se guardó correctamente en Firestore
    const db = getFirestore();
    const verifyDoc = await db
      .collection('tenants')
      .doc(user.tenantId!)
      .collection('fi_requests')
      .doc(fiRequest.id)
      .get();
    
    if (verifyDoc.exists) {
      const verifyData = verifyDoc.data();
      console.log('✅ POST /api/fi/requests: Verificación en Firestore OK');
      console.log('  createdBy en Firestore:', verifyData?.createdBy);
      console.log('  status en Firestore:', verifyData?.status);
    } else {
      console.error('❌ POST /api/fi/requests: ERROR - La solicitud no se encontró en Firestore después de crearla');
    }

    // Si se debe enviar directamente, enviarlo
    if (submit) {
      console.log('📤 POST /api/fi/requests: Enviando solicitud directamente a F&I');
      await submitFIRequestDirect(
        user.tenantId!,
        fiRequest.id,
        user.userId,
        sellerNotes
      );
      // Recargar la solicitud para obtener el estado actualizado
      const updatedRequest = await getFIRequestsDirect(user.tenantId!, {
        clientId: fiRequest.clientId,
      });
      console.log('✅ POST /api/fi/requests: Solicitud enviada, estado actualizado:', (updatedRequest[0] as any)?.status);
      return NextResponse.json({ request: updatedRequest[0] }, { status: 201 });
    }

    return NextResponse.json({ request: fiRequest }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/fi/requests:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear solicitud F&I' },
      { status: 500 }
    );
  }
}

