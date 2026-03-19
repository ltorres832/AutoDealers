/**
 * Cloud Functions para FI (Financing & Insurance)
 * 
 * Funcionalidades:
 * - Gestión de solicitudes F&I
 * - Gestión de clientes F&I
 * - Calculadora de financiamiento
 * - Score de aprobación
 * - Reportes de crédito
 * - Opciones de financiamiento
 * - Generación y validación de documentos
 * - Cosignatarios
 * - Workflows F&I
 * - Métricas F&I
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const db = getFirestore();

// ==================== FI Requests ====================

/**
 * Obtener solicitudes F&I
 */
export const getFIRequests = onCall(async (request) => {
  const { tenantId, status, clientId, createdBy, role } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  // Verificar permisos según rol
  if (role === 'seller' && createdBy && createdBy !== authToken.uid) {
    throw new HttpsError('permission-denied', 'No autorizado para ver estas solicitudes');
  }

  let query: FirebaseFirestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests');

  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }
  if (clientId) {
    query = query.where('clientId', '==', clientId);
  }
  if (createdBy) {
    query = query.where('createdBy', '==', createdBy);
  }

  try {
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const requests = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        submittedAt: data.submittedAt?.toDate?.() || data.submittedAt,
        reviewedAt: data.reviewedAt?.toDate?.() || data.reviewedAt,
      };
    });
    return { requests };
  } catch (error: any) {
    if (error.code === 'failed-precondition') {
      // Índice faltante, obtener sin orderBy
      const snapshot = await query.get();
      const requests = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          submittedAt: data.submittedAt?.toDate?.() || data.submittedAt,
          reviewedAt: data.reviewedAt?.toDate?.() || data.reviewedAt,
        };
      });
      requests.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });
      return { requests };
    }
    throw new HttpsError('internal', `Error al obtener solicitudes: ${error.message}`);
  }
});

/**
 * Obtener una solicitud F&I específica
 */
export const getFIRequest = onCall(async (request) => {
  const { tenantId, requestId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !requestId) {
    throw new HttpsError('unauthenticated', 'Datos incompletos');
  }

  const requestDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId)
    .get();

  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Solicitud F&I no encontrada');
  }

  const data = requestDoc.data()!;
  return {
    id: requestDoc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    submittedAt: data.submittedAt?.toDate?.() || data.submittedAt,
    reviewedAt: data.reviewedAt?.toDate?.() || data.reviewedAt,
  };
});

/**
 * Crear solicitud F&I
 */
export const createFIRequest = onCall(async (request) => {
  const { tenantId, clientId, employment, creditInfo, personalInfo, sellerNotes, submit } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !clientId || !employment || !creditInfo || !personalInfo) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc();

  const historyEntry = {
    id: Math.random().toString(36).substring(2, 15),
    action: 'created',
    performedBy: authToken.uid,
    timestamp: FieldValue.serverTimestamp(),
    notes: 'Solicitud F&I creada',
  };

  const fiRequest = {
    clientId,
    employment,
    creditInfo,
    personalInfo,
    status: submit ? 'submitted' : 'draft',
    sellerNotes: sellerNotes || '',
    createdBy: authToken.uid,
    tenantId,
    history: [historyEntry],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...(submit && {
      submittedAt: FieldValue.serverTimestamp(),
      submittedBy: authToken.uid,
    }),
  };

  await requestRef.set(fiRequest);

  const createdDoc = await requestRef.get();
  const createdData = createdDoc.data()!;

  return {
    id: requestRef.id,
    ...createdData,
    createdAt: createdData.createdAt?.toDate?.() || createdData.createdAt,
    updatedAt: createdData.updatedAt?.toDate?.() || createdData.updatedAt,
  };
});

/**
 * Actualizar solicitud F&I
 */
