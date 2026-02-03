import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { generateSocialPost, analyzeVehicleForSocial } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vehicle, customerProfile, objective } = body;

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle data is required' }, { status: 400 });
    }

    // Generar post con IA
    const post = await generateSocialPost(
      vehicle,
      customerProfile,
      objective || 'more_messages'
    );

    // Analizar vehículo para sugerencias
    const analysis = await analyzeVehicleForSocial(vehicle);

    return NextResponse.json({
      post,
      analysis,
    });
  } catch (error: any) {
    console.error('Error generating social post:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

