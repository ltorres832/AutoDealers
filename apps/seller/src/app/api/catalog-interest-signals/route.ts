import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { Timestamp, type Query } from 'firebase-admin/firestore';

const MAX_PAGE = 100;
const DEFAULT_PAGE = 50;
const MAX_RANGE_MS = 400 * 24 * 60 * 60 * 1000;

type VehicleSummary = {
  label: string;
  stockNumber: string | null;
  year?: number;
  make?: string;
  model?: string;
};

function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (
    typeof v === 'object' &&
    v !== null &&
    'toDate' in v &&
    typeof (v as { toDate: () => Date }).toDate === 'function'
  ) {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

/** `YYYY-MM-DD` → UTC start or end of that calendar day. */
function parseYyyyMmDd(s: string, endOfDay: boolean): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  if (endOfDay) return new Date(Date.UTC(y, mo, d, 23, 59, 59, 999));
  return new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
}

/** Cursor opaco: solo id del último documento (paginación con startAfter(snapshot)). */
function encodeCursor(docId: string): string | null {
  if (!docId) return null;
  try {
    return Buffer.from(JSON.stringify({ id: docId }), 'utf8').toString('base64url');
  } catch {
    return null;
  }
}

function decodeCursor(raw: string | null): { id: string } | null {
  if (!raw?.trim()) return null;
  try {
    const json = Buffer.from(raw.trim(), 'base64url').toString('utf8');
    const o = JSON.parse(json) as { id?: unknown };
    if (typeof o.id === 'string' && o.id.length > 0) {
      return { id: o.id };
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function loadVehicleSummaries(
  db: ReturnType<typeof getFirestore>,
  tenantId: string,
  vehicleIds: (string | null)[]
): Promise<Record<string, VehicleSummary>> {
  const unique = [
    ...new Set(vehicleIds.filter((x): x is string => typeof x === 'string' && x.length > 0)),
  ].slice(0, 80);
  const out: Record<string, VehicleSummary> = {};
  const chunk = 24;
  for (let i = 0; i < unique.length; i += chunk) {
    const part = unique.slice(i, i + chunk);
    await Promise.all(
      part.map(async (vid) => {
        try {
          const snap = await db.collection('tenants').doc(tenantId).collection('vehicles').doc(vid).get();
          if (!snap.exists) return;
          const d = snap.data() as Record<string, unknown> | undefined;
          if (!d) return;
          const year = typeof d.year === 'number' ? d.year : undefined;
          const make = typeof d.make === 'string' ? d.make : '';
          const model = typeof d.model === 'string' ? d.model : '';
          const specs = d.specifications as Record<string, unknown> | undefined;
          const stockRaw =
            (typeof d.stockNumber === 'string' && d.stockNumber) ||
            (specs && typeof specs.stockNumber === 'string' ? specs.stockNumber : '') ||
            '';
          const label =
            [year, make, model]
              .filter((x) => x !== '' && x !== undefined && x !== 0)
              .join(' ')
              .trim() || vid;
          out[vid] = {
            label,
            stockNumber: stockRaw || null,
            ...(year !== undefined ? { year } : {}),
            ...(make ? { make } : {}),
            ...(model ? { model } : {}),
          };
        } catch {
          /* ignore */
        }
      })
    );
  }
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId')?.trim() || '';
    const fromStr = searchParams.get('from')?.trim() || '';
    const toStr = searchParams.get('to')?.trim() || '';
    const cursorParam = searchParams.get('cursor')?.trim() || '';
    const enrich = searchParams.get('enrich') !== '0';

    let pageSize = parseInt(searchParams.get('limit') || String(DEFAULT_PAGE), 10);
    if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE;
    pageSize = Math.min(pageSize, MAX_PAGE);

    let fromTs: Timestamp | null = null;
    let toTs: Timestamp | null = null;
    if (fromStr || toStr) {
      if (!fromStr || !toStr) {
        return NextResponse.json(
          { error: 'Rango de fechas incompleto: usa from y to (YYYY-MM-DD), o deja ambos vacíos.' },
          { status: 400 }
        );
      }
      const fromDate = parseYyyyMmDd(fromStr, false);
      const toDate = parseYyyyMmDd(toStr, true);
      if (!fromDate || !toDate) {
        return NextResponse.json(
          { error: 'Fechas inválidas. Usa formato YYYY-MM-DD en from y to.' },
          { status: 400 }
        );
      }
      if (fromDate.getTime() > toDate.getTime()) {
        return NextResponse.json({ error: 'from debe ser anterior o igual a to.' }, { status: 400 });
      }
      if (toDate.getTime() - fromDate.getTime() > MAX_RANGE_MS) {
        return NextResponse.json(
          { error: `El rango máximo es ${Math.floor(MAX_RANGE_MS / (24 * 60 * 60 * 1000))} días.` },
          { status: 400 }
        );
      }
      fromTs = Timestamp.fromDate(fromDate);
      toTs = Timestamp.fromDate(toDate);
    }

    const decoded = decodeCursor(cursorParam);
    if (cursorParam && !decoded) {
      return NextResponse.json({ error: 'Cursor inválido.' }, { status: 400 });
    }

    const db = getFirestore();
    const base = db.collection('tenants').doc(auth.tenantId).collection('vehicle_interest_signals');

    let q: Query = base;

    if (vehicleId) {
      q = q.where('vehicleId', '==', vehicleId);
    }
    if (fromTs && toTs) {
      q = q.where('createdAt', '>=', fromTs).where('createdAt', '<=', toTs);
    }

    q = q.orderBy('createdAt', 'desc');

    if (decoded) {
      const cursorSnap = await base.doc(decoded.id).get();
      if (!cursorSnap.exists) {
        return NextResponse.json({ error: 'Cursor inválido (documento no encontrado).' }, { status: 400 });
      }
      const d = cursorSnap.data() as Record<string, unknown> | undefined;
      if (vehicleId && (typeof d?.vehicleId !== 'string' || d.vehicleId !== vehicleId)) {
        return NextResponse.json({ error: 'Cursor no coincide con el filtro de vehículo.' }, { status: 400 });
      }
      if (fromTs && toTs && d?.createdAt != null) {
        const ca = d.createdAt as { toMillis?: () => number };
        const t = typeof ca?.toMillis === 'function' ? ca.toMillis() : null;
        if (t != null) {
          if (t < fromTs.toMillis() || t > toTs.toMillis()) {
            return NextResponse.json({ error: 'Cursor fuera del rango de fechas.' }, { status: 400 });
          }
        }
      }
      q = q.startAfter(cursorSnap);
    }

    const fetchSize = pageSize + 1;
    const snap = await q.limit(fetchSize).get();
    const hasMore = snap.docs.length > pageSize;
    const pageDocs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;

    const signals = pageDocs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        vehicleId: typeof d.vehicleId === 'string' ? d.vehicleId : null,
        surface: typeof d.surface === 'string' ? d.surface : null,
        path: typeof d.path === 'string' ? d.path : null,
        referrer: typeof d.referrer === 'string' ? d.referrer : null,
        utmSource: typeof d.utmSource === 'string' ? d.utmSource : null,
        utmMedium: typeof d.utmMedium === 'string' ? d.utmMedium : null,
        utmCampaign: typeof d.utmCampaign === 'string' ? d.utmCampaign : null,
        userAgent: typeof d.userAgent === 'string' ? d.userAgent : null,
        ipHash: typeof d.ipHash === 'string' ? d.ipHash : null,
        anonymous: d.anonymous === true,
        hasExplicitContact: d.hasExplicitContact === true,
        createdAt: toIso(d.createdAt),
      };
    });

    const last = pageDocs[pageDocs.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.id) : null;

    let merged: Array<(typeof signals)[0] & { vehicleSummary: VehicleSummary | null }>;
    if (enrich && signals.length > 0) {
      const summaries = await loadVehicleSummaries(
        db,
        auth.tenantId,
        signals.map((s) => s.vehicleId)
      );
      merged = signals.map((s) => ({
        ...s,
        vehicleSummary: s.vehicleId ? summaries[s.vehicleId] ?? null : null,
      }));
    } else {
      merged = signals.map((s) => ({ ...s, vehicleSummary: null }));
    }

    const anonymous = merged.filter((s) => !s.hasExplicitContact).length;
    const withContact = merged.filter((s) => s.hasExplicitContact).length;
    const bySurface: Record<string, number> = {};
    for (const s of merged) {
      const k = s.surface || '—';
      bySurface[k] = (bySurface[k] || 0) + 1;
    }
    const uniqueVehicles = new Set(merged.map((s) => s.vehicleId).filter(Boolean)).size;

    return NextResponse.json({
      signals: merged,
      nextCursor,
      hasMore,
      pageSize,
      stats: {
        total: merged.length,
        anonymous,
        withContact,
        uniqueVehicles,
        bySurface,
      },
    });
  } catch (e) {
    console.error('[catalog-interest-signals]', e);
    const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code: unknown }).code : null;
    const message = e instanceof Error ? e.message : String(e);
    if (code === 9 || /index|FAILED_PRECONDITION/i.test(message)) {
      return NextResponse.json(
        {
          error:
            'Falta un índice de Firestore para esta consulta. Despliega firestore.indexes.json o usa la consola de Firebase para crearlo.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
