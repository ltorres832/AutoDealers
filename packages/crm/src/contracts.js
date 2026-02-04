"use strict";
// Gestión de contratos con digitalización y firma digital
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContract = createContract;
exports.getContractById = getContractById;
exports.getContractsBySaleId = getContractsBySaleId;
exports.updateContractDigitalization = updateContractDigitalization;
exports.addContractSignature = addContractSignature;
exports.sendContractForSignature = sendContractForSignature;
exports.getContractBySignatureToken = getContractBySignatureToken;
exports.completeContractSignature = completeContractSignature;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const db = (0, core_1.getFirestore)();
/**
 * Crea un nuevo contrato
 */
async function createContract(tenantId, contractData) {
    const contractRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('contracts')
        .doc();
    const contract = {
        ...contractData,
        tenantId,
        signatures: [],
        status: 'draft',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
async function getContractById(tenantId, contractId) {
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
    };
}
/**
 * Obtiene contratos por saleId
 */
async function getContractsBySaleId(tenantId, saleId) {
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
        };
    });
}
/**
 * Actualiza el estado de digitalización de un contrato
 */
async function updateContractDigitalization(tenantId, contractId, digitalization) {
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
async function addContractSignature(tenantId, contractId, signature) {
    const contractRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('contracts')
        .doc(contractId);
    const contract = await contractRef.get();
    if (!contract.exists) {
        throw new Error('Contract not found');
    }
    const contractData = contract.data();
    const signatures = contractData.signatures || [];
    // Actualizar o agregar firma
    const existingIndex = signatures.findIndex(s => s.id === signature.id);
    if (existingIndex >= 0) {
        signatures[existingIndex] = signature;
    }
    else {
        signatures.push(signature);
    }
    // Actualizar estado del contrato
    const allSigned = signatures.every(s => s.status === 'signed');
    const someSigned = signatures.some(s => s.status === 'signed');
    let status = contractData.status;
    if (allSigned && signatures.length > 0) {
        status = 'fully_signed';
    }
    else if (someSigned) {
        status = 'partially_signed';
    }
    else if (signatures.length > 0 && signatures.some(s => s.status === 'pending' || s.status === 'sent')) {
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
async function sendContractForSignature(tenantId, contractId, signerId, signerEmail, signerName, signerPhone) {
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
    const contractData = contract.data();
    const signatures = contractData.signatures || [];
    const signatureIndex = signatures.findIndex(s => s.signer === signerId || s.signerEmail === signerEmail);
    const signature = {
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
    }
    else {
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
async function getContractBySignatureToken(token) {
    // Buscar en todos los tenants (esto puede ser optimizado con un índice)
    const tenantsSnapshot = await db.collection('tenants').get();
    for (const tenantDoc of tenantsSnapshot.docs) {
        const contractsSnapshot = await tenantDoc.ref
            .collection('contracts')
            .where('signatures', 'array-contains-any', [{ token }])
            .get();
        for (const contractDoc of contractsSnapshot.docs) {
            const contractData = contractDoc.data();
            const signature = contractData.signatures?.find(s => s.token === token);
            const expiresAt = signature?.expiresAt;
            const expiresAtDate = expiresAt && typeof expiresAt.toDate === 'function' ? expiresAt.toDate() : expiresAt;
            if (signature && expiresAtDate && new Date(expiresAtDate) > new Date()) {
                const contractCreatedAt = contractData.createdAt;
                const contractUpdatedAt = contractData.updatedAt;
                const contractCompletedAt = contractData.completedAt;
                const { id, ...contractDataWithoutId } = contractData;
                return {
                    contract: {
                        id: contractDoc.id,
                        ...contractDataWithoutId,
                        createdAt: (contractCreatedAt && typeof contractCreatedAt.toDate === 'function' ? contractCreatedAt.toDate() : contractCreatedAt) || new Date(),
                        updatedAt: (contractUpdatedAt && typeof contractUpdatedAt.toDate === 'function' ? contractUpdatedAt.toDate() : contractUpdatedAt) || new Date(),
                        completedAt: contractCompletedAt && typeof contractCompletedAt.toDate === 'function' ? contractCompletedAt.toDate() : contractCompletedAt,
                    },
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
async function completeContractSignature(tenantId, contractId, signatureId, signatureData, // Base64 de la firma
ipAddress, userAgent) {
    const contractRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('contracts')
        .doc(contractId);
    const contract = await contractRef.get();
    if (!contract.exists) {
        throw new Error('Contract not found');
    }
    const contractData = contract.data();
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
//# sourceMappingURL=contracts.js.map