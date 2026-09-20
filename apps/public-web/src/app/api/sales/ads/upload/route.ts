export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@autodealers/core';
import { randomBytes, randomUUID } from 'node:crypto';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';

const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export async function POST(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });

    const contentType = file.type || 'application/octet-stream';
    if (!ALLOWED.has(contentType)) {
      return NextResponse.json({ error: 'Solo imágenes jpg, png o webp.' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Máximo 8 MB.' }, { status: 400 });
    }

    const storage = getStorage();
    const bucket = storage.bucket();
    const safeName = (file.name || 'banner').replace(/[^a-zA-Z0-9.-]/g, '_').slice(-80);
    const path = `sales-ads/${auth.salesEmployeeId}/${Date.now()}-${randomBytes(4).toString('hex')}-${safeName}`;
    const downloadToken = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());

    await bucket.file(path).save(buffer, {
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
          source: 'sales-employee-ad',
          employeeId: auth.salesEmployeeId,
        },
      },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`;
    return NextResponse.json({ success: true, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo subir';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
