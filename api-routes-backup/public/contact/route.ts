import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - carga dinámica para evitar error de tipos en build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getFirestore } = require('@autodealers/core') as any;
import * as admin from 'firebase-admin';

let db: any;
function getDb() {
  if (!db) {
    try {
      db = getFirestore();
    } catch (error) {
      // Si ya fue inicializado, reutilizar instancia global
      db = admin.firestore();
    }
  }
  return db;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, email, and phone are required' },
        { status: 400 }
      );
    }

    // Guardar contacto en una colección global
    const database = getDb();
    await database.collection('public_contacts').add({
      name,
      email,
      phone,
      message: message || '',
      source: 'landing_page',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'new',
    });

    // TODO: Enviar email de notificación al admin

    return NextResponse.json({ 
      success: true,
      message: 'Contact form submitted successfully' 
    });
  } catch (error: any) {
    console.error('Error submitting contact form:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


