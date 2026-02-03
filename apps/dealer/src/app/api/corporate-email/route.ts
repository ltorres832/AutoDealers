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
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    // Si se especifica userId, obtener emails de ese usuario
    // Si no, obtener todos los emails del tenant
    const emails = await getCorporateEmails(userId || undefined, auth.tenantId);

    // Obtener uso de emails
    const usage = await getCorporateEmailUsage(auth.tenantId);

    return NextResponse.json({ emails, usage });
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
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailAlias, userId } = body;

    if (!emailAlias || typeof emailAlias !== 'string') {
      return NextResponse.json(
        { error: 'emailAlias es requerido' },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Verificar permisos básicos (el dealer puede crear emails para sus usuarios)

    // Crear email corporativo (creado por dealer)
    const email = await createCorporateEmail(
      userId,
      auth.tenantId,
      emailAlias,
      'dealer',
      auth.userId // dealerId
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


