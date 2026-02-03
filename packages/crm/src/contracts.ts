// Gestión de contratos con digitalización y firma digital

import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface Contract {
  id: string;
  tenantId: string;
  // Información del contrato
  name: string;
  description?: string;
  type: 'purchase' | 'lease' | 'financing' | 'service' | 'warranty' | 'other';
  templateId?: string; // ID de plantilla si se usó una
  
  // Relaciones
  saleId?: string; // Si está asociado a una venta
  leadId?: string; // Si está asociado a un lead
  vehicleId?: string; // Vehículo relacionado
  fiRequestId?: string; // Solicitud F&I relacionada
  
  // Documento
  originalDocumentUrl: string; // PDF original subido
  digitalizedDocumentUrl?: string; // PDF con campos digitalizados
  finalDocumentUrl?: string; // PDF final con firmas
  
  // Digitalización
  digitalization?: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    extractedFields?: Record<string, any>; // Campos extraídos con OCR
    signatureFields?: Array<{
      id: string;
      type: 'signature' | 'initial' | 'date' | 'text';
      x: number; // Posición X en el PDF (0-1)
      y: number; // Posición Y en el PDF (0-1)
      width: number;
      height: number;
      required: boolean;
      signer: 'buyer' | 'seller' | 'dealer' | 'cosigner' | 'witness';
      label?: string;
    }>;
    completedAt?: Date;
  };
  
  // Firmas
  signatures: Array<{
    id: string;
    signer: 'buyer' | 'seller' | 'dealer' | 'cosigner' | 'witness';
    signerName: string;
    signerEmail?: string;
    signerPhone?: string;
    signatureType: 'in_person' | 'remote';
    status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';
    signatureData?: string; // Base64 de la firma
    signedAt?: Date;
    ipAddress?: string;
    userAgent?: string;
    token?: string; // Token único para firma remota
    expiresAt?: Date;
  }>;
  
  // Estado
  status: 'draft' | 'pending_signatures' | 'partially_signed' | 'fully_signed' | 'completed' | 'cancelled';
  
  // Notificaciones
  notificationsSent?: Array<{
    to: string;
    type: 'email' | 'sms' | 'whatsapp';
    sentAt: Date;
    status: 'sent' | 'delivered' | 'failed';
  }>;
  
  // Metadata
  createdBy: string; // userId del vendedor/dealer
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Crea un nuevo contrato
 */
