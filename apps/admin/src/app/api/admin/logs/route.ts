export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const tenantId = searchParams.get('tenantId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let logs: any[] = [];

    // Obtener todos los logs
    let logsQuery: any = db.collection('logs').orderBy('createdAt', 'desc').limit(1000);

    if (action) {
      logsQuery = logsQuery.where('action', '==', action);
    }
    if (resource) {
      logsQuery = logsQuery.where('resource', '==', resource);
    }
    if (tenantId) {
      logsQuery = logsQuery.where('tenantId', '==', tenantId);
    }

    const logsSnapshot = await logsQuery.get();
    
    logsSnapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      const logDate = data?.createdAt?.toDate() || new Date();
      
      // Filtrar por fecha si existe
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (logDate < fromDate) return;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (logDate > toDate) return;
      }

      logs.push({
        id: doc.id,
        tenantId: data.tenantId,
        userId: data.userId,
        action: data.action || 'unknown',
        resource: data.resource || 'unknown',
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        createdAt: logDate.toISOString(),
      });
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ logs: [] });
  }
}
