import { NextRequest, NextResponse } from 'next/server';
import { PlatformProfileExistsError, registerCustomerAccount } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await registerCustomerAccount({
      name: String(body.name || ''),
      email: String(body.email || ''),
      password: String(body.password || ''),
      phone: body.phone ? String(body.phone) : undefined,
      token: body.token ? String(body.token) : undefined,
      acceptPlatformTerms: body.acceptPlatformTerms === true,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof PlatformProfileExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error?.message || 'No se pudo crear la cuenta' },
      { status: 400 }
    );
  }
}
