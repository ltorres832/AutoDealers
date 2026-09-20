import { NextRequest } from 'next/server';
import { getAuth, getFirestore } from './firebase-admin';

export async function getCustomerFromRequest(request: NextRequest): Promise<{
  id: string;
  email?: string;
  phone?: string;
} | null> {
  const raw = request.cookies.get('authToken')?.value || '';
  if (!raw) return null;
  try {
    const decoded = await getAuth().verifyIdToken(decodeURIComponent(raw));
    const db = getFirestore();
    let userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists && decoded.email) {
      const snap = await db.collection('users').where('email', '==', decoded.email).limit(5).get();
      const customer = snap.docs.find((doc) => String(doc.data()?.role || '') === 'customer');
      if (customer) userDoc = customer;
    }
    const data = userDoc.data() || {};
    if (String(data.role || '') !== 'customer' || data.status !== 'active') {
      return null;
    }
    return {
      id: userDoc.id,
      email: data.email ? String(data.email) : decoded.email || undefined,
      phone: data.phone ? String(data.phone) : undefined,
    };
  } catch {
    return null;
  }
}
