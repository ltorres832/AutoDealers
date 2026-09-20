import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  buildDealerJournalEntries,
  journalEntriesToQuickBooksCsv,
  journalEntriesToXeroCsv,
} from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json') as 'json' | 'quickbooks' | 'xero';
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    const entries = await buildDealerJournalEntries(auth.tenantId, { from, to });

    if (format === 'quickbooks') {
      const csv = journalEntriesToQuickBooksCsv(entries);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="autodealers-qb-${auth.tenantId.slice(0, 8)}.csv"`,
        },
      });
    }
    if (format === 'xero') {
      const csv = journalEntriesToXeroCsv(entries);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="autodealers-xero-${auth.tenantId.slice(0, 8)}.csv"`,
        },
      });
    }

    return NextResponse.json({ entries, count: entries.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
