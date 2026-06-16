import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { checkAndNotifyPolicyUpdates } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await checkAndNotifyPolicyUpdates(
      auth.userId,
      auth.role as 'admin' | 'dealer' | 'seller' | 'public' | 'advertiser',
      auth.tenantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error checking policy updates:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
