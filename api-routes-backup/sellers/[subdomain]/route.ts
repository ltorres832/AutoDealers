import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Para static export, necesitamos generar los params estáticamente
export async function generateStaticParams() {
  return [];
}

// Inicializar Firebase Admin directamente
function getFirestore() {
  if (!admin.apps.length) {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      if (!projectId || !clientEmail || !privateKey) {
        const missing = [];
        if (!projectId) missing.push('FIREBASE_PROJECT_ID');
        if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
        if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
        throw new Error(`Firebase credentials missing: ${missing.join(', ')}`);
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (error: any) {
      if (error.code === 'app/duplicate-app') {
        return admin.firestore();
      }
      throw error;
    }
  }
  return admin.firestore();
}

// Función para obtener tenant por subdomain
async function getTenantBySubdomain(subdomain: string) {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection('tenants')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    if (data.status !== 'active') {
      return null;
    }
    
    return {
      id: doc.id,
      ...data,
    };
  } catch (error) {
    console.error('Error in getTenantBySubdomain:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;

    const tenant = await getTenantBySubdomain(subdomain);
    if (!tenant || (tenant as any).status !== 'active') {
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      );
    }

    const db = getFirestore();
    let sellersWithDetails: any[] = [];

    if ((tenant as any).type === 'seller') {
      // Si el tenant es un seller, él mismo es el único "vendedor"
      const userSnapshot = await db.collection('users').doc(tenant.id).get();
      if (userSnapshot.exists) {
        const userData = userSnapshot.data();
        sellersWithDetails.push({
          id: userSnapshot.id,
          name: userData?.name || (tenant as any).name,
          email: userData?.email,
          photo: userData?.photo || userData?.profilePhoto || null,
          phone: userData?.phone || null,
          bio: userData?.bio || null,
        });
      }
    } else if ((tenant as any).type === 'dealer') {
      // Si el tenant es un dealer, obtener sus sub-usuarios (vendedores)
      const usersSnapshot = await db
        .collection('users')
        .where('tenantId', '==', tenant.id)
        .where('role', '==', 'seller')
        .where('status', '==', 'active')
        .get();

      sellersWithDetails = usersSnapshot.docs.map((doc: any) => {
        const userData = doc.data();
        return {
          id: doc.id,
          name: userData.name,
          email: userData.email,
          photo: userData.photo || userData.profilePhoto || null,
          phone: userData.phone || null,
          bio: userData.bio || null,
        };
      });
    }

    return NextResponse.json({ sellers: sellersWithDetails });
  } catch (error: any) {
    console.error('❌ Error fetching sellers:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
    });
    
    let errorMessage = 'Error interno del servidor';
    let hint: string | undefined;
    
    if (error.message?.includes('Firebase credentials missing')) {
      errorMessage = 'Firebase no está configurado correctamente';
      hint = 'Ejecuta: node get-firebase-credentials.js para configurar Firebase';
    } else if (error.message?.includes('Firebase')) {
      errorMessage = `Error de Firebase: ${error.message}`;
      hint = 'Verifica que las credenciales de Firebase sean correctas';
    } else {
      hint = process.env.NODE_ENV === 'development' 
        ? `Detalles: ${error.message}` 
        : 'Revisa la consola del servidor para más detalles';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        hint,
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        })
      },
      { status: 500 }
    );
  }
}
