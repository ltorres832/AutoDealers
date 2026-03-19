// Cloud Functions para Contracts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Crear contrato
export const createContract = onCall(async (request) => {
  const { tenantId, contract } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !contract) {
    throw new HttpsError('invalid-argument', 'tenantId y contract son requeridos');
  }

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('contracts')
      .doc();

    await docRef.set({
      ...contract,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { id: docRef.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear contrato: ${error.message}`);
  }
});

// Obtener contratos
export const getContracts = onCall(async (request) => {
  const { tenantId, saleId, leadId, status } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    let query = db
      .collection('tenants')
      .doc(tenantId)
      .collection('contracts') as any;

    if (saleId) {
      query = query.where('saleId', '==', saleId);
    }
    if (leadId) {
      query = query.where('leadId', '==', leadId);
    }
    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('createdAt', 'desc').limit(100);

    const snapshot = await query.get();
    const contracts = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate(),
    }));

    return { contracts };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener contratos: ${error.message}`);
  }
});

// Actualizar contrato
export const updateContract = onCall(async (request) => {
  const { tenantId, contractId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !contractId || !updates) {
    throw new HttpsError('invalid-argument', 'tenantId, contractId y updates son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contracts')
      .doc(contractId)
      .update({
        ...updates,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar contrato: ${error.message}`);
  }
});

// Enviar para firma
export const sendForSignature = onCall(async (request) => {
  const { tenantId, contractId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !contractId) {
    throw new HttpsError('invalid-argument', 'tenantId y contractId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contracts')
      .doc(contractId)
      .update({
        status: 'pending_signature',
        sentForSignatureAt: new Date(),
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al enviar para firma: ${error.message}`);
  }
});

// Firmar contrato
export const signContract = onCall(async (request) => {
  const { tenantId, contractId, signature } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !contractId || !signature) {
    throw new HttpsError('invalid-argument', 'tenantId, contractId y signature son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contracts')
      .doc(contractId)
      .update({
        status: 'signed',
        signature,
        signedAt: new Date(),
        signedBy: auth.uid,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al firmar contrato: ${error.message}`);
  }
});

// Digitalizar contrato
export const digitalizeContract = onCall(async (request) => {
  const { tenantId, contractId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !contractId) {
    throw new HttpsError('invalid-argument', 'tenantId y contractId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contracts')
      .doc(contractId)
      .update({
        digitalized: true,
        digitalizedAt: new Date(),
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al digitalizar contrato: ${error.message}`);
  }
});