export const updateFIRequest = onCall(async (request) => {
  const { tenantId, requestId, status, fiManagerNotes, internalNotes, note } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !requestId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);

  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Solicitud F&I no encontrada');
  }

  const currentData = requestDoc.data()!;
  const currentHistory = currentData.history || [];

  // Si se está agregando solo una nota
  if (note && !status) {
    const historyEntry = {
      id: Math.random().toString(36).substring(2, 15),
      action: internalNotes ? 'internal_note_added' : 'note_added',
      performedBy: authToken.uid,
      timestamp: FieldValue.serverTimestamp(),
      notes: note,
    };

    await requestRef.update({
      history: [...currentHistory, historyEntry],
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Si se está cambiando el estado
  if (status) {
    const historyEntry = {
      id: Math.random().toString(36).substring(2, 15),
      action: 'status_changed',
      performedBy: authToken.uid,
      timestamp: FieldValue.serverTimestamp(),
      previousStatus: currentData.status,
      newStatus: status,
      notes: fiManagerNotes || internalNotes || `Estado cambiado a ${status}`,
    };

    const updateData: any = {
      status,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: authToken.uid,
      history: [...currentHistory, historyEntry],
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (fiManagerNotes) {
      updateData.fiManagerNotes = fiManagerNotes;
    }

    await requestRef.update(updateData);
  }

  const updatedDoc = await requestRef.get();
  const updatedData = updatedDoc.data()!;

  return {
    id: requestRef.id,
    ...updatedData,
    createdAt: updatedData.createdAt?.toDate?.() || updatedData.createdAt,
    updatedAt: updatedData.updatedAt?.toDate?.() || updatedData.updatedAt,
    submittedAt: updatedData.submittedAt?.toDate?.() || updatedData.submittedAt,
    reviewedAt: updatedData.reviewedAt?.toDate?.() || updatedData.reviewedAt,
  };
});

/**
 * Enviar solicitud F&I
 */
export const submitFIRequest = onCall(async (request) => {
  const { tenantId, requestId, sellerNotes } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !requestId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);

  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Solicitud F&I no encontrada');
  }

  const currentData = requestDoc.data()!;
  const currentHistory = currentData.history || [];

  const historyEntry = {
    id: Math.random().toString(36).substring(2, 15),
    action: 'submitted',
    performedBy: authToken.uid,
    timestamp: FieldValue.serverTimestamp(),
    previousStatus: currentData.status,
    newStatus: 'submitted',
    notes: sellerNotes || 'Solicitud enviada a F&I',
  };

  await requestRef.update({
    status: 'submitted',
    submittedAt: FieldValue.serverTimestamp(),
    submittedBy: authToken.uid,
    sellerNotes: sellerNotes || currentData.sellerNotes,
    history: [...currentHistory, historyEntry],
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedDoc = await requestRef.get();
  const updatedData = updatedDoc.data()!;

  return {
    id: requestRef.id,
    ...updatedData,
    createdAt: updatedData.createdAt?.toDate?.() || updatedData.createdAt,
    updatedAt: updatedData.updatedAt?.toDate?.() || updatedData.updatedAt,
    submittedAt: updatedData.submittedAt?.toDate?.() || updatedData.submittedAt,
  };
});

// ==================== FI Clients ====================

/**
 * Obtener clientes F&I
 */
export const getFIClients = onCall(async (request) => {
  const { tenantId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .orderBy('createdAt', 'desc')
    .get();

  const clients = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    };
  });

  return { clients };
});

/**
 * Crear cliente F&I
 */
export const createFIClient = onCall(async (request) => {
  const { tenantId, name, phone, email, address, vehicleMake, vehicleModel, vehicleYear, vehiclePrice, downPayment } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !name || !phone) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const clientRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .doc();

  const client = {
    name,
    phone,
    email: email || '',
    address: address || '',
    vehicleMake: vehicleMake || '',
    vehicleModel: vehicleModel || '',
    vehicleYear: vehicleYear || null,
    vehiclePrice: vehiclePrice || 0,
    downPayment: downPayment || 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await clientRef.set(client);

  const createdDoc = await clientRef.get();
  const createdData = createdDoc.data()!;

  return {
    id: clientRef.id,
    ...createdData,
    createdAt: createdData.createdAt?.toDate?.() || createdData.createdAt,
    updatedAt: createdData.updatedAt?.toDate?.() || createdData.updatedAt,
  };
});

// ==================== Calculator ====================

/**
 * Calcular financiamiento
 */
