import { NextRequest } from 'next/server';
import { getAuth, getAffiliateByAuthUserId } from '@autodealers/core';

export interface AffiliateAuthContext {
  userId: string;
  role: 'affiliate';
  affiliateId: string;
}

export async function verifyAffiliateAuth(
  request: NextRequest
): Promise<AffiliateAuthContext | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('affiliateAuthToken')?.value;
    const token = authHeader?.replace('Bearer ', '') || cookieToken;
    if (!token) return null;

    try {
      const decoded = await getAuth().verifyIdToken(token);
      if (!decoded.uid) return null;
      const affiliate = await getAffiliateByAuthUserId(decoded.uid);
      if (!affiliate || affiliate.status !== 'active') return null;
      return {
        userId: decoded.uid,
        role: 'affiliate',
        affiliateId: affiliate.id,
      };
    } catch {
      // session token fallback
    }

    const sessionData = JSON.parse(Buffer.from(token, 'base64').toString());
    if (sessionData.role !== 'affiliate' || !sessionData.uid || !sessionData.affiliateId) {
      return null;
    }
    if (sessionData.exp && sessionData.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const affiliate = await getAffiliateByAuthUserId(sessionData.uid);
    if (!affiliate || affiliate.status !== 'active' || affiliate.id !== sessionData.affiliateId) {
      return null;
    }

    return {
      userId: sessionData.uid,
      role: 'affiliate',
      affiliateId: affiliate.id,
    };
  } catch {
    return null;
  }
}
