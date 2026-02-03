import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simplified middleware: do not run Firebase Admin on edge runtime.
// For now, just allow all requests to proceed to avoid edge runtime limitations.
export async function middleware(_request: NextRequest) {
  return NextResponse.next();
}

// Disable middleware matchers (no protected routes in middleware)
export const config = {
  matcher: [],
};

