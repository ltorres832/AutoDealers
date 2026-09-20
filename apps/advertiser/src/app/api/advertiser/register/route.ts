import { NextRequest, NextResponse } from 'next/server';
import {
  notifyAdvertiserAccountCreated,
  PlatformProfileExistsError,
  registerAdvertiserAccount,
} from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      contactName,
      email,
      password,
      phone,
      website,
      industry,
    } = body;

    if (!companyName || !contactName || !email || !password) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const { advertiserId } = await registerAdvertiserAccount({
      email,
      password,
      contactName,
      companyName,
      phone,
      website,
      industry,
    });

    void notifyAdvertiserAccountCreated({
      advertiserId,
      companyName,
      contactName,
      email,
      registrationSource: 'self',
    }).catch((err) => console.warn('[advertiser/register] notify failed:', err));

    return NextResponse.json({
      success: true,
      advertiserId,
      message:
        'Registro recibido. Un administrador revisará tu cuenta y te notificará cuando esté activa.',
      advertiser: {
        id: advertiserId,
        email,
        companyName,
        contactName,
        phone: phone || '',
        website: website || '',
        industry: industry || 'other',
        status: 'pending' as const,
        plan: null,
        registrationSource: 'self' as const,
      },
    });
  } catch (error: unknown) {
    console.error('Error registering advertiser:', error);
    if (error instanceof PlatformProfileExistsError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/email-already-in-use' || err.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'No se pudo crear la cuenta de anunciante. Intenta de nuevo o inicia sesión en este portal.' },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Error al registrar anunciante';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
