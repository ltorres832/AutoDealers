export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, getMetaCredentials } from '@autodealers/core';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

/**
 * Callback de "Eliminación de datos" de Meta (Facebook / Instagram).
 *
 * Meta lo llama con `POST` (form-urlencoded) y un `signed_request` firmado con
 * el App Secret cuando un usuario elimina la app o solicita borrar sus datos.
 * Debemos verificar la firma, registrar la solicitud y responder con
 * `{ url, confirmation_code }` para que el usuario pueda dar seguimiento.
 *
 * URL a registrar en Meta → App Settings → "Data Deletion Request Callback URL":
 *   https://www.autodealers-online.com/api/meta/data-deletion
 */

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64');
}

function parseSignedRequest(
  signedRequest: string,
  appSecret: string
): { user_id?: string } | null {
  const parts = signedRequest.split('.');
  if (parts.length !== 2) return null;
  const [encodedSig, payload] = parts;
  if (!encodedSig || !payload) return null;

  const providedSig = base64UrlDecode(encodedSig);
  const expectedSig = crypto.createHmac('sha256', appSecret).update(payload).digest();

  if (
    providedSig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(providedSig, expectedSig)
  ) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(payload).toString('utf8'));
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const signedRequest = form.get('signed_request');

    if (typeof signedRequest !== 'string' || !signedRequest) {
      return NextResponse.json({ error: 'missing_signed_request' }, { status: 400 });
    }

    const { appSecret } = await getMetaCredentials();
    if (!appSecret) {
      console.error('[meta/data-deletion] App Secret no configurado');
      return NextResponse.json({ error: 'app_not_configured' }, { status: 500 });
    }

    const parsed = parseSignedRequest(signedRequest, appSecret);
    if (!parsed) {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
    }

    const metaUserId =
      typeof parsed.user_id === 'string' && parsed.user_id.trim() ? parsed.user_id.trim() : 'unknown';

    const code = `del_${crypto.randomBytes(12).toString('hex')}`;

    const db = getFirestore();
    await db.collection('meta_data_deletion_requests').doc(code).set({
      code,
      metaUserId,
      status: 'received',
      source: 'meta_signed_request',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const statusUrl = `${request.nextUrl.origin}/eliminar-datos?code=${code}`;
    return NextResponse.json({ url: statusUrl, confirmation_code: code });
  } catch (error: unknown) {
    console.error('[meta/data-deletion]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/eliminar-datos', request.nextUrl.origin));
}
