// API route para crear un Customer File manualmente (Seller)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      console.error('❌ POST /api/customer-files/create - No auth o userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que el usuario es seller
    if (auth.role !== 'seller') {
      console.error('❌ POST /api/customer-files/create - Usuario no es seller:', auth.role);
      return NextResponse.json({ error: 'Solo vendedores pueden crear casos de cliente' }, { status: 403 });
    }

    // Obtener información del vendedor para obtener tenantId si no está en auth
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(auth.userId).get();
    
    if (!userDoc.exists) {
      console.error('❌ POST /api/customer-files/create - Usuario no encontrado:', auth.userId);
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userData = userDoc.data();
    const tenantId = auth.tenantId || userData?.tenantId;

    if (!tenantId) {
      console.error('❌ POST /api/customer-files/create - No tenantId disponible para usuario:', auth.userId);
      return NextResponse.json({ error: 'No se pudo determinar el tenantId' }, { status: 400 });
    }

    // Verificar que el tenant existe en Firestore
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      console.error('❌ POST /api/customer-files/create - Tenant no existe:', tenantId);
      return NextResponse.json({ error: 'El tenant no existe en el sistema' }, { status: 404 });
    }

    console.log('✅ POST /api/customer-files/create - Auth OK:', {
      userId: auth.userId,
      tenantId,
      role: auth.role,
      tenantExists: tenantDoc.exists,
    });

    const body = await request.json();
    const { customerInfo, vehicleId, saleId, notes } = body;

    // Validar campos requeridos
    if (!customerInfo || !customerInfo.fullName || !customerInfo.phone || !customerInfo.email) {
      return NextResponse.json(
        { error: 'Nombre completo, teléfono y email del cliente son requeridos' },
        { status: 400 }
      );
    }

    const sellerInfo = userData
      ? {
          id: auth.userId,
          name: userData.name || userData.email || 'Vendedor',
          email: userData.email || '',
        }
      : undefined;

    // Generar IDs necesarios
    const finalSaleId = saleId || `manual-${Date.now()}`;
    const customerId = `customer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const finalVehicleId = vehicleId || `manual-vehicle-${Date.now()}`;

    console.log('📝 POST /api/customer-files/create - Datos recibidos:', {
      tenantId,
      saleId: finalSaleId,
      customerId,
      vehicleId: finalVehicleId,
      sellerId: auth.userId,
      customerInfo: {
        fullName: customerInfo.fullName,
        phone: customerInfo.phone,
        email: customerInfo.email,
        hasAddress: !!customerInfo.address,
      },
      sellerInfo: sellerInfo ? { id: sellerInfo.id, name: sellerInfo.name } : null,
    });

    // Validar estructura de customerInfo antes de crear
    if (!customerInfo.fullName || !customerInfo.phone || !customerInfo.email) {
      console.error('❌ POST /api/customer-files/create - customerInfo incompleto:', customerInfo);
      return NextResponse.json(
        { error: 'Información del cliente incompleta', details: 'Se requieren fullName, phone y email' },
        { status: 400 }
      );
    }

    // Crear customer file directamente aquí para evitar problemas de importación
    console.log('🔄 POST /api/customer-files/create - Creando customer file directamente...');
    
    // Generar token único
    function generateUploadToken(): string {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 64; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
    
    const uploadToken = generateUploadToken();
    const admin = await import('firebase-admin');
    
    const fileData = {
      tenantId,
      saleId: finalSaleId,
      customerId,
      customerInfo,
      vehicleId: finalVehicleId,
      sellerId: auth.userId,
      sellerInfo,
      documents: [],
      requestedDocuments: [],
      uploadToken,
      status: 'active' as const,
      notes: notes || '',
      evidence: [],
    };

    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('customer_files')
      .doc();

    console.log('📝 POST /api/customer-files/create - Guardando en Firestore, docId:', docRef.id);

    await docRef.set({
      ...fileData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const customerFile = {
      id: docRef.id,
      ...fileData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log('✅ POST /api/customer-files/create - Customer file creado exitosamente, ID:', customerFile.id);

    return NextResponse.json({
      success: true,
      file: customerFile,
      message: 'Caso de cliente creado exitosamente',
    });
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      details: error.details || error.toString(),
    };
    
    console.error('❌ POST /api/customer-files/create - Error general:', errorDetails);
    
    // Determinar el tipo de error y mensaje apropiado
    let userMessage = 'Error al crear el caso';
    let errorCode = error.code || 'UNKNOWN_ERROR';
    
    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      userMessage = 'No tienes permisos para crear casos. Verifica tu cuenta.';
      errorCode = 'PERMISSION_DENIED';
    } else if (error.code === 'not-found' || error.message?.includes('not found')) {
      userMessage = 'El recurso solicitado no existe. Verifica tu configuración.';
      errorCode = 'NOT_FOUND';
    } else if (error.message?.includes('tenantId')) {
      userMessage = 'Error de configuración: No se pudo determinar el tenantId.';
      errorCode = 'TENANT_ID_ERROR';
    } else if (error.message) {
      userMessage = `Error: ${error.message}`;
    }
    
    return NextResponse.json(
      { 
        error: userMessage,
        details: error.message || 'Error desconocido',
        code: errorCode,
        // Solo incluir stack en desarrollo
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      { status: 500 }
    );
  }
}

