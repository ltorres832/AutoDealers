// Módulo F&I (Finance & Insurance)
// Gestión completa de solicitudes F&I, clientes, historial y trazabilidad

import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

// ============================================
// TIPOS E INTERFACES
// ============================================

export type FIRequestStatus = 
  | 'draft'           // Borrador (vendedor aún editando)
  | 'submitted'      // Enviado a F&I (pendiente revisión)
  | 'under_review'     // En revisión por gerente F&I
  | 'pre_approved'     // Pre-aprobado internamente
  | 'approved'         // Aprobado internamente
  | 'pending_info'     // Pendiente información adicional
  | 'rejected';        // Rechazado

export type CreditRange = 
  | 'excellent'        // 750+
  | 'good'            // 700-749
  | 'fair'            // 650-699
  | 'poor'            // 600-649
  | 'very_poor';      // <600

export type IncomeType = 
  | 'salary'
  | 'self_employed'
  | 'business'
  | 'retirement'
  | 'other';

export type HousingType = 
  | 'rent'
  | 'own'
  | 'family';

export interface FIClient {
  id: string;
  tenantId: string;
  // Datos básicos
  name: string;
  phone: string;
  email?: string;
  address?: string;
  identification?: string; // Opcional
  // Datos del vehículo
  vehicleId?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehiclePrice?: number;
  downPayment?: number;
  hasTradeIn?: boolean;
  tradeInDetails?: {
    make?: string;
    model?: string;
    year?: number;
    estimatedValue?: number;
  };
  // Metadata
  createdBy: string; // userId del vendedor
  createdAt: Date;
  updatedAt: Date;
}

export interface FIRequest {
  id: string;
  tenantId: string;
  clientId: string; // Referencia a FIClient
  // Información financiera
  employment: {
    employer?: string;
    position?: string;
    monthlyIncome: number;
    timeAtJob: number; // Meses
    incomeType: IncomeType;
  };
  creditInfo: {
    creditRange: CreditRange;
    notes?: string;
  };
  // Información adicional
  personalInfo: {
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    dependents: number;
    housing: HousingType;
    monthlyHousingPayment?: number;
  };
  // Estado y flujo
  status: FIRequestStatus;
  submittedAt?: Date;
  submittedBy?: string; // userId del vendedor
  reviewedAt?: Date;
  reviewedBy?: string; // userId del gerente F&I
  // Notas y seguimiento
  sellerNotes?: string; // Notas del vendedor
  fiManagerNotes?: string; // Notas del gerente F&I
  internalNotes?: string; // Notas internas (solo gerente F&I)
  // Scoring y aprobación
  approvalScore?: ApprovalScore;
  financingCalculation?: FinancingCalculationResult;
  // Co-signer
  cosigner?: Cosigner;
  combinedScore?: number; // Score combinado cliente + co-signer
  // Opciones de financiamiento
  financingOptions?: FinancingOption[];
  selectedFinancingOption?: string; // ID de la opción seleccionada
  // Firmas digitales
  digitalSignatures?: DigitalSignature[];
  // Historial
  history: FIRequestHistory[];
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FIRequestHistory {
  id: string;
  action: 
    | 'created'
    | 'submitted'
    | 'status_changed'
    | 'note_added'
    | 'info_requested'
    | 'reviewed';
  performedBy: string; // userId
  performedByName?: string; // Nombre del usuario
  timestamp: Date;
  previousStatus?: FIRequestStatus;
  newStatus?: FIRequestStatus;
  notes?: string;
  metadata?: Record<string, any>;
}

// ============================================
// FUNCIONES DE CLIENTES F&I
// ============================================

/**
 * Crea un nuevo cliente F&I
 */
export async function createFIClient(
  tenantId: string,
  clientData: Omit<FIClient, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<FIClient> {
  const clientRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .doc();

  const client: Omit<FIClient, 'id'> = {
    ...clientData,
    tenantId,
    createdBy,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  await clientRef.set(client);

  return {
    id: clientRef.id,
    ...client,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene un cliente F&I por ID
 */
export async function getFIClientById(
  tenantId: string,
  clientId: string
): Promise<FIClient | null> {
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
    createdAt: (data?.createdAt?.toDate() || new Date()) as Date,
    updatedAt: (data?.updatedAt?.toDate() || new Date()) as Date,
  } as FIClient;
}

/**
 * Obtiene todos los clientes F&I de un tenant
 */
export async function getFIClients(
  tenantId: string
): Promise<FIClient[]> {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data?.createdAt?.toDate() || new Date()) as Date,
      updatedAt: (data?.updatedAt?.toDate() || new Date()) as Date,
    } as FIClient;
  });
}

/**
 * Actualiza un cliente F&I
 */
