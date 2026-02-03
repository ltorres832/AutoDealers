export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

// Interfaces necesarias
interface FIMetrics {
  period: { start: Date; end: Date };
  approvalRate: number;
  averageProcessingTime: number;
  pendingRequests: number;
  byStatus: Record<string, number>;
  averageIncome: number;
  averageCreditScore: number;
  averageDownPayment: number;
  averageLoanAmount: number;
  bySeller: Record<string, { requests: number; approvals: number; rejections: number; approvalRate: number }>;
  byCreditRange: Record<string, { requests: number; approvals: number; approvalRate: number }>;
}

type FIRequestStatus = 'draft' | 'submitted' | 'under_review' | 'pre_approved' | 'approved' | 'pending_info' | 'rejected';
type CreditRange = 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';

interface FIRequest {
  id: string;
  tenantId: string;
  clientId: string;
  status: FIRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  reviewedAt?: Date;
  createdBy: string;
  creditInfo: {
    creditRange: CreditRange;
  };
  employment: {
    monthlyIncome: number;
  };
  approvalScore?: {
    score: number;
  };
}

interface FIClient {
  vehiclePrice?: number;
  downPayment?: number;
}

// Implementación directa de getFIClientById para evitar problemas de webpack
async function getFIClientByIdDirect(tenantId: string, clientId: string): Promise<FIClient | null> {
  const clientDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .doc(clientId)
    .get();

  if (!clientDoc.exists) {
    return null;
  }

  const data = clientDoc.data();
  return {
    vehiclePrice: data?.vehiclePrice,
    downPayment: data?.downPayment,
  };
}

