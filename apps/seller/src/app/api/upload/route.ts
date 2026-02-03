import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { uploadVehicleImage } from '@autodealers/inventory';

export async function POST(request: NextRequest) {
  // Logging INMEDIATO al inicio
  console.log('='.repeat(60));
  console.log('📤 POST /api/upload - LLAMADO');
  console.log('='.repeat(60));
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('🔗 URL:', request.url);
  console.log('📋 Method:', request.method);
  
  // Declarar variables fuera del try para que estén disponibles en el catch
  let file: File | null = null;
  let type: string | null = null;
  
  try {
    // Logging detallado antes de verificar auth
    console.log('📤 POST /api/upload - Iniciando...');
    console.log('🔍 Cookies recibidas:', request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value })));
    console.log('🔍 Authorization header:', request.headers.get('authorization') ? 'Presente' : 'Ausente');
    
    const auth = await verifyAuth(request);
    console.log('🔍 Resultado de verifyAuth:', auth ? { userId: auth.userId, tenantId: auth.tenantId, role: auth.role } : 'null');
    
    if (!auth || !auth.tenantId) {
      console.error('❌ Unauthorized - auth:', auth, 'tenantId:', auth?.tenantId);
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: auth ? 'No tenantId' : 'No auth',
        cookiesReceived: request.cookies.getAll().map(c => c.name)
      }, { status: 401 });
    }

    const formData = await request.formData();
    console.log('📋 FormData keys:', Array.from(formData.keys()));
    
    file = formData.get('file') as File;
    type = formData.get('type') as string;
    
    console.log('📋 Datos recibidos:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      type: type,
      vehicleId: formData.get('vehicleId'),
    });

    if (!file) {
      console.error('❌ No file provided en FormData');
      return NextResponse.json({ 
        error: 'No file provided',
        details: 'El campo "file" no está presente en FormData',
        formDataKeys: Array.from(formData.keys())
      }, { status: 400 });
    }
    
    if (!type) {
      console.error('❌ No type provided en FormData');
      return NextResponse.json({ 
        error: 'No type provided',
        details: 'El campo "type" no está presente en FormData',
        formDataKeys: Array.from(formData.keys())
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let url: string;

    // Validar tipo de archivo
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    console.log('🔍 Validando archivo:', {
      fileType: file.type,
      isImage,
      isVideo,
      fileSize: file.size,
    });
    
    if (!isImage && !isVideo) {
      console.error('❌ Tipo de archivo inválido:', file.type);
      return NextResponse.json(
        { 
          error: 'El archivo debe ser una imagen o un video',
          receivedType: file.type,
        },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 100MB para videos, 10MB para imágenes)
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    console.log('🔍 Validando tamaño:', {
      fileSize: file.size,
      maxSize,
      isVideo,
      isValid: file.size <= maxSize,
    });
    
    if (file.size > maxSize) {
      console.error('❌ Archivo demasiado grande:', {
        fileSize: file.size,
        maxSize,
        isVideo,
      });
      return NextResponse.json(
        { 
          error: `El archivo es demasiado grande. Máximo: ${isVideo ? '100MB' : '10MB'}`,
          fileSize: file.size,
          maxSize,
        },
        { status: 400 }
      );
    }

    if (type === 'vehicle') {
      const vehicleId = formData.get('vehicleId') as string;
      
      console.log('🔍 Validando vehicleId:', {
        vehicleId,
        vehicleIdType: typeof vehicleId,
        isNull: vehicleId === null,
        isUndefined: vehicleId === undefined,
        isEmpty: vehicleId === '',
        isTemp: vehicleId === 'temp',
        isValid: vehicleId && vehicleId !== 'temp',
      });
      
      if (!vehicleId || vehicleId === 'temp') {
        console.error('❌ vehicleId inválido:', {
          vehicleId,
          received: formData.get('vehicleId'),
          allFormDataKeys: Array.from(formData.keys()),
        });
        return NextResponse.json(
          { 
            error: 'vehicleId es requerido y debe ser válido',
            received: vehicleId,
            details: `vehicleId recibido: ${vehicleId || 'null/undefined'}`,
          },
          { status: 400 }
        );
      }
      
      console.log('📤 Intentando subir imagen de vehículo:', {
        tenantId: auth.tenantId,
        vehicleId,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        bufferSize: buffer.length,
      });
      
      try {
        url = await uploadVehicleImage(
          auth.tenantId,
          vehicleId,
          buffer,
          file.name,
          file.type
        );
        console.log('✅ uploadVehicleImage completado, URL:', url);
      } catch (uploadError: any) {
        console.error('❌ Error en uploadVehicleImage:', {
          error: uploadError.message,
          stack: uploadError.stack,
          code: uploadError.code,
          tenantId: auth.tenantId,
          vehicleId,
        });
        throw uploadError; // Re-lanzar para que se capture en el catch general
      }
    } else if (type === 'campaign' || type === 'promotion') {
      // Para campañas y promociones, usar una función genérica de upload
      const { getStorage } = await import('@autodealers/core');
      const storage = getStorage();
      const bucket = storage.bucket();
      
      const folder = isVideo ? 'videos' : 'images';
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `tenants/${auth.tenantId}/${type}s/${timestamp}_${sanitizedFilename}`;
      const fileRef = bucket.file(filePath);

      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            tenantId: auth.tenantId,
            type: type,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      await fileRef.makePublic();
      url = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    console.log('✅ Archivo subido exitosamente:', { url, type, fileName: file.name });
    return NextResponse.json({ url }, { status: 200 });
  } catch (error: any) {
    // Obtener type y file de forma segura (pueden no estar definidos si el error ocurrió antes)
    const errorType = (typeof type !== 'undefined' ? type : 'unknown') || 'unknown';
    const errorFile = file || null;
    
    console.error('='.repeat(60));
    console.error('❌ ERROR EN POST /api/upload');
    console.error('='.repeat(60));
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('Type:', errorType);
    console.error('File name:', errorFile?.name || 'N/A');
    console.error('File size:', errorFile?.size || 'N/A');
    console.error('='.repeat(60));
    
    // Asegurar que siempre devolvemos JSON válido
    const errorResponse = {
      error: 'Error al subir archivo',
      details: error.message,
      code: error.code,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      })
    };
    
    return NextResponse.json(
      errorResponse,
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