export async function updateFIClient(
  tenantId: string,
  clientId: string,
  updates: Partial<Omit<FIClient, 'id' | 'tenantId' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .doc(clientId)
    .update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

// ============================================
// FUNCIONES DE SOLICITUDES F&I
// ============================================

/**
 * Crea una nueva solicitud F&I
 */
export async function createFIRequest(
  tenantId: string,
  requestData: Omit<FIRequest, 'id' | 'tenantId' | 'history' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<FIRequest> {
  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc();

  const initialHistory: FIRequestHistory = {
    id: db.collection('_').doc().id,
    action: 'created',
    performedBy: createdBy,
    timestamp: new Date(),
    notes: 'Solicitud F&I creada',
  };

  const request: Omit<FIRequest, 'id'> = {
    ...requestData,
    tenantId,
    status: 'draft',
    history: [initialHistory],
    createdBy,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  await requestRef.set(request);

  return {
    id: requestRef.id,
    ...request,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Envía una solicitud F&I al gerente F&I
 */
export async function submitFIRequest(
  tenantId: string,
  requestId: string,
  submittedBy: string,
  sellerNotes?: string
): Promise<void> {
  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);

  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) {
    throw new Error('Solicitud F&I no encontrada');
  }

  const currentData = requestDoc.data() as FIRequest;
  const currentHistory = currentData.history || [];

  const historyEntry: FIRequestHistory = {
    id: db.collection('_').doc().id,
    action: 'submitted',
    performedBy: submittedBy,
    timestamp: new Date(),
    previousStatus: currentData.status,
    newStatus: 'submitted',
    notes: sellerNotes || 'Solicitud enviada a F&I',
  };

  await requestRef.update({
    status: 'submitted',
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    submittedBy,
    sellerNotes: sellerNotes || currentData.sellerNotes,
    history: [...currentHistory, historyEntry],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  // Ejecutar workflows automáticos
  try {
    await executeFIWorkflows(tenantId, {
      ...currentData,
      id: requestId,
      status: 'submitted',
      submittedAt: new Date(),
      submittedBy,
    } as FIRequest);
  } catch (error) {
    console.error('Error ejecutando workflows:', error);
  }
  
  // La notificación se maneja desde la API route que llama a esta función
}

/**
 * Actualiza el estado de una solicitud F&I (solo gerente F&I)
 */
export async function updateFIRequestStatus(
  tenantId: string,
  requestId: string,
  newStatus: FIRequestStatus,
  reviewedBy: string,
  fiManagerNotes?: string,
  internalNotes?: string
): Promise<void> {
  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);

  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) {
    throw new Error('Solicitud F&I no encontrada');
  }

  const currentData = requestDoc.data() as FIRequest;
  const currentHistory = currentData.history || [];
  const previousStatus = currentData.status;

  const historyEntry: FIRequestHistory = {
    id: db.collection('_').doc().id,
    action: 'status_changed',
    performedBy: reviewedBy,
    timestamp: new Date(),
    previousStatus,
    newStatus,
    notes: fiManagerNotes || `Estado cambiado a ${newStatus}`,
  };

  const updateData: any = {
    status: newStatus,
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewedBy,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    history: [...currentHistory, historyEntry],
  };

  if (fiManagerNotes) {
    updateData.fiManagerNotes = fiManagerNotes;
  }

  if (internalNotes) {
    updateData.internalNotes = internalNotes;
  }

  await requestRef.update(updateData);

  // Enviar notificación al vendedor que creó la solicitud
  if (currentData.createdBy && previousStatus !== newStatus) {
    try {
      // Obtener información del cliente para el mensaje
      const clientDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_clients')
        .doc(currentData.clientId)
        .get();
      const clientName = clientDoc.exists ? clientDoc.data()?.name || 'Cliente' : 'Cliente';

      // Mapear estados a mensajes amigables
      const statusMessages: Record<FIRequestStatus, { title: string; message: string }> = {
        draft: { title: 'Solicitud F&I en Borrador', message: 'Tu solicitud F&I está en borrador' },
        submitted: { title: 'Solicitud F&I Enviada', message: 'Tu solicitud F&I ha sido enviada para revisión' },
        under_review: { title: 'Solicitud F&I en Revisión', message: 'Tu solicitud F&I está siendo revisada' },
        pre_approved: { title: '¡Solicitud F&I Pre-Aprobada!', message: `¡Excelente noticia! La solicitud F&I para ${clientName} ha sido pre-aprobada` },
        approved: { title: '¡Solicitud F&I Aprobada!', message: `¡Felicidades! La solicitud F&I para ${clientName} ha sido aprobada` },
        pending_info: { title: 'Información Pendiente - Solicitud F&I', message: `La solicitud F&I para ${clientName} necesita información adicional. Por favor revisa las notas del gerente F&I` },
        rejected: { title: 'Solicitud F&I Rechazada', message: `La solicitud F&I para ${clientName} ha sido rechazada. Por favor revisa las notas del gerente F&I para más detalles` },
      };

      const statusInfo = statusMessages[newStatus] || {
        title: 'Estado de Solicitud F&I Actualizado',
        message: `El estado de la solicitud F&I para ${clientName} ha cambiado a: ${newStatus}`,
      };

      // Importar createNotification dinámicamente para evitar dependencias circulares
      const { createNotification } = await import('@autodealers/core');
      
      await createNotification({
        tenantId,
        userId: currentData.createdBy,
        type: 'system_alert',
        title: statusInfo.title,
        message: fiManagerNotes 
          ? `${statusInfo.message}\n\nNotas del Gerente F&I: ${fiManagerNotes}`
          : statusInfo.message,
        channels: ['system', 'email'],
        metadata: {
          requestId,
          clientId: currentData.clientId,
          previousStatus,
          newStatus,
          action: 'fi_request_status_changed',
        },
      });

      console.log(`✅ Notificación enviada al vendedor ${currentData.createdBy} sobre cambio de estado F&I: ${previousStatus} → ${newStatus}`);
    } catch (notificationError) {
      // No fallar si la notificación falla, solo loguear
      console.error('Error enviando notificación F&I al vendedor:', notificationError);
    }
  }
}

/**
 * Agrega una nota a una solicitud F&I
 */
export async function addFIRequestNote(
  tenantId: string,
  requestId: string,
  note: string,
  addedBy: string,
  isInternal: boolean = false
): Promise<void> {
  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);

  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) {
    throw new Error('Solicitud F&I no encontrada');
  }

  const currentData = requestDoc.data() as FIRequest;
  const currentHistory = currentData.history || [];

  const historyEntry: FIRequestHistory = {
    id: db.collection('_').doc().id,
    action: 'note_added',
    performedBy: addedBy,
    timestamp: new Date(),
    notes: note,
    metadata: { isInternal },
  };

  const updateData: any = {
    history: [...currentHistory, historyEntry],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (isInternal) {
    updateData.internalNotes = (currentData.internalNotes || '') + `\n[${new Date().toLocaleString()}] ${note}`;
  } else {
    updateData.fiManagerNotes = (currentData.fiManagerNotes || '') + `\n[${new Date().toLocaleString()}] ${note}`;
  }

  await requestRef.update(updateData);
}

/**
 * Obtiene una solicitud F&I por ID
 */
export async function getFIRequestById(
  tenantId: string,
  requestId: string
): Promise<FIRequest | null> {
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
    createdAt: (data?.createdAt?.toDate() || new Date()) as Date,
    updatedAt: (data?.updatedAt?.toDate() || new Date()) as Date,
    submittedAt: data?.submittedAt?.toDate() || undefined,
    reviewedAt: data?.reviewedAt?.toDate() || undefined,
  } as FIRequest;
}

/**
 * Obtiene todas las solicitudes F&I de un tenant
 */
export async function getFIRequests(
  tenantId: string,
  filters?: {
    status?: FIRequestStatus;
    clientId?: string;
    createdBy?: string;
  }
): Promise<FIRequest[]> {
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .orderBy('createdAt', 'desc');

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters?.clientId) {
    query = query.where('clientId', '==', filters.clientId);
  }

  if (filters?.createdBy) {
    query = query.where('createdBy', '==', filters.createdBy);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      history: (data?.history || []).map((h: any) => ({
        ...h,
        timestamp: h.timestamp?.toDate() || new Date(),
      })),
      createdAt: (data?.createdAt?.toDate() || new Date()) as Date,
      updatedAt: (data?.updatedAt?.toDate() || new Date()) as Date,
      submittedAt: data?.submittedAt?.toDate() || undefined,
      reviewedAt: data?.reviewedAt?.toDate() || undefined,
    } as FIRequest;
  });
}

