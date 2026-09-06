import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { uploadFile, updateAutomotiveBusiness, getAutomotiveBusinessById } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('photo') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Selecciona una imagen' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'La imagen no puede superar 8 MB' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop() || 'jpg';
  const logoUrl = await uploadFile(
    auth.tenantId,
    buffer,
    `perfil.${ext}`,
    file.type,
    'branding'
  );
  await updateAutomotiveBusiness(auth.tenantId, { logoUrl });
  const business = await getAutomotiveBusinessById(auth.tenantId);
  return NextResponse.json({ logoUrl, business });
}
