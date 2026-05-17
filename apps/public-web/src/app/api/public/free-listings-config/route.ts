import { NextResponse } from 'next/server';
import { getFreePublicListingsSettings } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const s = await getFreePublicListingsSettings();
    return NextResponse.json({
      enabled: s.enabled,
      maxActiveFreeVehiclesPerSeller: s.maxActiveFreeVehiclesPerSeller,
      durationDays: s.durationDays,
      ctaTitle: s.ctaTitle,
      ctaSubtitle: s.ctaSubtitle,
      ctaButtonLabel: s.ctaButtonLabel,
      quickListingPath: s.quickListingPath,
      registerPath: s.registerPath,
      registerCtaLabel: s.registerCtaLabel,
      successHeadline: s.successHeadline,
      successSubtitle: s.successSubtitle,
    });
  } catch (e) {
    console.error('free-listings-config:', e);
    return NextResponse.json(
      {
        enabled: false,
        maxActiveFreeVehiclesPerSeller: 0,
        durationDays: 14,
        ctaTitle: '',
        ctaSubtitle: '',
        ctaButtonLabel: '',
        quickListingPath: '/publicar-gratis',
        registerPath: '/register?type=seller',
        registerCtaLabel: '',
        successHeadline: '',
        successSubtitle: '',
      },
      { status: 200 }
    );
  }
}