// Implementación directa de getFIMetrics
async function getFIMetricsDirect(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<FIMetrics> {
  const requestsSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .get();
  
  const requests = requestsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      tenantId: data.tenantId || tenantId,
      clientId: data.clientId || '',
      status: data.status || 'draft',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      submittedAt: data.submittedAt?.toDate(),
      reviewedAt: data.reviewedAt?.toDate(),
      createdBy: data.createdBy || '',
      creditInfo: data.creditInfo || { creditRange: 'fair' },
      employment: data.employment || { monthlyIncome: 0 },
      approvalScore: data.approvalScore,
    } as FIRequest;
  });
  
  const approved = requests.filter(r => r.status === 'approved').length;
  const total = requests.length;
  const approvalRate = total > 0 ? (approved / total) * 100 : 0;
  
  // Calcular tiempo promedio de procesamiento
  const processingTimes: number[] = [];
  requests.forEach(r => {
    if (r.submittedAt && r.reviewedAt) {
      const submitted = r.submittedAt instanceof Date ? r.submittedAt : new Date(r.submittedAt);
      const reviewed = r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt);
      const hours = (reviewed.getTime() - submitted.getTime()) / (1000 * 60 * 60);
      processingTimes.push(hours);
    }
  });
  const averageProcessingTime = processingTimes.length > 0
    ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
    : 0;
  
  // Agrupar por estado
  const byStatus: Record<string, number> = {
    draft: 0,
    submitted: 0,
    under_review: 0,
    pre_approved: 0,
    approved: 0,
    pending_info: 0,
    rejected: 0,
  };
  requests.forEach(r => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  });
  
  // Agrupar por vendedor y obtener nombres
  const bySeller: Record<string, { requests: number; approvals: number; rejections: number; approvalRate: number; name?: string }> = {};
  const sellerIds = new Set<string>();
  requests.forEach(r => {
    if (r.createdBy) {
      sellerIds.add(r.createdBy);
    }
    if (!bySeller[r.createdBy]) {
      bySeller[r.createdBy] = { requests: 0, approvals: 0, rejections: 0, approvalRate: 0 };
    }
    bySeller[r.createdBy].requests++;
    if (r.status === 'approved') bySeller[r.createdBy].approvals++;
    if (r.status === 'rejected') bySeller[r.createdBy].rejections++;
  });
  
  // Obtener nombres de los vendedores
  const { getUserById } = await import('@autodealers/core');
  for (const sellerId of sellerIds) {
    try {
      const seller = await getUserById(sellerId);
      if (seller && bySeller[sellerId]) {
        bySeller[sellerId].name = seller.name || seller.email || sellerId;
      }
    } catch (error) {
      console.error(`Error obteniendo nombre del vendedor ${sellerId}:`, error);
      if (bySeller[sellerId]) {
        bySeller[sellerId].name = sellerId;
      }
    }
  }
  
  Object.keys(bySeller).forEach(sellerId => {
    const seller = bySeller[sellerId];
    seller.approvalRate = seller.requests > 0 ? (seller.approvals / seller.requests) * 100 : 0;
    // Si no se pudo obtener el nombre, usar el ID como fallback
    if (!seller.name) {
      seller.name = sellerId;
    }
  });
  
  // Agrupar por rango de crédito
  const byCreditRange: Record<string, { requests: number; approvals: number; approvalRate: number }> = {
    excellent: { requests: 0, approvals: 0, approvalRate: 0 },
    good: { requests: 0, approvals: 0, approvalRate: 0 },
    fair: { requests: 0, approvals: 0, approvalRate: 0 },
    poor: { requests: 0, approvals: 0, approvalRate: 0 },
    very_poor: { requests: 0, approvals: 0, approvalRate: 0 },
  };
  requests.forEach(r => {
    const range = r.creditInfo?.creditRange || 'fair';
    byCreditRange[range].requests++;
    if (r.status === 'approved') byCreditRange[range].approvals++;
  });
  Object.keys(byCreditRange).forEach(range => {
    const cr = byCreditRange[range];
    cr.approvalRate = cr.requests > 0 ? (cr.approvals / cr.requests) * 100 : 0;
  });
  
  // Calcular promedios
  const incomes = requests.map(r => r.employment?.monthlyIncome || 0).filter(i => i > 0);
  const averageIncome = incomes.length > 0
    ? incomes.reduce((a, b) => a + b, 0) / incomes.length
    : 0;
  
  const creditScores = requests
    .map(r => r.approvalScore?.score)
    .filter((s): s is number => s !== undefined);
  const averageCreditScore = creditScores.length > 0
    ? creditScores.reduce((a, b) => a + b, 0) / creditScores.length
    : 0;
  
  // Obtener información de vehículos para calcular promedios de down payment y loan amount
  let totalDownPayment = 0;
  let totalLoanAmount = 0;
  let countWithVehicle = 0;
  
  for (const request of requests) {
    const client = await getFIClientByIdDirect(tenantId, request.clientId);
    if (client?.vehiclePrice && client?.downPayment) {
      totalDownPayment += client.downPayment;
      totalLoanAmount += client.vehiclePrice - client.downPayment;
      countWithVehicle++;
    }
  }
  
  return {
    period: { start: startDate, end: endDate },
    approvalRate,
    averageProcessingTime,
    pendingRequests: byStatus.submitted + byStatus.under_review + byStatus.pending_info,
    byStatus,
    averageIncome,
    averageCreditScore,
    averageDownPayment: countWithVehicle > 0 ? totalDownPayment / countWithVehicle : 0,
    averageLoanAmount: countWithVehicle > 0 ? totalLoanAmount / countWithVehicle : 0,
    bySeller,
    byCreditRange,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Últimos 30 días por defecto
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    const metrics = await getFIMetricsDirect(auth.tenantId!, startDate, endDate);

    // Convertir fechas a ISO strings para JSON
    const metricsResponse = {
      ...metrics,
      period: {
        start: metrics.period.start.toISOString(),
        end: metrics.period.end.toISOString(),
      },
    };

    return NextResponse.json({ metrics: metricsResponse });
  } catch (error: any) {
    console.error('Error fetching FI metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener métricas F&I' },
      { status: 500 }
    );
  }
}

