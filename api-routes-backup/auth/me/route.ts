import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as admin from 'firebase-admin';

// Inicializar Firebase Admin directamente
let db: admin.firestore.Firestore;

function getFirestore() {
  if (!db) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    db = admin.firestore();
  }
  return db;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('authToken')?.value;

    if (!authToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verificar el token con Firebase Admin
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(authToken);
    } catch (error) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const dbInstance = getFirestore();

    // Buscar el usuario en Firestore (puede estar en dealers o sellers)
    let userData = null;
    let userType: 'dealer' | 'seller' | null = null;

    // Buscar en dealers
    const dealerDoc = await dbInstance.collection('dealers').doc(userId).get();
    if (dealerDoc.exists) {
      userData = dealerDoc.data();
      userType = 'dealer';
    } else {
      // Buscar en sellers
      const sellerDoc = await dbInstance.collection('sellers').doc(userId).get();
      if (sellerDoc.exists) {
        userData = sellerDoc.data();
        userType = 'seller';
      }
    }

    if (!userData || !userType) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: userId,
        email: decodedToken.email,
        type: userType,
        ...userData,
      },
    });
  } catch (error: any) {
    console.error('Error verificando autenticación:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}


