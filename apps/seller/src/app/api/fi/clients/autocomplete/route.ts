export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const field = searchParams.get('field');
    const value = searchParams.get('value');

    if (!field || !value || value.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Buscar en clientes F&I previos del mismo tenant
    const clientsSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('fi_clients')
      .limit(50)
      .get();

    const suggestions: Array<{ field: string; value: string; confidence: number }> = [];
    const seenValues = new Set<string>();

    clientsSnapshot.forEach((doc) => {
      const data = doc.data();
      let fieldValue: string | undefined;

      switch (field) {
        case 'firstName':
          fieldValue = data.name?.split(' ')[0];
          break;
        case 'lastName':
          fieldValue = data.name?.split(' ').slice(1).join(' ');
          break;
        case 'address':
          fieldValue = data.address;
          break;
        case 'employer':
          // Buscar en solicitudes F&I relacionadas
          break;
        case 'vehicleMake':
          fieldValue = data.vehicleMake;
          break;
        default:
          fieldValue = (data as any)[field];
      }

      if (fieldValue && fieldValue.toLowerCase().includes(value.toLowerCase())) {
        const normalizedValue = fieldValue.trim();
        if (!seenValues.has(normalizedValue)) {
          seenValues.add(normalizedValue);
          suggestions.push({
            field,
            value: normalizedValue,
            confidence: normalizedValue.toLowerCase().startsWith(value.toLowerCase()) ? 0.9 : 0.7,
          });
        }
      }
    });

    // Ordenar por confianza y limitar a 10
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    return NextResponse.json({ suggestions: suggestions.slice(0, 10) });
  } catch (error: any) {
    console.error('Error en autocomplete:', error);
    return NextResponse.json({ suggestions: [] });
  }
}


