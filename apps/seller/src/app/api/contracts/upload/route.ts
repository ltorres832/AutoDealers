export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getStorage } from '@autodealers/core';
import { createContract } from '@autodealers/crm';

const storage = getStorage();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const saleId = formData.get('saleId') as string | null;
    const leadId = formData.get('leadId') as string | null;
    const vehicleId = formData.get('vehicleId') as string | null;
    const fiRequestId = formData.get('fiRequestId') as string | null;

    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Solo se permiten archivos PDF' },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande. Máximo 10MB' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const sanitizedName = name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `contracts/${auth.tenantId}/${timestamp}_${sanitizedName}`;

    const bucket = storage.bucket();
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          uploadedBy: auth.userId,
          tenantId: auth.tenantId,
        },
      },
    });

    await fileRef.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    const contract = await createContract(auth.tenantId!, {
      name,
      type: 'purchase',
      originalDocumentUrl: publicUrl,
      saleId: saleId || undefined,
      leadId: leadId || undefined,
      vehicleId: vehicleId || undefined,
      fiRequestId: fiRequestId || undefined,
      digitalization: {
        status: 'pending',
      },
      createdBy: auth.userId,
    });

    return NextResponse.json({ contract });
  } catch (error: any) {
    console.error('Error uploading contract:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir contrato' },
      { status: 500 }
    );
  }
}


