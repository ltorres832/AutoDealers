import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  parseLeadImportBuffer,
  commitLeadImport,
  buildLeadCsvTemplate,
} from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const csv = buildLeadCsvTemplate();
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="plantilla-leads.csv"',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      const mode = String(form.get('mode') || 'preview');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const preview = parseLeadImportBuffer(buffer);

      if (mode === 'commit') {
        const result = await commitLeadImport({
          tenantId: auth.tenantId,
          createdBy: auth.userId,
          rows: preview.rows,
          onlyOk: true,
        });
        return NextResponse.json({ preview: preview.summary, result });
      }

      return NextResponse.json({ preview });
    }

    const body = await request.json();
    if (body.mode === 'commit' && Array.isArray(body.rows)) {
      const result = await commitLeadImport({
        tenantId: auth.tenantId,
        createdBy: auth.userId,
        rows: body.rows,
        onlyOk: true,
      });
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: 'Envía multipart file o rows JSON' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[leads import]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