export async function createContract(
  tenantId: string,
  contractData: Omit<Contract, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'signatures' | 'status'>
): Promise<Contract> {
  const contractRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('contracts')
    .doc();

  const contract: Omit<Contract, 'id'> = {
    ...contractData,
    tenantId,
    signatures: [],
    status: 'draft',
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  await contractRef.set(contract);

  return {
    id: contractRef.id,
    ...contract,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene un contrato por ID
 */
export async function getContractById(
  tenantId: string,
  contractId: string
): Promise<Contract | null> {
  const contractDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('contracts')
    .doc(contractId)
    .get();

  if (!contractDoc.exists) {
    return null;
  }

  const data = contractDoc.data();
  const createdAt = data?.createdAt;
  const updatedAt = data?.updatedAt;
  const completedAt = data?.completedAt;
  return {
    id: contractDoc.id,
    ...data,
    createdAt: (createdAt && typeof createdAt.toDate === 'function' ? createdAt.toDate() : createdAt) || new Date(),
    updatedAt: (updatedAt && typeof updatedAt.toDate === 'function' ? updatedAt.toDate() : updatedAt) || new Date(),
    completedAt: completedAt && typeof completedAt.toDate === 'function' ? completedAt.toDate() : completedAt,
  } as Contract;
}

/**
 * Obtiene contratos por saleId
 */
export async function getContractsBySaleId(
  tenantId: string,
  saleId: string
): Promise<Contract[]> {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('contracts')
    .where('saleId', '==', saleId)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    const createdAt = data?.createdAt;
    const updatedAt = data?.updatedAt;
    const completedAt = data?.completedAt;
    return {
      id: doc.id,
      ...data,
      createdAt: (createdAt && typeof createdAt.toDate === 'function' ? createdAt.toDate() : createdAt) || new Date(),
      updatedAt: (updatedAt && typeof updatedAt.toDate === 'function' ? updatedAt.toDate() : updatedAt) || new Date(),
      completedAt: completedAt && typeof completedAt.toDate === 'function' ? completedAt.toDate() : completedAt,
    } as Contract;
  });
}

/**
 * Actualiza el estado de digitalización de un contrato
 */
export async function updateContractDigitalization(
  tenantId: string,
  contractId: string,
  digitalization: Contract['digitalization']
): Promise<void> {
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('contracts')
    .doc(contractId)
    .update({
      digitalization,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Agrega una firma a un contrato
 */
export async function addContractSignature(
  tenantId: string,
  contractId: string,
  signature: Contract['signatures'][0]
): Promise<void> {
  const contractRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('contracts')
    .doc(contractId);

  const contract = await contractRef.get();
  if (!contract.exists) {
    throw new Error('Contract not found');
  }

  const contractData = contract.data() as Contract;
  const signatures = contractData.signatures || [];
  
  // Actualizar o agregar firma
  const existingIndex = signatures.findIndex(s => s.id === signature.id);
  if (existingIndex >= 0) {
    signatures[existingIndex] = signature;
  } else {
    signatures.push(signature);
  }

  // Actualizar estado del contrato
  const allSigned = signatures.every(s => s.status === 'signed');
  const someSigned = signatures.some(s => s.status === 'signed');
  
  let status: Contract['status'] = contractData.status;
  if (allSigned && signatures.length > 0) {
    status = 'fully_signed';
  } else if (someSigned) {
    status = 'partially_signed';
  } else if (signatures.length > 0 && signatures.some(s => s.status === 'pending' || s.status === 'sent')) {
    status = 'pending_signatures';
  }

  await contractRef.update({
    signatures,
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    completedAt: allSigned ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.delete(),
  });
}

/**
 * Envía un contrato para firma remota
 */
export async function sendContractForSignature(
  tenantId: string,
  contractId: string,
  signerId: string,
  signerEmail: string,
  signerName: string,
  signerPhone?: string
): Promise<{ token: string; url: string }> {
  const contractRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('contracts')
    .doc(contractId);

  const contract = await contractRef.get();
  if (!contract.exists) {
    throw new Error('Contract not found');
  }

  // Generar token único
  const token = `${contractId}_${signerId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

  // Crear o actualizar firma
  const contractData = contract.data() as Contract;
  const signatures = contractData.signatures || [];
  
  const signatureIndex = signatures.findIndex(s => s.signer === signerId || s.signerEmail === signerEmail);
  const signature: Contract['signatures'][0] = {
    id: `sig_${Date.now()}`,
    signer: 'buyer', // Por defecto, se puede cambiar según el contexto
    signerName,
    signerEmail,
    signerPhone,
    signatureType: 'remote',
    status: 'sent',
    token,
    expiresAt,
  };

  if (signatureIndex >= 0) {
    signatures[signatureIndex] = signature;
  } else {
    signatures.push(signature);
  }

  await contractRef.update({
    signatures,
    status: 'pending_signatures',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${baseUrl}/contracts/sign/${token}`;

  return { token, url };
}

/**
 * Obtiene un contrato por token de firma
 */
export async function getContractBySignatureToken(
  token: string
): Promise<{ contract: Contract; signature: Contract['signatures'][0] } | null> {
  // Buscar en todos los tenants (esto puede ser optimizado con un índice)
  const tenantsSnapshot = await db.collection('tenants').get();
  
  for (const tenantDoc of tenantsSnapshot.docs) {
    const contractsSnapshot = await tenantDoc.ref
      .collection('contracts')
      .where('signatures', 'array-contains-any', [{ token }])
      .get();

    for (const contractDoc of contractsSnapshot.docs) {
      const contractData = contractDoc.data() as Contract;
      const signature = contractData.signatures?.find(s => s.token === token);
      
      const expiresAt = signature?.expiresAt as any;
      const expiresAtDate = expiresAt && typeof expiresAt.toDate === 'function' ? expiresAt.toDate() : expiresAt;
      if (signature && expiresAtDate && new Date(expiresAtDate) > new Date()) {
        const contractCreatedAt = contractData.createdAt as any;
        const contractUpdatedAt = contractData.updatedAt as any;
        const contractCompletedAt = contractData.completedAt as any;
        const { id, ...contractDataWithoutId } = contractData;
        return {
          contract: {
            id: contractDoc.id,
            ...contractDataWithoutId,
            createdAt: (contractCreatedAt && typeof contractCreatedAt.toDate === 'function' ? contractCreatedAt.toDate() : contractCreatedAt) || new Date(),
            updatedAt: (contractUpdatedAt && typeof contractUpdatedAt.toDate === 'function' ? contractUpdatedAt.toDate() : contractUpdatedAt) || new Date(),
            completedAt: contractCompletedAt && typeof contractCompletedAt.toDate === 'function' ? contractCompletedAt.toDate() : contractCompletedAt,
          } as Contract,
          signature,
        };
      }
    }
  }

  return null;
}

/**
 * Marca una firma como completada
 */
export async function completeContractSignature(
  tenantId: string,
  contractId: string,
  signatureId: string,
  signatureData: string, // Base64 de la firma
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const contractRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('contracts')
    .doc(contractId);

  const contract = await contractRef.get();
  if (!contract.exists) {
    throw new Error('Contract not found');
  }

  const contractData = contract.data() as Contract;
  const signatures = contractData.signatures || [];
  
  const signatureIndex = signatures.findIndex(s => s.id === signatureId);
  if (signatureIndex < 0) {
    throw new Error('Signature not found');
  }

  signatures[signatureIndex] = {
    ...signatures[signatureIndex],
    status: 'signed',
    signatureData,
    signedAt: new Date(),
    ipAddress,
    userAgent,
  };

  // Verificar si todas las firmas están completadas
  const allSigned = signatures.every(s => s.status === 'signed');
  
  await contractRef.update({
    signatures,
    status: allSigned ? 'fully_signed' : 'partially_signed',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    completedAt: allSigned ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.delete(),
  });
}

