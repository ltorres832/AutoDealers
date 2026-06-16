import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import { notifyAdminsOfContactInquiry } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

const VALID_BUSINESS_TYPES = new Set(['dealer', 'seller', 'other', 'advertiser']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const businessType =
      typeof body.businessType === 'string' && VALID_BUSINESS_TYPES.has(body.businessType)
        ? body.businessType
        : 'other';

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }
    if (!phone || phone.length < 7) {
      return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return NextResponse.json(
        { error: 'El mensaje debe tener al menos 10 caracteres' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const docRef = db.collection('contact_inquiries').doc();
    const id = docRef.id;

    await docRef.set({
      id,
      name,
      email,
      phone,
      businessType,
      message,
      status: 'new',
      source: 'public_contact_form',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    void notifyAdminsOfContactInquiry({
      id,
      name,
      email,
      phone,
      businessType,
      message,
      source: 'public_contact_form',
    }).catch((err) => console.warn('[public/contact] notify failed', err));

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    console.error('[public/contact]', error);
    const msg = error instanceof Error ? error.message : 'Error al enviar mensaje';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
