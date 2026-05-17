import { NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import {
  parsePlatformBrandingFirestoreData,
} from '@autodealers/shared/platform-branding-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getFirestore();
    const snap = await db.collection('admin_settings').doc('branding').get();
    if (!snap.exists) {
      const p = parsePlatformBrandingFirestoreData(undefined, undefined);
      return NextResponse.json(
        {
          ...p,
          adminPhoto: p.adminPhoto || null,
        },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }
    const raw = snap.data() as Record<string, unknown> | undefined;
    const p = parsePlatformBrandingFirestoreData(raw, raw?.updatedAt);
    return NextResponse.json(
      {
        ...p,
        adminPhoto: p.adminPhoto || null,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (e) {
    console.error('[platform-branding]', e);
    const p = parsePlatformBrandingFirestoreData(undefined, undefined);
    return NextResponse.json(
      { ...p, adminPhoto: p.adminPhoto || null },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
