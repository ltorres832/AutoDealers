import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled, DashboardType } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dashboard = searchParams.get('dashboard') as DashboardType;
    const featureKey = searchParams.get('featureKey');

    if (!dashboard || !featureKey) {
      return NextResponse.json(
        { error: 'dashboard y featureKey son requeridos' },
        { status: 400 }
      );
    }

    const enabled = await isFeatureEnabled(dashboard, featureKey);
    return NextResponse.json({ enabled });
  } catch (error: any) {
    console.error('Error checking feature flag:', error);
    return NextResponse.json(
      { error: error.message || 'Error al verificar feature flag' },
      { status: 500 }
    );
  }
}