export const calculateFinancing = onCall(async (request) => {
  const { tenantId, requestId, vehiclePrice, downPayment, interestRate, termMonths } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !vehiclePrice || !downPayment || !interestRate || !termMonths) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const loanAmount = vehiclePrice - downPayment;
  const monthlyRate = interestRate / 100 / 12;
  const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  const totalAmount = monthlyPayment * termMonths;
  const totalInterest = totalAmount - loanAmount;

  const calculation = {
    vehiclePrice,
    downPayment,
    loanAmount,
    interestRate,
    termMonths,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
  };

  // Si hay requestId, actualizar la solicitud
  if (requestId) {
    const requestRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('fi_requests')
      .doc(requestId);

    await requestRef.update({
      financingCalculation: calculation,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return { calculation };
});

// ==================== Approval Score ====================

/**
 * Calcular score de aprobación
 */
export const calculateApprovalScore = onCall(async (request) => {
  const { tenantId, requestId, vehiclePrice, downPayment, monthlyPayment } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !requestId || vehiclePrice === undefined || downPayment === undefined || monthlyPayment === undefined) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  // Obtener solicitud para obtener información del cliente
  const requestDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId)
    .get();

  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Solicitud F&I no encontrada');
  }

  const requestData = requestDoc.data()!;
  const monthlyIncome = requestData.employment?.monthlyIncome || 0;
  const creditRange = requestData.creditInfo?.creditRange || 'unknown';

  // Calcular score basado en múltiples factores
  let score = 50; // Base score

  // Factor: Ratio deuda/ingreso
  const debtToIncomeRatio = monthlyPayment / monthlyIncome;
  if (debtToIncomeRatio < 0.15) score += 20;
  else if (debtToIncomeRatio < 0.25) score += 10;
  else if (debtToIncomeRatio < 0.35) score += 5;
  else if (debtToIncomeRatio > 0.45) score -= 20;

  // Factor: Down payment
  const downPaymentRatio = downPayment / vehiclePrice;
  if (downPaymentRatio >= 0.2) score += 15;
  else if (downPaymentRatio >= 0.1) score += 10;
  else if (downPaymentRatio >= 0.05) score += 5;

  // Factor: Credit range
  const creditScores: Record<string, number> = {
    excellent: 15,
    good: 10,
    fair: 5,
    poor: -10,
  };
  score += creditScores[creditRange] || 0;

  // Factor: Tiempo en empleo
  const timeAtJob = requestData.employment?.timeAtJob || 0;
  if (timeAtJob >= 24) score += 10;
  else if (timeAtJob >= 12) score += 5;
  else if (timeAtJob < 6) score -= 10;

  // Asegurar que el score esté entre 0 y 100
  score = Math.max(0, Math.min(100, score));

  // Determinar recomendación
  let recommendation = 'reject';
  if (score >= 75) recommendation = 'approve';
  else if (score >= 60) recommendation = 'pre_approve';
  else if (score >= 45) recommendation = 'review';

  const approvalScore = {
    score,
    recommendation,
    factors: {
      debtToIncomeRatio,
      downPaymentRatio,
      creditRange,
      timeAtJob,
    },
  };

  // Actualizar solicitud
  await requestDoc.ref.update({
    approvalScore,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { score: approvalScore };
});

// ==================== Credit Report ====================

/**
 * Obtener reporte de crédito
 */
export const getCreditReport = onCall(async (request) => {
  const { tenantId, clientId, provider } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !clientId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  // Obtener cliente
  const clientDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .doc(clientId)
    .get();

  if (!clientDoc.exists) {
    throw new HttpsError('not-found', 'Cliente no encontrado');
  }

  // TODO: Integrar con APIs reales de proveedores de crédito (Experian, Equifax, TransUnion)
  // Por ahora retornamos datos mock
  const creditReport = {
    creditScore: 700,
    creditRange: 'good' as const,
    paymentHistory: {
      onTime: 24,
      late: 2,
      missed: 0,
      totalAccounts: 5,
    },
    currentDebts: 15000,
    openCreditLines: 3,
    inquiries: 2,
    verified: false,
    reportDate: new Date(),
    provider: provider || 'mock',
  };

  return { creditReport };
});

// ==================== Financing Options ====================

/**
 * Comparar opciones de financiamiento
 */
export const compareFinancingOptions = onCall(async (request) => {
  const { tenantId, requestId, options } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !requestId || !options || !Array.isArray(options)) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  // Obtener solicitud y cliente
  const requestDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId)
    .get();

  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Solicitud F&I no encontrada');
  }

  const requestData = requestDoc.data()!;
  const clientDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .doc(requestData.clientId)
    .get();

  if (!clientDoc.exists) {
    throw new HttpsError('not-found', 'Cliente no encontrado');
  }

  const clientData = clientDoc.data()!;
  const vehiclePrice = clientData.vehiclePrice || 0;
  const downPayment = clientData.downPayment || 0;

  // Encontrar mejor opción
  const bestOption = options.reduce((best, current) => {
    if (!best) return current;
    if (current.interestRate < best.interestRate) return current;
    if (current.interestRate === best.interestRate && current.monthlyPayment < best.monthlyPayment) {
      return current;
    }
    return best;
  }, options[0]);

  const comparison = {
    bestOption,
    options: options.map((opt: any) => ({
      ...opt,
      savings: bestOption.monthlyPayment - opt.monthlyPayment,
    })),
  };

  // Actualizar solicitud
  await requestDoc.ref.update({
    financingOptions: options,
    selectedFinancingOption: bestOption.id,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { comparison };
});

