import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPreQualifications } from '@autodealers/crm';
import { getTenants } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');

    if (tenantId) {
      // Obtener pre-cualificaciones de un tenant específico
      const preQualifications = await getPreQualifications(tenantId, {
        status: status as any,
        limit: limit ? parseInt(limit) : undefined,
      });

      return NextResponse.json({ preQualifications });
    } else {
      // Obtener todas las pre-cualificaciones de todos los tenants
      const tenants = await getTenants();
      const allPreQualifications: any[] = [];

      for (const tenant of tenants) {
        const preQualifications = await getPreQualifications(tenant.id, {
          status: status as any,
          limit: limit ? parseInt(limit) : undefined,
        });

        allPreQualifications.push(
          ...preQualifications.map((pq) => ({
            ...pq,
            tenantName: tenant.name,
            tenantId: tenant.id,
          }))
        );
      }

      // Ordenar por fecha de creación (más recientes primero)
      allPreQualifications.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      return NextResponse.json({ preQualifications: allPreQualifications });
    }
  } catch (error: any) {
    console.error('Error fetching pre-qualifications:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


