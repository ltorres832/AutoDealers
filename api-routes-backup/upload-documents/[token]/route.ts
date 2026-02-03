import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFileByToken, addCustomerDocument } from '@autodealers/crm';
import { getStorage, createNotification } from '@autodealers/core';
import * as admin from 'firebase-admin';

// Para static export, necesitamos generar los params estáticamente
export async function generateStaticParams() {
  return [];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const file = await getCustomerFileByToken(params.token);
    if (!file) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    return NextResponse.json({
      file: {
        id: file.id,
        customerInfo: file.customerInfo,
        requestedDocuments: file.requestedDocuments,
        documents: file.documents,
      },
    });
  } catch (error: any) {
    console.error('Error fetching file by token:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const file = await getCustomerFileByToken(params.token);
    if (!file) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    const formData = await request.formData();
    const fileUpload = formData.get('file') as File;
    const documentType = formData.get('type') as string;
    const documentName = formData.get('name') as string;

    if (!fileUpload || !documentType || !documentName) {
      return NextResponse.json(
        { error: 'Missing required fields: file, type, name' },
        { status: 400 }
      );
    }

    // Subir archivo a Firebase Storage
    const storage = getStorage();
    const buffer = Buffer.from(await fileUpload.arrayBuffer());
    const fileName = `customer-files/${file.tenantId}/${file.id}/${Date.now()}-${fileUpload.name}`;
    const bucket = storage.bucket();
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: fileUpload.type,
      },
    });

    // Hacer el archivo público o generar URL firmada
    await fileRef.makePublic();
    const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Agregar documento al customer file
    const document = await addCustomerDocument(
      file.tenantId,
      file.id,
      {
        name: documentName,
        type: documentType,
        url,
        uploadedBy: 'customer',
        size: buffer.length,
        mimeType: fileUpload.type,
      }
    );

    // Enviar notificación al vendedor
    try {
      await createNotification({
        tenantId: file.tenantId,
        userId: file.sellerId,
        type: 'document_received',
        title: 'Nuevo Documento Recibido',
        message: `${file.customerInfo.fullName} ha subido el documento: ${documentName}`,
        channels: ['system', 'email'],
        metadata: {
          customerFileId: file.id,
          documentId: document.id,
          customerName: file.customerInfo.fullName,
          saleId: file.saleId,
        },
      });

      // También notificar al dealer si es diferente del vendedor
      // (esto requeriría obtener el dealerId del tenant, por ahora solo notificamos al vendedor)
    } catch (error) {
      console.error('Error sending notification:', error);
      // No fallar la subida si la notificación falla
    }

    return NextResponse.json({ document, success: true });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

