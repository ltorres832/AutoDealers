import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

// Implementación directa para evitar problemas de webpack
async function getFIRequestByIdDirect(tenantId: string, requestId: string) {
  const requestDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId)
    .get();

  if (!requestDoc.exists) {
    return null;
  }

  const data = requestDoc.data();
  return {
    id: requestDoc.id,
    ...data,
    history: (data?.history || []).map((h: any) => ({
      ...h,
      timestamp: h.timestamp?.toDate() || new Date(),
    })),
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
    submittedAt: data?.submittedAt?.toDate() || undefined,
    reviewedAt: data?.reviewedAt?.toDate() || undefined,
  };
}

async function getFIClientByIdDirect(tenantId: string, clientId: string) {
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
    id: clientDoc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  };
}

// Implementación simplificada de compareFinancingOptions
function compareFinancingOptionsDirect(
  request: any,
  vehiclePrice: number,
  downPayment: number,
  options: any[]
) {
  // Calcular mejor opción basada en tasa de interés y pago mensual
  const bestOption = options.reduce((best, current) => {
    if (!best) return current;
    if (current.interestRate < best.interestRate) return current;
    if (current.interestRate === best.interestRate && current.monthlyPayment < best.monthlyPayment) {
      return current;
    }
    return best;
  }, options[0]);

  return {
    bestOption,
    options: options.map(opt => ({
      ...opt,
      savings: bestOption.monthlyPayment - opt.monthlyPayment,
    })),
  };
}

interface FinancingOption {
  id: string;
  lender: string;
  lenderType: string;
  type: string;
  interestRate: number;
  monthlyPayment: number;
  totalAmount: number;
  term: number;
  downPayment: number;
  requirements: string[];
  approvalProbability: number;
  isRecommended: boolean;
  features: string[];
  createdAt: Date;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || (auth.role !== 'dealer' && auth.role !== 'seller')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, options } = body;

    if (!requestId || !options || !Array.isArray(options)) {
      return NextResponse.json(
        { error: 'requestId y options (array) son requeridos' },
        { status: 400 }
      );
    }

    const fiRequest = await getFIRequestByIdDirect(auth.tenantId!, requestId);
    if (!fiRequest) {
      return NextResponse.json(
        { error: 'Solicitud F&I no encontrada' },
        { status: 404 }
      );
    }

    const fiRequestAny = fiRequest as any;
    const client = await getFIClientByIdDirect(auth.tenantId!, fiRequestAny.clientId);
    const clientAny = client as any;
    if (!client || !clientAny.vehiclePrice || !clientAny.downPayment) {
      return NextResponse.json(
        { error: 'Cliente o información del vehículo no encontrada' },
        { status: 404 }
      );
    }

    const comparison = compareFinancingOptionsDirect(
      fiRequestAny,
      clientAny.vehiclePrice,
      clientAny.downPayment,
      options as FinancingOption[]
    );

    // Actualizar solicitud con opciones de financiamiento
    const requestRef = db
      .collection('tenants')
      .doc(auth.tenantId!)
      .collection('fi_requests')
      .doc(requestId);

    await requestRef.update({
      financingOptions: options,
      selectedFinancingOption: comparison.bestOption.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ comparison });
  } catch (error: any) {
    console.error('Error comparing financing options:', error);
    return NextResponse.json(
      { error: error.message || 'Error al comparar opciones de financiamiento' },
      { status: 500 }
    );
  }
}

