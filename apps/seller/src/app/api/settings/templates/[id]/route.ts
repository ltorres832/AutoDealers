import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { updateTemplate, getTemplateById } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await getTemplateById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Verificar que el template pertenezca al tenant del seller
    if ((template as any).tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verificar que el template sea editable
    if (!(template as any).isEditable) {
      return NextResponse.json(
        { error: 'Este template no es editable' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: any = {};
    
    if (body.content !== undefined) {
      updates.content = body.content;
    }
    if (body.subject !== undefined) {
      updates.subject = body.subject;
    }

    await updateTemplate(id, updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



