import { NextRequest, NextResponse } from 'next/server';
import { getStripePublishableKey } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const publishableKey = await getStripePublishableKey();
    
    if (!publishableKey) {
      return NextResponse.json(
        { error: 'Stripe publishable key not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json({ publishableKey });
  } catch (error: any) {
    console.error('Error getting publishable key:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

