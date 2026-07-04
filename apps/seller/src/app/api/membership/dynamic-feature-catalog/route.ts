export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getActiveDynamicFeatureCatalog } from '@autodealers/billing/dynamic-feature-catalog';

export async function GET() {
  try {
    const features = await getActiveDynamicFeatureCatalog();
    return NextResponse.json({ features });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ features: [], error: message }, { status: 500 });
  }
}
