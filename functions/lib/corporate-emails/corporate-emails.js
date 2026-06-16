"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCorporateEmail = exports.suspendCorporateEmail = exports.activateCorporateEmail = exports.getCorporateEmails = exports.createCorporateEmail = void 0;
// Cloud Functions para Corporate Emails
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Crear corporate email
exports.createCorporateEmail = (0, https_1.onCall)(async (request) => {
    const { email } = request.data;
    const auth = request.auth;
    if (!auth || auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores');
    }
    if (!email) {
        throw new https_1.HttpsError('invalid-argument', 'email es requerido');
    }
    try {
        const docRef = db.collection('corporate_emails').doc();
        await docRef.set({
            email,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return { id: docRef.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear corporate email: ${error.message}`);
    }
});
// Obtener corporate emails
exports.getCorporateEmails = (0, https_1.onCall)(async (request) => {
    const auth = request.auth;
    if (!auth || auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores');
    }
    try {
        const snapshot = await db
            .collection('corporate_emails')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        const emails = snapshot.docs.map((doc) => {
            var _a, _b, _c, _d;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate(), activatedAt: (_c = doc.data().activatedAt) === null || _c === void 0 ? void 0 : _c.toDate(), suspendedAt: (_d = doc.data().suspendedAt) === null || _d === void 0 ? void 0 : _d.toDate() }));
        });
        return { emails };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener corporate emails: ${error.message}`);
    }
});
// Activar corporate email
exports.activateCorporateEmail = (0, https_1.onCall)(async (request) => {
    const { emailId } = request.data;
    const auth = request.auth;
    if (!auth || auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores');
    }
    if (!emailId) {
        throw new https_1.HttpsError('invalid-argument', 'emailId es requerido');
    }
    try {
        await db.collection('corporate_emails').doc(emailId).update({
            status: 'active',
            activatedAt: new Date(),
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al activar corporate email: ${error.message}`);
    }
});
// Suspender corporate email
exports.suspendCorporateEmail = (0, https_1.onCall)(async (request) => {
    const { emailId } = request.data;
    const auth = request.auth;
    if (!auth || auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores');
    }
    if (!emailId) {
        throw new https_1.HttpsError('invalid-argument', 'emailId es requerido');
    }
    try {
        await db.collection('corporate_emails').doc(emailId).update({
            status: 'suspended',
            suspendedAt: new Date(),
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al suspender corporate email: ${error.message}`);
    }
});
// Eliminar corporate email
exports.deleteCorporateEmail = (0, https_1.onCall)(async (request) => {
    const { emailId } = request.data;
    const auth = request.auth;
    if (!auth || auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores');
    }
    if (!emailId) {
        throw new https_1.HttpsError('invalid-argument', 'emailId es requerido');
    }
    try {
        await db.collection('corporate_emails').doc(emailId).delete();
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al eliminar corporate email: ${error.message}`);
    }
});
//# sourceMappingURL=corporate-emails.js.map