// ==================== Documents ====================

/**
 * Generar documento F&I
 */
export const generateFIDocument = onCall(async (request) => {
  const { tenantId, requestId, template, customData } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !requestId || !template) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  // Obtener solicitud y cliente
  const requestDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId)
    .get();

  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Solicitud F&I no encontrada');
  }

  const requestData = requestDoc.data()!;
  const clientDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .doc(requestData.clientId)
    .get();

  if (!clientDoc.exists) {
    throw new HttpsError('not-found', 'Cliente no encontrado');
  }

  const clientData = clientDoc.data()!;

  // TODO: Implementar generación real de PDF usando pdfkit o puppeteer
  const documentData = {
    template,
    requestId,
    clientName: clientData.name,
    clientEmail: clientData.email,
    clientPhone: clientData.phone,
    vehiclePrice: clientData.vehiclePrice,
    downPayment: clientData.downPayment,
    monthlyIncome: requestData.employment?.monthlyIncome,
    creditRange: requestData.creditInfo?.creditRange,
    status: requestData.status,
    ...customData,
  };

  const pdfUrl = `/api/fi/documents/generated/${requestId}/${template}.pdf`; // Placeholder

  return {
    documentId: `${requestId}-${template}-${Date.now()}`,
    pdfUrl,
    documentData,
    message: 'Documento generado exitosamente (placeholder - requiere implementación de generación de PDF)',
  };
});

/**
 * Solicitar documentos
 */
export const requestFIDocuments = onCall(async (request) => {
  const { tenantId, requestId, documents } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !requestId || !documents || !Array.isArray(documents)) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);

  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Solicitud F&I no encontrada');
  }

  const requestedDocuments = documents.map((doc: any) => ({
    type: doc.type,
    name: doc.name,
    required: doc.required || false,
    status: 'pending',
  }));

  await requestRef.update({
    requestedDocuments,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, requestedDocuments };
});

// ==================== Cosigner ====================

/**
 * Agregar cosignatario
 */
export const addCosigner = onCall(async (request) => {
  const { tenantId, requestId, cosignerInfo } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !requestId || !cosignerInfo) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);

  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Solicitud F&I no encontrada');
  }

  await requestRef.update({
    cosigner: cosignerInfo,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});

// ==================== Metrics ====================

/**
 * Obtener métricas F&I
 */
export const getFIMetrics = onCall(async (request) => {
  const { tenantId, startDate, endDate } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  let query: FirebaseFirestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests');

  if (startDate) {
    query = query.where('createdAt', '>=', new Date(startDate));
  }
  if (endDate) {
    query = query.where('createdAt', '<=', new Date(endDate));
  }

  const snapshot = await query.get();
  const requests = snapshot.docs.map((doc) => doc.data());

  const metrics = {
    total: requests.length,
    byStatus: {
      draft: requests.filter((r) => r.status === 'draft').length,
      submitted: requests.filter((r) => r.status === 'submitted').length,
      under_review: requests.filter((r) => r.status === 'under_review').length,
      pre_approved: requests.filter((r) => r.status === 'pre_approved').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    },
    averageApprovalScore: requests
      .filter((r) => r.approvalScore?.score)
      .reduce((sum, r) => sum + (r.approvalScore?.score || 0), 0) / requests.filter((r) => r.approvalScore?.score).length || 0,
    approvalRate: requests.filter((r) => r.status === 'approved').length / requests.length || 0,
  };

  return { metrics };
});


