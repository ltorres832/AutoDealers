export const dynamic = 'force-dynamic';
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  parseInventoryFile,
  normalizeImportRows,
  buildImportPlan,
  commitInventoryImport,
  getVehicles,
  type ImportField,
  type ImportMatchKey,
} from '@autodealers/inventory';
import { resolveSellerVehicleCreatePolicy } from '@autodealers/core';

async function computeSellerRemainingSlots(billingTenantId: string, sellerTenantId: string): Promise<number> {
  const { getTenantMembership } = await import('@autodealers/core');
  const membership = await getTenantMembership(billingTenantId);
  const maxInventory = membership?.features?.maxInventory as number | null | undefined;
  if (maxInventory == null) return Infinity;
  const vehicles = await getVehicles(sellerTenantId, { limit: 8000 });
  return Math.max(0, maxInventory - vehicles.length);
}

/**
 * Importación masiva del vendedor: preview (mode=preview) y commit (mode=commit)
 * sobre su propio tenant. Los vehículos creados quedan con su sellerId.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
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

    const mode = String(formData.get('mode') || 'preview');
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseInventoryFile(buffer);

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

    const policy = await resolveSellerVehicleCreatePolicy(auth.tenantId, auth.userId);
    if (plan.toCreate > 0 && policy.mode === 'blocked') {
      return NextResponse.json({ error: policy.message }, { status: policy.status });
    }

    const billingTenantId = auth.dealerId || auth.tenantId;
    const remainingSlots = await computeSellerRemainingSlots(billingTenantId, auth.tenantId);

    if (mode === 'preview') {
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
    }

    const importPhotos = String(formData.get('importPhotos') || 'true') !== 'false';
    const result = await commitInventoryImport(auth.tenantId, plan, {
      maxCreates: remainingSlots,
      sellerId: auth.userId,
      importPhotos,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('seller bulk-import error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
