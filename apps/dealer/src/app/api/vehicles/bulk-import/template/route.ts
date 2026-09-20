export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { buildImportTemplateCsv } from '@autodealers/inventory';

/** Plantilla CSV descargable para la importación masiva. */
export async function GET() {
  const csv = buildImportTemplateCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="plantilla-inventario.csv"',
    },
  });
}
