import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  createCorporateEmail,
  getCorporateEmails,
  getCorporateEmailUsage,
} from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emails = await getCorporateEmails(auth.userId, auth.tenantId);

    return NextResponse.json({ emails });
  } catch (error: any) {
    console.error('Error getting corporate emails:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailAlias } = body;

    if (!emailAlias || typeof emailAlias !== 'string') {
      return NextResponse.json(
        { error: 'emailAlias es requerido' },
        { status: 400 }
      );
    }

    // Verificar si puede crear email (simplificado: siempre permitir si está autenticado)
    // TODO: Implementar verificación de límites de membresía

    // Crear email corporativo
    const email = await createCorporateEmail(
      auth.userId,
      auth.tenantId,
      emailAlias,
      'user'
    );

    return NextResponse.json({ email }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating corporate email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Endpoint para verificar límites
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usage = await getCorporateEmailUsage(auth.tenantId || '');

    return NextResponse.json({
      usage,
      canCreate: true, // Simplificado: siempre permitir si está autenticado
      limit: (usage as any).limit || 0,
      used: (usage as any).used || 0,
      reason: undefined,
    });
  } catch (error: any) {
    console.error('Error getting email usage:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


