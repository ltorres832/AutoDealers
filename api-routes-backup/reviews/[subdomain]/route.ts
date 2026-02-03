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
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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

// Función para obtener tenant por subdomain sin usar @autodealers/core
async function getTenantBySubdomain(subdomain: string) {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection('tenants')
      .where('subdomain', '==', subdomain)
      .where('status', '==', 'active')
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

// Función para obtener reseñas públicas sin usar @autodealers/crm
async function getPublicReviews(tenantId: string, limit?: number) {
  const db = getFirestore();
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('reviews')
    .where('status', '==', 'approved')
    .orderBy('createdAt', 'desc');
  
  if (limit) {
    query = query.limit(limit);
  } else {
    query = query.limit(50); // Límite por defecto como en el código original
  }
  
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate()?.toISOString(),
      updatedAt: data.updatedAt?.toDate()?.toISOString(),
      response: data?.response
        ? {
            ...data.response,
            respondedAt: data.response.respondedAt?.toDate()?.toISOString(),
          }
        : undefined,
    };
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;
    const limit = request.nextUrl.searchParams.get('limit');

    const tenant = await getTenantBySubdomain(subdomain);
    if (!tenant || (tenant as any).status !== 'active') {
      return NextResponse.json({ error: 'Tenant not found or inactive' }, { status: 404 });
    }

    const reviews = await getPublicReviews(tenant.id, limit ? parseInt(limit) : undefined);

    return NextResponse.json({ reviews });
  } catch (error: any) {
    console.error('Error fetching public reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

