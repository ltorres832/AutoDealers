import { NextRequest, NextResponse } from 'next/server';

export async function generateStaticParams() {
  return [];
}

import { getTenantBySubdomain } from '@autodealers/core';
import { getAppointmentsBySeller } from '@autodealers/crm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const date = searchParams.get('date'); // YYYY-MM-DD

    // Obtener tenant por subdominio
    const tenant = await getTenantBySubdomain(subdomain);

    if (!tenant || tenant.status !== 'active') {
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      );
    }

    if (!sellerId || !date) {
      return NextResponse.json(
        { error: 'Missing sellerId or date' },
        { status: 400 }
      );
    }

    // Obtener citas del vendedor para el día especificado
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const appointments = await getAppointmentsBySeller(
      tenant.id,
      sellerId,
      startDate,
      endDate
    );

    // Generar horarios disponibles (9 AM - 6 PM, cada 30 minutos)
    const availableSlots: string[] = [];
    const bookedSlots = appointments
      .filter((apt: any) => apt.status === 'scheduled' || apt.status === 'confirmed')
      .map((apt: any) => {
        const aptDate = new Date(apt.scheduledAt);
        return aptDate.toTimeString().slice(0, 5); // HH:MM
      });

    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        if (!bookedSlots.includes(timeSlot)) {
          availableSlots.push(timeSlot);
        }
      }
    }

    return NextResponse.json({
      availableSlots,
      bookedAppointments: appointments.map((apt: any) => ({
        id: apt.id,
        scheduledAt: apt.scheduledAt,
        duration: apt.duration,
        type: apt.type,
        status: apt.status,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


