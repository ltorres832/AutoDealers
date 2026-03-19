// Cloud Functions para Corporate Emails
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Crear corporate email
export const createCorporateEmail = onCall(async (request) => {
  const { email } = request.data;
  const auth = request.auth;

  if (!auth || auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores');
  }

  if (!email) {
    throw new HttpsError('invalid-argument', 'email es requerido');
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
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear corporate email: ${error.message}`);
  }
});

// Obtener corporate emails
export const getCorporateEmails = onCall(async (request) => {
  const auth = request.auth;

  if (!auth || auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores');
  }

  try {
    const snapshot = await db
      .collection('corporate_emails')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const emails = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      activatedAt: doc.data().activatedAt?.toDate(),
      suspendedAt: doc.data().suspendedAt?.toDate(),
    }));

    return { emails };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener corporate emails: ${error.message}`);
  }
});

// Activar corporate email
export const activateCorporateEmail = onCall(async (request) => {
  const { emailId } = request.data;
  const auth = request.auth;

  if (!auth || auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores');
  }

  if (!emailId) {
    throw new HttpsError('invalid-argument', 'emailId es requerido');
  }

  try {
    await db.collection('corporate_emails').doc(emailId).update({
      status: 'active',
      activatedAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al activar corporate email: ${error.message}`);
  }
});

// Suspender corporate email
export const suspendCorporateEmail = onCall(async (request) => {
  const { emailId } = request.data;
  const auth = request.auth;

  if (!auth || auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores');
  }

  if (!emailId) {
    throw new HttpsError('invalid-argument', 'emailId es requerido');
  }

  try {
    await db.collection('corporate_emails').doc(emailId).update({
      status: 'suspended',
      suspendedAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al suspender corporate email: ${error.message}`);
  }
});

// Eliminar corporate email
export const deleteCorporateEmail = onCall(async (request) => {
  const { emailId } = request.data;
  const auth = request.auth;

  if (!auth || auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores');
  }

  if (!emailId) {
    throw new HttpsError('invalid-argument', 'emailId es requerido');
  }

  try {
    await db.collection('corporate_emails').doc(emailId).delete();

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al eliminar corporate email: ${error.message}`);
  }
});


