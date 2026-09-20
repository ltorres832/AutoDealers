export const dynamic = 'force-dynamic';
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  parseInventoryFile,
  normalizeImportRows,
  buildImportPlan,
  commitInventoryImport,
  type ImportField,
  type ImportMatchKey,
} from '@autodealers/inventory';
import { createNotification } from '@autodealers/core';
import { computeRemainingInventorySlots } from '@/lib/inventory-limits';

/**
 * Ejecuta la importación masiva: re-parsea el archivo confirmado y escribe en lotes.
 * Respeta el límite maxInventory del plan y sincroniza el caché público al final.
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
    const importPhotos = String(formData.get('importPhotos') || 'true') !== 'false';

    const rows = normalizeImportRows(parsed.rows, mapping);
    const plan = await buildImportPlan(auth.tenantId, rows, { matchKey });
    const remainingSlots = await computeRemainingInventorySlots(auth.tenantId);

    const result = await commitInventoryImport(auth.tenantId, plan, {
      maxCreates: remainingSlots,
      importPhotos,
    });

    try {
      await createNotification({
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: 'system_alert',
        title: 'Importación de inventario completada',
        message: `Importación masiva: ${result.created} creados, ${result.updated} actualizados, ${result.skipped} omitidos.`,
        channels: ['system'],
        metadata: { created: result.created, updated: result.updated, skipped: result.skipped },
      });
    } catch (notifError) {
      console.error('bulk-import: error creando notificación:', notifError);
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('bulk-import commit error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
