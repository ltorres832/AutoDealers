// Cloud Function para crear usuarios de prueba
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const createTestUsers = functions.https.onCall(async (data, context) => {
  // Solo admin puede ejecutar esto
  if (context.auth?.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden crear usuarios de prueba');
  }

  const db = admin.firestore();
  const auth = admin.auth();

  const users = [
    // Admin User
    {
      email: 'admin@autodealers.test',
      password: 'Admin123!',
      role: 'admin',
      name: 'Admin Usuario',
      tenantId: null,
      membershipId: 'admin-membership',
      membershipType: 'dealer',
      status: 'active',
    },
    // Dealer User
    {
      email: 'dealer@autodealers.test',
      password: 'Dealer123!',
      role: 'dealer',
      name: 'Dealer Usuario',
      tenantId: 'test-tenant-1',
      membershipId: 'dealer-membership',
      membershipType: 'dealer',
      status: 'active',
    },
    // Seller User
    {
      email: 'seller@autodealers.test',
      password: 'Seller123!',
      role: 'seller',
      name: 'Seller Usuario',
      tenantId: 'test-tenant-1',
      membershipId: 'seller-membership',
      membershipType: 'seller',
      status: 'active',
    },
    // Advertiser User
    {
      email: 'advertiser@autodealers.test',
      password: 'Advertiser123!',
      role: 'advertiser',
      name: 'Advertiser Usuario',
      tenantId: null,
      membershipId: 'advertiser-membership',
      membershipType: 'dealer',
      status: 'active',
    },
  ];

  const results = [];

  for (const userData of users) {
    try {
      // Verificar si el usuario ya existe
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(userData.email);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Crear usuario en Firebase Auth
          userRecord = await auth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.name,
          });
        } else {
          throw error;
        }
      }

      // Crear o actualizar documento en Firestore
      await db.collection('users').doc(userRecord.uid).set({
        id: userRecord.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        tenantId: userData.tenantId,
        membershipId: userData.membershipId,
        membershipType: userData.membershipType,
        status: userData.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      results.push({
        email: userData.email,
        role: userData.role,
        status: 'created',
        uid: userRecord.uid,
      });
    } catch (error: any) {
      results.push({
        email: userData.email,
        role: userData.role,
        status: 'error',
        error: error.message,
      });
    }
  }

  return {
    success: true,
    users: results,
    message: 'Usuarios de prueba creados',
  };
});


