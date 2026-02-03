import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

// Implementación directa simplificada de calculateApprovalScore
function calculateApprovalScore(
  request: any,
  vehiclePrice: number,
  downPayment: number,
  monthlyPayment: number
) {
  let score = 0;
  const reasons: string[] = [];
  const riskFactors: string[] = [];
  const positiveFactors: string[] = [];
  
  const creditScoreMap: Record<string, number> = {
    excellent: 30, good: 25, fair: 18, poor: 10, very_poor: 5,
  };
  const creditScore = creditScoreMap[request.creditInfo?.creditRange] || 0;
  score += creditScore;
  
  const monthlyIncome = request.employment?.monthlyIncome || 0;
  if (monthlyIncome > 0) {
    const dtiRatio = (monthlyPayment / monthlyIncome) * 100;
    if (dtiRatio <= 20) { score += 25; positiveFactors.push('DTI ratio excelente'); }
    else if (dtiRatio <= 30) { score += 20; positiveFactors.push('DTI ratio bueno'); }
    else if (dtiRatio <= 40) { score += 15; riskFactors.push('DTI ratio moderado'); }
    else if (dtiRatio <= 50) { score += 8; riskFactors.push('DTI ratio alto'); }
    else { score += 2; riskFactors.push('DTI ratio muy alto'); }
  }
  
  const monthsAtJob = request.employment?.timeAtJob || 0;
  if (monthsAtJob >= 24) { score += 20; positiveFactors.push('Estabilidad laboral excelente'); }
  else if (monthsAtJob >= 12) { score += 15; positiveFactors.push('Estabilidad laboral buena'); }
  else if (monthsAtJob >= 6) { score += 10; riskFactors.push('Estabilidad laboral moderada'); }
  else { score += 5; riskFactors.push('Estabilidad laboral baja'); }
  
  if (request.employment?.incomeType === 'salary') {
    score += 10;
    positiveFactors.push('Ingreso fijo');
  }
  
  const downPaymentPercent = (downPayment / vehiclePrice) * 100;
  if (downPaymentPercent >= 20) { score += 10; positiveFactors.push('Pronto pago alto'); }
  else if (downPaymentPercent >= 10) { score += 7; positiveFactors.push('Pronto pago moderado'); }
  else if (downPaymentPercent >= 5) { score += 4; riskFactors.push('Pronto pago bajo'); }
  else { score += 1; riskFactors.push('Pronto pago muy bajo'); }
  
  let recommendation: 'approve' | 'conditional' | 'reject' | 'needs_cosigner';
  const probability = score / 100;
  
  if (score >= 75) {
    recommendation = 'approve';
    reasons.push('Score alto: Aprobación recomendada');
  } else if (score >= 60) {
    recommendation = 'conditional';
    reasons.push('Score moderado: Aprobación condicional');
  } else if (score >= 45) {
    recommendation = 'needs_cosigner';
    reasons.push('Score bajo: Se recomienda co-signer');
  } else {
    recommendation = 'reject';
    reasons.push('Score muy bajo: Rechazo recomendado');
  }
  
  return {
    score: Math.round(score),
    probability,
    recommendation,
    reasons,
    riskFactors,
    positiveFactors,
    suggestedDownPayment: downPaymentPercent < 20 ? vehiclePrice * 0.20 : undefined,
    suggestedTerm: monthlyPayment > monthlyIncome * 0.30 ? Math.ceil((vehiclePrice - downPayment) / (monthlyIncome * 0.30)) : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, vehiclePrice, downPayment, monthlyPayment } = body;

    if (!requestId || vehiclePrice === undefined || downPayment === undefined || monthlyPayment === undefined) {
      return NextResponse.json(
        { error: 'requestId, vehiclePrice, downPayment y monthlyPayment son requeridos' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const requestDoc = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('fi_requests')
      .doc(requestId)
      .get();

    if (!requestDoc.exists) {
      return NextResponse.json({ error: 'Solicitud F&I no encontrada' }, { status: 404 });
    }

    const requestData = requestDoc.data();
    const score = calculateApprovalScore(requestData, vehiclePrice, downPayment, monthlyPayment);
    
    await requestDoc.ref.update({
      approvalScore: score,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ score });
  } catch (error: any) {
    console.error('Error calculating approval score:', error);
    return NextResponse.json(
      { error: error.message || 'Error al calcular score de aprobación' },
      { status: 500 }
    );
  }
}


