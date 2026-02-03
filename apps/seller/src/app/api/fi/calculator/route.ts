import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

// Implementación directa de calculateFinancing
function calculateFinancing(calc: {
  vehiclePrice: number;
  downPayment: number;
  tradeInValue?: number;
  interestRate: number;
  loanTerm: number;
  taxRate?: number;
  fees?: number;
  monthlyIncome?: number;
}) {
  const taxRate = calc.taxRate || 0;
  const fees = calc.fees || 0;
  const tradeInValue = calc.tradeInValue || 0;
  
  const subtotal = calc.vehiclePrice - calc.downPayment - tradeInValue;
  const tax = subtotal * (taxRate / 100);
  const principalAmount = subtotal + tax + fees;
  
  const monthlyRate = (calc.interestRate / 100) / 12;
  
  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = principalAmount / calc.loanTerm;
  } else {
    monthlyPayment = principalAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, calc.loanTerm)) / 
      (Math.pow(1 + monthlyRate, calc.loanTerm) - 1);
  }
  
  const totalAmount = monthlyPayment * calc.loanTerm;
  const totalInterest = totalAmount - principalAmount;
  
  let dtiRatio: number | undefined;
  let affordability: 'affordable' | 'tight' | 'unaffordable' = 'affordable';
  
  if (calc.monthlyIncome) {
    dtiRatio = (monthlyPayment / calc.monthlyIncome) * 100;
    if (dtiRatio > 40) {
      affordability = 'unaffordable';
    } else if (dtiRatio > 30) {
      affordability = 'tight';
    }
  }
  
  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    principalAmount: Math.round(principalAmount * 100) / 100,
    dtiRatio,
    affordability,
    breakdown: {
      principal: Math.round(subtotal * 100) / 100,
      interest: Math.round(totalInterest * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      fees: Math.round(fees * 100) / 100,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, calculator } = body;

    if (!calculator || !requestId) {
      return NextResponse.json(
        { error: 'requestId y calculator son requeridos' },
        { status: 400 }
      );
    }

    const calculation = calculateFinancing(calculator);

    // Actualizar solicitud F&I con el cálculo
    const db = getFirestore();
    const requestRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('fi_requests')
      .doc(requestId);
    
    await requestRef.update({
      financingCalculation: calculation,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ calculation });
  } catch (error: any) {
    console.error('Error calculating financing:', error);
    return NextResponse.json(
      { error: error.message || 'Error al calcular financiamiento' },
      { status: 500 }
    );
  }
}


