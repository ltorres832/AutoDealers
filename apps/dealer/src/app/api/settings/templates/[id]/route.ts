import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { updateTemplate, getTemplateById } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: templateId } = await params;
    const template = await getTemplateById(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Verificar que el template no sea un template por defecto del sistema
    if (template.isDefault) {
      return NextResponse.json(
        { error: 'Los templates por defecto del sistema no pueden ser editados directamente. Crea una copia personalizada.' },
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

    await updateTemplate(templateId, updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

