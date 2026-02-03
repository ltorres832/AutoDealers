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

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Obtener tenant por subdominio
    const tenant = await getTenantBySubdomain(subdomain);

    if (!tenant || (tenant as any).status !== 'active') {
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      );
    }

    // Obtener posts sociales publicados
    const db = getFirestore();
    const postsSnapshot = await db
      .collection('tenants')
      .doc(tenant.id)
      .collection('social_posts')
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .limit(limit)
      .get();

    const posts = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        content: data.content,
        media: data.media || [],
        platforms: data.platforms || [],
        publishedAt: data.publishedAt?.toDate?.()?.toISOString() || data.publishedAt,
        metadata: data.metadata || {},
        aiGenerated: data.aiGenerated || false,
      };
    });

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error('Error fetching social posts:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
