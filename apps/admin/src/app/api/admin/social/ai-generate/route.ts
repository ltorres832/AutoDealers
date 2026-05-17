import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { analyzeVehicleForSocial, generateSocialPost } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vehicle, customerProfile, objective } = body;

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle data is required' }, { status: 400 });
    }

    const post = await generateSocialPost(vehicle, customerProfile, objective || 'more_messages');
    const analysis = await analyzeVehicleForSocial(vehicle);

    return NextResponse.json({ post, analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Admin social ai-generate:', error);
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
