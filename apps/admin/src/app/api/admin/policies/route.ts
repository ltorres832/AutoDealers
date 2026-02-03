export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
} from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;
    const language = searchParams.get('language') as 'es' | 'en' | undefined;

    const policies = await getAllPolicies(tenantId, language);
    return NextResponse.json({ policies });
  } catch (error: any) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener políticas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      title,
      content,
      version,
      language,
      isActive,
      isRequired,
      requiresAcceptance,
      applicableTo,
      tenantId,
      effectiveDate,
      expirationDate,
    } = body;

    if (!title || !content || !type) {
      return NextResponse.json(
        { error: 'Título, contenido y tipo son requeridos' },
        { status: 400 }
      );
    }

    const policy = await createPolicy({
      type,
      title,
      content,
      version: version || '1.0',
      language: language || 'es',
      isActive: isActive !== false,
      isRequired: isRequired === true,
      requiresAcceptance: requiresAcceptance !== false,
      applicableTo: applicableTo || ['public'],
      tenantId,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      createdBy: auth.userId,
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating policy:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear política' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la política es requerido' },
        { status: 400 }
      );
    }

    const updateData: any = { ...updates };
    if (updateData.effectiveDate) updateData.effectiveDate = new Date(updateData.effectiveDate);
    if (updateData.expirationDate) updateData.expirationDate = new Date(updateData.expirationDate);
    updateData.updatedBy = auth.userId;

    const policy = await updatePolicy(id, updateData);
    return NextResponse.json({ policy });
  } catch (error: any) {
    console.error('Error updating policy:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar política' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la política es requerido' },
        { status: 400 }
      );
    }

    await deletePolicy(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting policy:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar política' },
      { status: 500 }
    );
  }
}


