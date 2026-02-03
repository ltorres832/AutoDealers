import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - carga dinámica para evitar error de tipos en build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createLead } = require('@autodealers/crm') as any;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.tenantId || !body.contact) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const lead = await createLead(
      body.tenantId,
      body.source || 'web',
      {
        name: body.contact.name,
        phone: body.contact.phone,
        email: body.contact.email,
        preferredChannel: 'whatsapp',
      },
      body.notes
    );

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





