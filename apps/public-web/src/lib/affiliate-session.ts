import { NextResponse } from 'next/server';

export function buildAffiliateAuthResponse(
  affiliate: {
    id: string;
    name: string;
    email: string;
    referralCode: string;
  },
  uid: string
) {
  const sessionData = {
    uid,
    role: 'affiliate',
    affiliateId: affiliate.id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

  const response = NextResponse.json({
    success: true,
    affiliate: {
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      referralCode: affiliate.referralCode,
    },
  });

  response.cookies.set('affiliateAuthToken', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
