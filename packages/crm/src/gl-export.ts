// Export contable GL ligero → QuickBooks / Xero (CSV de asientos)

import { listInvoices, listCashEntries } from './dealer-finance';
import { listRepairOrders } from './repair-orders';
import { getTenantSales } from './sales';

export interface JournalLine {
  account: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntry {
  date: string; // YYYY-MM-DD
  ref: string;
  memo: string;
  lines: JournalLine[];
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function isoDate(d: Date | undefined): string {
  const x = d || new Date();
  return x.toISOString().slice(0, 10);
}

/** Genera asientos desde AR, caja, ventas y RO del tenant */
export async function buildDealerJournalEntries(
  tenantId: string,
  opts?: { from?: string; to?: string }
): Promise<JournalEntry[]> {
  const from = opts?.from || '1970-01-01';
  const to = opts?.to || '2999-12-31';
  const entries: JournalEntry[] = [];

  const invoices = await listInvoices(tenantId, { limit: 500 });
  for (const inv of invoices) {
    const d = isoDate(inv.createdAt);
    if (d < from || d > to) continue;
    if (inv.status === 'void' || inv.status === 'draft') continue;
    entries.push({
      date: d,
      ref: inv.number,
      memo: `AR ${inv.customerName} — ${inv.description || inv.source}`,
      lines: [
        { account: '1200 Accounts Receivable', debit: inv.total, credit: 0 },
        {
          account: inv.source === 'repair_order' ? '4100 Service Revenue' : '4000 Sales Revenue',
          debit: 0,
          credit: inv.subtotal,
        },
        ...(inv.tax > 0
          ? [{ account: '2200 Sales Tax Payable', debit: 0, credit: inv.tax }]
          : []),
      ],
    });
    const paid = round2(inv.total - inv.balance);
    if (paid > 0) {
      entries.push({
        date: d,
        ref: `${inv.number}-PMT`,
        memo: `Cobro ${inv.number}`,
        lines: [
          { account: '1000 Cash', debit: paid, credit: 0 },
          { account: '1200 Accounts Receivable', debit: 0, credit: paid },
        ],
      });
    }
  }

  const cash = await listCashEntries(tenantId, { limit: 500 });
  for (const c of cash) {
    const d = isoDate(c.createdAt);
    if (d < from || d > to) continue;
    if (c.category === 'ar_payment') continue; // ya cubierto arriba
    if (c.type === 'in') {
      entries.push({
        date: d,
        ref: `CASH-${c.id.slice(0, 6)}`,
        memo: c.description || c.category,
        lines: [
          { account: '1000 Cash', debit: c.amount, credit: 0 },
          { account: '4900 Other Income', debit: 0, credit: c.amount },
        ],
      });
    } else {
      entries.push({
        date: d,
        ref: `CASH-${c.id.slice(0, 6)}`,
        memo: c.description || c.category,
        lines: [
          { account: '6000 Operating Expense', debit: c.amount, credit: 0 },
          { account: '1000 Cash', debit: 0, credit: c.amount },
        ],
      });
    }
  }

  // Ventas sin factura AR aún (opcional respaldo)
  try {
    const sales = await getTenantSales(tenantId);
    for (const s of sales.filter((x) => x.status === 'completed').slice(0, 200)) {
      const d = isoDate(s.completedAt || s.createdAt);
      if (d < from || d > to) continue;
      const already = invoices.some((i) => i.source === 'sale' && i.sourceId === s.id);
      if (already) continue;
      const total = Number((s as any).total ?? (s as any).salePrice ?? 0);
      if (total <= 0) continue;
      entries.push({
        date: d,
        ref: `SALE-${s.id.slice(0, 6)}`,
        memo: `Venta ${s.id}`,
        lines: [
          { account: '1200 Accounts Receivable', debit: total, credit: 0 },
          { account: '4000 Sales Revenue', debit: 0, credit: total },
        ],
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const ros = await listRepairOrders(tenantId, { limit: 200 });
    for (const ro of ros.filter((r) => r.status === 'delivered')) {
      const d = isoDate(ro.closedAt || ro.updatedAt);
      if (d < from || d > to) continue;
      const already = invoices.some((i) => i.source === 'repair_order' && i.sourceId === ro.id);
      if (already) continue;
      if (ro.total <= 0) continue;
      entries.push({
        date: d,
        ref: ro.number,
        memo: `RO ${ro.customerName}`,
        lines: [
          { account: '1200 Accounts Receivable', debit: ro.total, credit: 0 },
          { account: '4100 Service Revenue', debit: 0, credit: ro.laborTotal + ro.partsTotal },
          ...(ro.tax > 0
            ? [{ account: '2200 Sales Tax Payable', debit: 0, credit: ro.tax }]
            : []),
        ],
      });
    }
  } catch {
    /* ignore */
  }

  entries.sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref));
  return entries;
}

/** CSV compatible con importación genérica / QuickBooks Online (Journal Entry CSV simplificado) */
export function journalEntriesToQuickBooksCsv(entries: JournalEntry[]): string {
  const header = ['Date', 'JournalNo', 'Account', 'Debits', 'Credits', 'Description'];
  const rows: string[] = [header.join(',')];
  for (const e of entries) {
    for (const line of e.lines) {
      rows.push(
        [
          e.date,
          csvEscape(e.ref),
          csvEscape(line.account),
          line.debit ? line.debit.toFixed(2) : '',
          line.credit ? line.credit.toFixed(2) : '',
          csvEscape(line.memo || e.memo),
        ].join(',')
      );
    }
  }
  return rows.join('\n');
}

/** CSV estilo Xero Manual Journals */
export function journalEntriesToXeroCsv(entries: JournalEntry[]): string {
  const header = [
    '*Narration',
    '*Date',
    '*AccountCode',
    'AccountName',
    '*Debit',
    '*Credit',
    'Description',
  ];
  const rows: string[] = [header.join(',')];
  for (const e of entries) {
    for (const line of e.lines) {
      const code = line.account.split(' ')[0] || '0000';
      rows.push(
        [
          csvEscape(e.memo),
          e.date,
          code,
          csvEscape(line.account),
          line.debit ? line.debit.toFixed(2) : '0',
          line.credit ? line.credit.toFixed(2) : '0',
          csvEscape(e.ref),
        ].join(',')
      );
    }
  }
  return rows.join('\n');
}

function csvEscape(v: string): string {
  const s = String(v || '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
