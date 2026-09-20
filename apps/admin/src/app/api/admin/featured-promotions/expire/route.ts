import { NextRequest, NextResponse } from 'next/server';
import { expirePaidAdInventory } from '@autodealers/core';
import { authorizeCronRequest } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const denied = await authorizeCronRequest(request);
  if (denied) return denied;
  const expired = await expirePaidAdInventory();
  return NextResponse.json({ success: true, expired });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
