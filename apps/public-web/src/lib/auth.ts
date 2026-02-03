// Función de autenticación para public-web

import { NextRequest } from 'next/server';
import { getAuth } from '@autodealers/core';
import { cookies } from 'next/headers';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'admin' | 'dealer' | 'seller' | 'advertiser';
  tenantId?: string;
  dealerId?: string;
}

/**
 * Verifica autenticación y retorna usuario
 */
export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return null;
    }

    const auth = getAuth();
    
    try {
      const decodedToken = await auth.verifyIdToken(token);
      
      // Obtener datos del usuario desde Firestore
      const { getFirestore } = await import('@autodealers/core');
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      
      return {
        userId: decodedToken.uid,
        email: decodedToken.email || userData?.email || '',
        role: userData?.role || 'seller',
        tenantId: userData?.tenantId,
        dealerId: userData?.dealerId,
      };
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  } catch (error) {
    console.error('Error in verifyAuth:', error);
    return null;
  }
}



