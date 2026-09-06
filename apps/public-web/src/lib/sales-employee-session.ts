import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSessionSecret(): string {
  const secret =
    process.env.SALES_EMPLOYEE_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CRON_SECRET ||
    process.env.FIREBASE_PRIVATE_KEY ||
    '';
  const trimmed = secret.trim();
  if (!trimmed) {
    throw new Error('Falta secreto de sesión de empleado de ventas');
  }
  return trimmed;
}

function signBody(body: string): string {
  return createHmac('sha256', getSessionSecret()).update(body).digest('base64url');
}

export function signSalesEmployeeSessionToken(input: {
  uid: string;
  salesEmployeeId: string;
}): string {
  const payload = {
    uid: input.uid,
    role: 'sales_employee',
    salesEmployeeId: input.salesEmployeeId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${signBody(body)}`;
}

export function verifySalesEmployeeSessionToken(token: string): {
  uid: string;
  salesEmployeeId: string;
  role: string;
  exp?: number;
} | null {
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [body, signature] = parts;
  let expected: string;
  try {
    expected = signBody(body);
  } catch {
    return null;
  }
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      uid?: string;
      salesEmployeeId?: string;
      role?: string;
      exp?: number;
    };
    if (data.role !== 'sales_employee' || !data.uid || !data.salesEmployeeId) return null;
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      uid: data.uid,
      salesEmployeeId: data.salesEmployeeId,
      role: data.role,
      exp: data.exp,
    };
  } catch {
    return null;
  }
}

export function buildSalesEmployeeAuthResponse(
  employee: { id: string; name: string; email: string },
  uid: string
) {
  const sessionToken = signSalesEmployeeSessionToken({
    uid,
    salesEmployeeId: employee.id,
  });

  const response = NextResponse.json({
    success: true,
    employee: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
    },
  });

  response.cookies.set('salesEmployeeAuthToken', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  return response;
}
