export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  parseInventoryFile,
  normalizeImportRows,
  buildImportPlan,
  type ImportField,
  type ImportMatchKey,
} from '@autodealers/inventory';
import { computeRemainingInventorySlots } from '@/lib/inventory-limits';

/**
 * Vista previa de importación masiva: parsea el archivo, matchea contra el
 * inventario existente (VIN/stock) y clasifica crear/actualizar/error. No escribe.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido (campo "file")' }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx. 50 MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseInventoryFile(buffer);

    // Mapeo personalizado desde la UI (paso de mapeo); si no, el auto-detectado
    let mapping = parsed.mapping;
    const mappingRaw = formData.get('mapping');
    if (typeof mappingRaw === 'string' && mappingRaw.trim()) {
      try {
        mapping = JSON.parse(mappingRaw) as Record<string, ImportField | null>;
      } catch {
        return NextResponse.json({ error: 'Mapeo de columnas inválido' }, { status: 400 });
      }
    }

    const matchKey = (String(formData.get('matchKey') || 'auto') as ImportMatchKey) || 'auto';
    const rows = normalizeImportRows(parsed.rows, mapping);
    const plan = await buildImportPlan(auth.tenantId, rows, { matchKey });
    const remainingSlots = await computeRemainingInventorySlots(auth.tenantId);

    return NextResponse.json({
      headers: parsed.headers,
      mapping,
      totalRows: parsed.totalRows,
      plan: {
        toCreate: plan.toCreate,
        toUpdate: plan.toUpdate,
        errors: plan.errors,
        rows: plan.rows.map((r) => ({
          rowIndex: r.row.rowIndex,
          action: r.action,
          matchedBy: r.matchedBy || null,
          error: r.error || null,
          vinDecoded: r.vinDecoded || null,
          data: r.row,
        })),
      },
      remainingSlots: Number.isFinite(remainingSlots) ? remainingSlots : null,
      exceedsLimit: Number.isFinite(remainingSlots) && plan.toCreate > remainingSlots,
    });
  } catch (error) {
    console.error('bulk-import preview error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