/**
 * Obtiene el historial completo de una solicitud F&I
 */
export async function getFIRequestHistory(
  tenantId: string,
  requestId: string
): Promise<FIRequestHistory[]> {
  const request = await getFIRequestById(tenantId, requestId);
  return request?.history || [];
}

// ============================================
// TIPOS E INTERFACES PARA CALCULADORA DE FINANCIAMIENTO
// ============================================

export interface FinancingCalculator {
  vehiclePrice: number;
  downPayment: number;
  tradeInValue?: number;
  interestRate: number; // APR anual
  loanTerm: number; // meses
  taxRate?: number; // porcentaje
  fees?: number; // fees adicionales
  monthlyIncome?: number; // para calcular DTI
}

export interface FinancingCalculationResult {
  monthlyPayment: number;
  totalInterest: number;
  totalAmount: number;
  principalAmount: number;
  dtiRatio?: number; // Debt-to-Income ratio
  affordability: 'affordable' | 'tight' | 'unaffordable';
  breakdown: {
    principal: number;
    interest: number;
    tax: number;
    fees: number;
  };
}

/**
 * Calcula el pago mensual y detalles de financiamiento
 */
export function calculateFinancing(calc: FinancingCalculator): FinancingCalculationResult {
  const taxRate = calc.taxRate || 0;
  const fees = calc.fees || 0;
  const tradeInValue = calc.tradeInValue || 0;
  
  // Calcular monto principal (precio - pronto pago - trade-in + tax + fees)
  const subtotal = calc.vehiclePrice - calc.downPayment - tradeInValue;
  const tax = subtotal * (taxRate / 100);
  const principalAmount = subtotal + tax + fees;
  
  // Convertir APR anual a tasa mensual
  const monthlyRate = (calc.interestRate / 100) / 12;
  
  // Calcular pago mensual usando fórmula de amortización
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
  
  // Calcular DTI ratio si hay ingreso mensual
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

// ============================================
// TIPOS E INTERFACES PARA SCORING DE APROBACIÓN
// ============================================

export interface ApprovalScore {
  score: number; // 0-100
  probability: number; // 0-1
  recommendation: 'approve' | 'conditional' | 'reject' | 'needs_cosigner';
  reasons: string[];
  suggestedDownPayment?: number;
  suggestedTerm?: number;
  riskFactors: string[];
  positiveFactors: string[];
}

/**
 * Calcula el score de aprobación basado en múltiples factores
 */
export function calculateApprovalScore(
  request: FIRequest,
  vehiclePrice: number,
  downPayment: number,
  monthlyPayment: number
): ApprovalScore {
  let score = 0;
  const reasons: string[] = [];
  const riskFactors: string[] = [];
  const positiveFactors: string[] = [];
  
  // Factor 1: Rango de crédito (0-30 puntos)
  const creditScoreMap: Record<CreditRange, number> = {
    excellent: 30,
    good: 25,
    fair: 18,
    poor: 10,
    very_poor: 5,
  };
  const creditScore = creditScoreMap[request.creditInfo.creditRange] || 0;
  score += creditScore;
  if (request.creditInfo.creditRange === 'excellent' || request.creditInfo.creditRange === 'good') {
    positiveFactors.push('Excelente o buen historial crediticio');
  } else if (request.creditInfo.creditRange === 'very_poor' || request.creditInfo.creditRange === 'poor') {
    riskFactors.push('Historial crediticio bajo');
  }
  
  // Factor 2: Relación deuda/ingreso (0-25 puntos)
  const monthlyIncome = request.employment.monthlyIncome;
  if (monthlyIncome > 0) {
    const dtiRatio = (monthlyPayment / monthlyIncome) * 100;
    if (dtiRatio <= 20) {
      score += 25;
      positiveFactors.push('DTI ratio excelente (≤20%)');
    } else if (dtiRatio <= 30) {
      score += 20;
      positiveFactors.push('DTI ratio bueno (≤30%)');
    } else if (dtiRatio <= 40) {
      score += 15;
      riskFactors.push('DTI ratio moderado (30-40%)');
    } else if (dtiRatio <= 50) {
      score += 8;
      riskFactors.push('DTI ratio alto (40-50%)');
    } else {
      score += 2;
      riskFactors.push('DTI ratio muy alto (>50%)');
    }
  }
  
  // Factor 3: Tiempo en empleo (0-20 puntos)
  const monthsAtJob = request.employment.timeAtJob;
  if (monthsAtJob >= 24) {
    score += 20;
    positiveFactors.push('Estabilidad laboral excelente (≥24 meses)');
  } else if (monthsAtJob >= 12) {
    score += 15;
    positiveFactors.push('Estabilidad laboral buena (≥12 meses)');
  } else if (monthsAtJob >= 6) {
    score += 10;
    riskFactors.push('Estabilidad laboral moderada (6-12 meses)');
  } else {
    score += 5;
    riskFactors.push('Estabilidad laboral baja (<6 meses)');
  }
  
  // Factor 4: Tipo de ingreso (0-10 puntos)
  if (request.employment.incomeType === 'salary') {
    score += 10;
    positiveFactors.push('Ingreso fijo (salario)');
  } else if (request.employment.incomeType === 'self_employed') {
    score += 6;
    riskFactors.push('Ingreso variable (autoempleado)');
  } else {
    score += 5;
  }
  
  // Factor 5: Pronto pago (0-10 puntos)
  const downPaymentPercent = (downPayment / vehiclePrice) * 100;
  if (downPaymentPercent >= 20) {
    score += 10;
    positiveFactors.push('Pronto pago alto (≥20%)');
  } else if (downPaymentPercent >= 10) {
    score += 7;
    positiveFactors.push('Pronto pago moderado (10-20%)');
  } else if (downPaymentPercent >= 5) {
    score += 4;
    riskFactors.push('Pronto pago bajo (5-10%)');
  } else {
    score += 1;
    riskFactors.push('Pronto pago muy bajo (<5%)');
  }
  
  // Factor 6: Estado civil y dependientes (0-5 puntos)
  if (request.personalInfo.maritalStatus === 'married' && request.personalInfo.dependents <= 2) {
    score += 5;
  } else if (request.personalInfo.dependents <= 2) {
    score += 3;
  } else {
    score += 1;
    riskFactors.push('Muchos dependientes');
  }
  
  // Determinar recomendación
  let recommendation: ApprovalScore['recommendation'];
  const probability = score / 100;
  
  if (score >= 75) {
    recommendation = 'approve';
    reasons.push('Score alto: Aprobación recomendada');
  } else if (score >= 60) {
    recommendation = 'conditional';
    reasons.push('Score moderado: Aprobación condicional recomendada');
    if (downPaymentPercent < 10) {
      reasons.push('Considerar aumentar pronto pago');
    }
  } else if (score >= 45) {
    recommendation = 'needs_cosigner';
    reasons.push('Score bajo: Se recomienda co-signer');
    riskFactors.push('Requiere co-signer para aprobación');
  } else {
    recommendation = 'reject';
    reasons.push('Score muy bajo: Rechazo recomendado');
  }
  
  // Sugerencias
  let suggestedDownPayment: number | undefined;
  let suggestedTerm: number | undefined;
  
  if (recommendation === 'conditional' || recommendation === 'needs_cosigner') {
    if (downPaymentPercent < 20) {
      suggestedDownPayment = vehiclePrice * 0.20; // Sugerir 20%
    }
    if (monthlyPayment > monthlyIncome * 0.30) {
      suggestedTerm = Math.ceil((vehiclePrice - downPayment) / (monthlyIncome * 0.30)); // Extender plazo
    }
  }
  
  return {
    score: Math.round(score),
    probability,
    recommendation,
    reasons,
    suggestedDownPayment,
    suggestedTerm,
    riskFactors,
    positiveFactors,
  };
}

// ============================================
// TIPOS E INTERFACES PARA CO-SIGNERS
// ============================================

export interface Cosigner {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: 'spouse' | 'parent' | 'sibling' | 'other';
  employment: {
    employer: string;
    monthlyIncome: number;
    timeAtJob: number;
    incomeType: IncomeType;
  };
  creditInfo: {
    creditRange: CreditRange;
    creditScore?: number;
    notes?: string;
  };
  personalInfo: {
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    address?: string;
    identification?: string;
  };
  documents: Array<{
    type: DocumentType;
    url: string;
    uploadedAt: Date;
  }>;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// TIPOS E INTERFACES PARA FIRMAS DIGITALES
// ============================================

export interface DigitalSignature {
  id: string;
  tenantId: string;
  requestId: string;
  documentId: string;
  documentType: DocumentTemplate;
  signers: Array<{
    email: string;
    name: string;
    role: 'client' | 'dealer' | 'cosigner' | 'fi_manager';
    status: 'pending' | 'sent' | 'signed' | 'declined';
    signedAt?: Date;
    signatureUrl?: string;
  }>;
  status: 'draft' | 'sent' | 'signed' | 'declined' | 'expired';
  documentUrl: string;
  signedDocumentUrl?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentTemplate = 
  | 'credit_application'
  | 'pre_approval_letter'
  | 'rejection_letter'
  | 'financing_contract'
  | 'terms_agreement'
  | 'cosigner_agreement';

// ============================================
// TIPOS E INTERFACES PARA OPCIONES DE FINANCIAMIENTO
// ============================================

export interface FinancingOption {
  id: string;
  lender: string;
  lenderType: 'internal' | 'bank' | 'credit_union' | 'captive' | 'other';
  type: 'purchase' | 'lease';
  interestRate: number; // APR
  monthlyPayment: number;
  totalAmount: number;
  term: number; // meses
  downPayment: number;
  requirements: string[];
  approvalProbability: number; // 0-1
  isRecommended: boolean;
  features: string[];
  createdAt: Date;
}

// ============================================
// TIPOS E INTERFACES PARA REPORTE DE CRÉDITO
// ============================================

export interface CreditReport {
  creditScore: number;
  creditRange: CreditRange;
  paymentHistory: {
    onTime: number;
    late: number;
    missed: number;
    totalAccounts: number;
  };
  currentDebts: number;
  openCreditLines: number;
  inquiries: number;
  verified: boolean; // Si la info del cliente coincide
  reportDate: Date;
  provider: string;
}

// ============================================
// TIPOS E INTERFACES PARA VALIDACIÓN DE DOCUMENTOS
// ============================================

export interface DocumentValidation {
  isValid: boolean;
  isLegible: boolean;
  extractedData: Record<string, any>;
  matchesRequest: boolean;
  discrepancies: string[];
  confidence: number; // 0-1
  validationDate: Date;
}

// ============================================
// TIPOS E INTERFACES PARA MÉTRICAS F&I
// ============================================

export interface FIMetrics {
  period: {
    start: Date;
    end: Date;
  };
  approvalRate: number;
  averageProcessingTime: number; // horas
  pendingRequests: number;
  byStatus: Record<FIRequestStatus, number>;
  averageIncome: number;
  averageCreditScore: number;
  averageDownPayment: number;
  averageLoanAmount: number;
  bySeller: Record<string, {
    requests: number;
    approvals: number;
    rejections: number;
    approvalRate: number;
  }>;
  byCreditRange: Record<CreditRange, {
    requests: number;
    approvals: number;
    approvalRate: number;
  }>;
}

// ============================================
// TIPOS E INTERFACES PARA WORKFLOWS F&I
// ============================================

export interface FIWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  trigger: 'score_threshold' | 'dti_ratio' | 'credit_range' | 'status_change' | 'document_received';
  conditions: Array<{
    field: string;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
    value: any;
  }>;
  actions: Array<{
    type: 'request_documents' | 'change_status' | 'notify' | 'send_email' | 'pre_approve' | 'assign_to';
    config: Record<string, any>;
  }>;
  isActive: boolean;
  runCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// TIPOS E INTERFACES PARA SOLICITUD DE DOCUMENTOS
// ============================================

export type DocumentType = 
  | 'identification'      // Identificación
  | 'proof_of_income'      // Comprobante de ingresos
  | 'bank_statement'       // Estado de cuenta bancario
  | 'tax_return'           // Declaración de impuestos
  | 'employment_letter'    // Carta de empleo
  | 'pay_stub'            // Recibo de pago
  | 'proof_of_address'    // Comprobante de domicilio
  | 'insurance'            // Seguro
  | 'trade_in_title'      // Título de vehículo de intercambio
  | 'other';              // Otro

export interface DocumentRequest {
  id: string;
  tenantId: string;
  requestId: string; // Referencia a FIRequest
  clientId: string;  // Referencia a FIClient
  token: string;     // Token único para el link público
  requestedDocuments: Array<{
    type: DocumentType;
    name: string;
    description?: string;
    required: boolean;
  }>;
  status: 'pending' | 'submitted' | 'reviewed' | 'expired';
  submittedAt?: Date;
  submittedDocuments: Array<{
    id: string;
    type: DocumentType;
    name: string;
    url: string;
    uploadedAt: Date;
  }>;
  requestedBy: string; // userId del que solicita (F&I, seller, dealer)
  requestedByName?: string;
  createdAt: Date;
  expiresAt: Date;
  updatedAt: Date;
}

// ============================================
// FUNCIONES DE SOLICITUD DE DOCUMENTOS
// ============================================

/**
 * Crea una solicitud de documentos con link único
 */
export async function createDocumentRequest(
  tenantId: string,
  requestId: string,
  clientId: string,
  requestedDocuments: Array<{
    type: DocumentType;
    name: string;
    description?: string;
    required: boolean;
  }>,
  requestedBy: string,
  expiresInDays: number = 7
): Promise<DocumentRequest> {
  // Generar token único
  const token = db.collection('_').doc().id;
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const docRequestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_document_requests')
    .doc();

  const docRequest: Omit<DocumentRequest, 'id'> = {
    tenantId,
    requestId,
    clientId,
    token,
    requestedDocuments,
    status: 'pending',
    submittedDocuments: [],
    requestedBy,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    expiresAt,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  await docRequestRef.set(docRequest);

  return {
    id: docRequestRef.id,
    ...docRequest,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt,
  };
}

/**
 * Obtiene una solicitud de documentos por token
 */
export async function getDocumentRequestByToken(
  token: string
): Promise<DocumentRequest | null> {
  const snapshot = await db
    .collectionGroup('fi_document_requests')
    .where('token', '==', token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  // Verificar si expiró
  const expiresAt = data.expiresAt?.toDate();
  if (expiresAt && expiresAt < new Date() && data.status === 'pending') {
    await doc.ref.update({ status: 'expired' });
    return null;
  }

  return {
    id: doc.id,
    ...data,
    createdAt: (data?.createdAt?.toDate() || new Date()) as Date,
    updatedAt: (data?.updatedAt?.toDate() || new Date()) as Date,
    expiresAt: expiresAt || new Date(),
    submittedAt: data?.submittedAt?.toDate() || undefined,
    submittedDocuments: (data?.submittedDocuments || []).map((doc: any) => ({
      ...doc,
      uploadedAt: doc.uploadedAt?.toDate() || new Date(),
    })),
  } as DocumentRequest;
}

/**
 * Sube un documento a una solicitud
 */
export async function submitDocumentToRequest(
  token: string,
  document: {
    type: DocumentType;
    name: string;
    url: string;
  }
): Promise<void> {
  const docRequest = await getDocumentRequestByToken(token);
  if (!docRequest) {
    throw new Error('Solicitud de documentos no encontrada o expirada');
  }

  if (docRequest.status !== 'pending') {
    throw new Error('Esta solicitud de documentos ya fue procesada');
  }

  const docRequestRef = db
    .collection('tenants')
    .doc(docRequest.tenantId)
    .collection('fi_document_requests')
    .doc(docRequest.id);

  const submittedDoc = {
    id: db.collection('_').doc().id,
    ...document,
    uploadedAt: new Date(),
  };

  await docRequestRef.update({
    submittedDocuments: admin.firestore.FieldValue.arrayUnion(submittedDoc),
    status: 'submitted',
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Obtiene todas las solicitudes de documentos de una solicitud F&I
 */
export async function getDocumentRequestsByFIRequest(
  tenantId: string,
  requestId: string
): Promise<DocumentRequest[]> {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_document_requests')
    .where('requestId', '==', requestId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data?.createdAt?.toDate() || new Date()) as Date,
      updatedAt: (data?.updatedAt?.toDate() || new Date()) as Date,
      expiresAt: (data?.expiresAt?.toDate() || new Date()) as Date,
      submittedAt: data?.submittedAt?.toDate() || undefined,
      submittedDocuments: (data?.submittedDocuments || []).map((doc: any) => ({
        ...doc,
        uploadedAt: doc.uploadedAt?.toDate() || new Date(),
      })),
    } as DocumentRequest;
  });
}

// ============================================
// FUNCIONES PARA CALCULADORA DE FINANCIAMIENTO
// ============================================

/**
 * Calcula financiamiento y actualiza la solicitud F&I
 */
export async function calculateAndUpdateFinancing(
  tenantId: string,
  requestId: string,
  calculator: FinancingCalculator
): Promise<FinancingCalculationResult> {
  const calculation = calculateFinancing(calculator);
  
  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);
  
  await requestRef.update({
    financingCalculation: calculation,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return calculation;
}

// ============================================
// FUNCIONES PARA SCORING DE APROBACIÓN
// ============================================

/**
 * Calcula y actualiza el score de aprobación de una solicitud
 */
export async function calculateAndUpdateApprovalScore(
  tenantId: string,
  requestId: string,
  vehiclePrice: number,
  downPayment: number,
  monthlyPayment: number
): Promise<ApprovalScore> {
  const request = await getFIRequestById(tenantId, requestId);
  if (!request) {
    throw new Error('Solicitud F&I no encontrada');
  }
  
  const score = calculateApprovalScore(request, vehiclePrice, downPayment, monthlyPayment);
  
  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);
  
  await requestRef.update({
    approvalScore: score,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return score;
}

// ============================================
// FUNCIONES PARA CO-SIGNERS
// ============================================

/**
 * Agrega un co-signer a una solicitud F&I
 */
export async function addCosignerToRequest(
  tenantId: string,
  requestId: string,
  cosignerData: Omit<Cosigner, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'documents'>
): Promise<Cosigner> {
  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);
  
  const cosigner: Cosigner = {
    id: db.collection('_').doc().id,
    ...cosignerData,
    documents: [],
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await requestRef.update({
    cosigner,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return cosigner;
}

/**
 * Calcula score combinado (cliente + co-signer)
 */
export function calculateCombinedScore(
  clientScore: ApprovalScore,
  cosignerCreditRange: CreditRange
): number {
  const cosignerScoreMap: Record<CreditRange, number> = {
    excellent: 20,
    good: 15,
    fair: 10,
    poor: 5,
    very_poor: 2,
  };
  
  const cosignerScore = cosignerScoreMap[cosignerCreditRange] || 0;
  // Promedio ponderado: 70% cliente, 30% co-signer
  return Math.round((clientScore.score * 0.7) + (cosignerScore * 0.3));
}

/**
 * Actualiza el estado de un co-signer
 */
export async function updateCosignerStatus(
  tenantId: string,
  requestId: string,
  status: 'approved' | 'rejected',
  approvedBy?: string
): Promise<void> {
  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);
  
  const updateData: any = {
    'cosigner.status': status,
    'cosigner.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  if (status === 'approved') {
    updateData['cosigner.approvedAt'] = admin.firestore.FieldValue.serverTimestamp();
  }
  
  await requestRef.update(updateData);
}

// ============================================
// FUNCIONES PARA MÉTRICAS F&I
// ============================================

/**
 * Obtiene métricas F&I para un período
 */
export async function getFIMetrics(
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
  
  const requests = requestsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    submittedAt: doc.data().submittedAt?.toDate(),
    reviewedAt: doc.data().reviewedAt?.toDate(),
  })) as FIRequest[];
  
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
  const byStatus: Record<FIRequestStatus, number> = {
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
  
  // Agrupar por vendedor
  const bySeller: Record<string, { requests: number; approvals: number; rejections: number; approvalRate: number }> = {};
  requests.forEach(r => {
    if (!bySeller[r.createdBy]) {
      bySeller[r.createdBy] = { requests: 0, approvals: 0, rejections: 0, approvalRate: 0 };
    }
    bySeller[r.createdBy].requests++;
    if (r.status === 'approved') bySeller[r.createdBy].approvals++;
    if (r.status === 'rejected') bySeller[r.createdBy].rejections++;
  });
  Object.keys(bySeller).forEach(sellerId => {
    const seller = bySeller[sellerId];
    seller.approvalRate = seller.requests > 0 ? (seller.approvals / seller.requests) * 100 : 0;
  });
  
  // Agrupar por rango de crédito
  const byCreditRange: Record<CreditRange, { requests: number; approvals: number; approvalRate: number }> = {
    excellent: { requests: 0, approvals: 0, approvalRate: 0 },
    good: { requests: 0, approvals: 0, approvalRate: 0 },
    fair: { requests: 0, approvals: 0, approvalRate: 0 },
    poor: { requests: 0, approvals: 0, approvalRate: 0 },
    very_poor: { requests: 0, approvals: 0, approvalRate: 0 },
  };
  requests.forEach(r => {
    const range = r.creditInfo.creditRange;
    byCreditRange[range].requests++;
    if (r.status === 'approved') byCreditRange[range].approvals++;
  });
  Object.keys(byCreditRange).forEach(range => {
    const cr = byCreditRange[range as CreditRange];
    cr.approvalRate = cr.requests > 0 ? (cr.approvals / cr.requests) * 100 : 0;
  });
  
  // Calcular promedios
  const incomes = requests.map(r => r.employment.monthlyIncome).filter(i => i > 0);
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
    const client = await getFIClientById(tenantId, request.clientId);
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

// ============================================
// FUNCIONES PARA WORKFLOWS F&I
// ============================================

/**
 * Crea un workflow F&I
 */
export async function createFIWorkflow(
  tenantId: string,
  workflowData: Omit<FIWorkflow, 'id' | 'tenantId' | 'runCount' | 'createdAt' | 'updatedAt'>
): Promise<FIWorkflow> {
  const workflowRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_workflows')
    .doc();
  
  const workflow: FIWorkflow = {
    id: workflowRef.id,
    tenantId,
    ...workflowData,
    runCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await workflowRef.set({
    ...workflow,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return workflow;
}

/**
 * Obtiene todos los workflows F&I de un tenant
 */
export async function getFIWorkflows(
  tenantId: string,
  activeOnly?: boolean
): Promise<FIWorkflow[]> {
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_workflows')
    .orderBy('createdAt', 'desc');
  
  if (activeOnly) {
    query = query.where('isActive', '==', true);
  }
  
  const snapshot = await query.get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    lastRunAt: doc.data().lastRunAt?.toDate(),
  })) as FIWorkflow[];
}

/**
 * Ejecuta workflows activos para una solicitud F&I
 */
export async function executeFIWorkflows(
  tenantId: string,
  request: FIRequest
): Promise<void> {
  const workflowsSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_workflows')
    .where('isActive', '==', true)
    .get();
  
  const workflows = workflowsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as FIWorkflow[];
  
  for (const workflow of workflows) {
    let shouldExecute = false;
    
    // Evaluar condiciones
    for (const condition of workflow.conditions) {
      let value: any;
      
      switch (condition.field) {
        case 'approvalScore.score':
          value = request.approvalScore?.score || 0;
          break;
        case 'creditInfo.creditRange':
          value = request.creditInfo.creditRange;
          break;
        case 'status':
          value = request.status;
          break;
        case 'employment.monthlyIncome':
          value = request.employment.monthlyIncome;
          break;
        default:
          continue;
      }
      
      let matches = false;
      switch (condition.operator) {
        case 'equals':
          matches = value === condition.value;
          break;
        case 'greater_than':
          matches = value > condition.value;
          break;
        case 'less_than':
          matches = value < condition.value;
          break;
        case 'contains':
          matches = String(value).includes(String(condition.value));
          break;
        case 'in':
          matches = Array.isArray(condition.value) && condition.value.includes(value);
          break;
      }
      
      if (!matches) {
        shouldExecute = false;
        break;
      }
      shouldExecute = true;
    }
    
    if (shouldExecute) {
      // Ejecutar acciones
      for (const action of workflow.actions) {
        switch (action.type) {
          case 'change_status':
            await updateFIRequestStatus(
              tenantId,
              request.id,
              action.config.status as FIRequestStatus,
              'system',
              action.config.notes
            );
            break;
          case 'request_documents':
            // Implementar solicitud de documentos
            break;
          case 'notify':
            // Implementar notificación
            break;
          case 'send_email':
            // Implementar envío de email
            break;
          case 'pre_approve':
            await updateFIRequestStatus(
              tenantId,
              request.id,
              'pre_approved',
              'system',
              'Pre-aprobado automáticamente por workflow'
            );
            break;
        }
      }
      
      // Actualizar contador de ejecuciones
      const workflowRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_workflows')
        .doc(workflow.id);
      
      await workflowRef.update({
        runCount: admin.firestore.FieldValue.increment(1),
        lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
}

// ============================================
// FUNCIONES PARA COMPARACIÓN DE FINANCIAMIENTO
// ============================================

/**
 * Compara múltiples opciones de financiamiento
 */
export function compareFinancingOptions(
  request: FIRequest,
  vehiclePrice: number,
  downPayment: number,
  options: FinancingOption[]
): {
  bestOption: FinancingOption;
  comparison: FinancingOption[];
  recommendation: string;
} {
  // Calcular score de aprobación para cada opción
  const optionsWithScores = options.map(option => {
    const calculation = calculateFinancing({
      vehiclePrice,
      downPayment,
      interestRate: option.interestRate,
      loanTerm: option.term,
      monthlyIncome: request.employment.monthlyIncome,
    });
    
    return {
      ...option,
      calculatedMonthlyPayment: calculation.monthlyPayment,
      calculatedTotalAmount: calculation.totalAmount,
      affordability: calculation.affordability,
    };
  });
  
  // Ordenar por mejor opción (menor pago mensual, mayor probabilidad de aprobación)
  optionsWithScores.sort((a, b) => {
    // Priorizar por probabilidad de aprobación primero
    if (Math.abs(a.approvalProbability - b.approvalProbability) > 0.1) {
      return b.approvalProbability - a.approvalProbability;
    }
    // Luego por pago mensual
    return a.calculatedMonthlyPayment - b.calculatedMonthlyPayment;
  });
  
  const bestOption = optionsWithScores[0];
  
  let recommendation = `Recomendamos ${bestOption.lender} con un pago mensual de $${bestOption.calculatedMonthlyPayment.toFixed(2)}`;
  if (bestOption.approvalProbability >= 0.8) {
    recommendation += ' y alta probabilidad de aprobación.';
  } else if (bestOption.approvalProbability >= 0.6) {
    recommendation += ' y probabilidad moderada de aprobación.';
  } else {
    recommendation += ', aunque la probabilidad de aprobación es baja.';
  }
  
  return {
    bestOption: bestOption as FinancingOption,
    comparison: optionsWithScores as FinancingOption[],
    recommendation,
  };
}

// ============================================
// FUNCIONES PARA VALIDACIÓN DE DOCUMENTOS (Placeholder para IA)
// ============================================

/**
 * Valida un documento usando IA (placeholder - requiere implementación con servicio de IA)
 */
export async function validateDocument(
  documentUrl: string,
  documentType: DocumentType,
  request: FIRequest
): Promise<DocumentValidation> {
  // TODO: Implementar con servicio de IA/OCR
  // Por ahora retorna validación básica
  return {
    isValid: true,
    isLegible: true,
    extractedData: {},
    matchesRequest: true,
    discrepancies: [],
    confidence: 0.8,
    validationDate: new Date(),
  };
}

// ============================================
// FUNCIONES PARA REPORTE DE CRÉDITO (Placeholder para API externa)
// ============================================

/**
 * Obtiene reporte de crédito de una API externa (placeholder)
 */
export async function pullCreditReport(
  tenantId: string,
  clientId: string,
  clientData: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    ssn?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  },
  provider?: 'experian' | 'equifax' | 'transunion' | 'mock'
): Promise<CreditReport | null> {
  try {
    // Obtener configuración de crédito del tenant
    const db = getFirestore();
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.data();
    
    const creditConfig = tenantData?.creditConfig || {};
    const selectedProvider = provider || creditConfig.defaultProvider || 'mock';
    
    // Si no hay credenciales configuradas, usar mock
    if (selectedProvider === 'mock' || !creditConfig[selectedProvider]?.apiKey) {
      return generateMockCreditReport(clientData);
    }

    // Integración real con APIs de crédito
    switch (selectedProvider) {
      case 'experian':
        return await pullExperianCreditReport(clientData, creditConfig.experian);
      case 'equifax':
        return await pullEquifaxCreditReport(clientData, creditConfig.equifax);
      case 'transunion':
        return await pullTransUnionCreditReport(clientData, creditConfig.transunion);
      default:
        return generateMockCreditReport(clientData);
    }
  } catch (error) {
    console.error('Error pulling credit report:', error);
    // En caso de error, retornar reporte mock como fallback
    return generateMockCreditReport(clientData);
  }
}

// Función auxiliar para generar reporte mock (para desarrollo/testing)
function generateMockCreditReport(clientData: {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ssn?: string;
}): CreditReport {
  // Generar score basado en hash del nombre para consistencia
  const nameHash = (clientData.firstName + clientData.lastName).length;
  const creditScore = 600 + (nameHash % 200); // Score entre 600-800
  
  let creditRange: CreditRange = 'fair';
  if (creditScore >= 750) creditRange = 'excellent';
  else if (creditScore >= 700) creditRange = 'good';
  else if (creditScore >= 650) creditRange = 'fair';
  else creditRange = 'poor';

  return {
    creditScore,
    creditRange,
    paymentHistory: {
      onTime: Math.floor(Math.random() * 50) + 20,
      late: Math.floor(Math.random() * 5),
      missed: Math.floor(Math.random() * 2),
      totalAccounts: Math.floor(Math.random() * 10) + 3,
    },
    currentDebts: Math.floor(Math.random() * 50000) + 10000,
    openCreditLines: Math.floor(Math.random() * 8) + 2,
    inquiries: Math.floor(Math.random() * 5),
    verified: true,
    reportDate: new Date(),
    provider: 'mock',
  };
}

// Integración con Experian (requiere credenciales reales)
async function pullExperianCreditReport(
  clientData: any,
  config: { apiKey: string; apiSecret: string; endpoint?: string }
): Promise<CreditReport | null> {
  // TODO: Implementar llamada real a Experian API
  // Por ahora retorna mock
  console.log('Experian API integration not yet implemented. Using mock data.');
  return generateMockCreditReport(clientData);
}

// Integración con Equifax (requiere credenciales reales)
async function pullEquifaxCreditReport(
  clientData: any,
  config: { apiKey: string; apiSecret: string; endpoint?: string }
): Promise<CreditReport | null> {
  // TODO: Implementar llamada real a Equifax API
  // Por ahora retorna mock
  console.log('Equifax API integration not yet implemented. Using mock data.');
  return generateMockCreditReport(clientData);
}

// Integración con TransUnion (requiere credenciales reales)
async function pullTransUnionCreditReport(
  clientData: any,
  config: { apiKey: string; apiSecret: string; endpoint?: string }
): Promise<CreditReport | null> {
  // TODO: Implementar llamada real a TransUnion API
  // Por ahora retorna mock
  console.log('TransUnion API integration not yet implemented. Using mock data.');
  return generateMockCreditReport(clientData);
}

