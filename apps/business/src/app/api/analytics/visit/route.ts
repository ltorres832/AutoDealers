import { NextRequest } from 'next/server';
import { handlePlatformVisitPost } from '@autodealers/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return handlePlatformVisitPost(request, 'business');
}
