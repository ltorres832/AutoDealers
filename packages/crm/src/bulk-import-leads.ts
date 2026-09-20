/**
 * Importación masiva de leads/clientes desde CSV/Excel (kit migración Fase 2).
 */
import * as XLSX from 'xlsx';
import { createLead } from './leads';
import type { LeadSource, LeadStatus } from './types';

export type LeadImportField =
  | 'name'
  | 'phone'
  | 'email'
  | 'source'
  | 'status'
  | 'city'
  | 'notes'
  | 'budget'
  | 'vehicleInterest'
  | 'assignedTo';

const COLUMN_ALIASES: Record<LeadImportField, string[]> = {
  name: ['name', 'nombre', 'full name', 'fullname completo', 'cliente', 'contact', 'contacto'],
  phone: ['phone', 'telefono', 'teléfono', 'tel', 'mobile', 'celular', 'whatsapp'],
  email: ['email', 'correo', 'e-mail', 'mail'],
  source: ['source', 'fuente', 'origen', 'canal'],
  status: ['status', 'estado', 'estatus'],
  city: ['city', 'ciudad', 'pueblo', 'municipio'],
  notes: ['notes', 'notas', 'comentarios', 'comments', 'observaciones'],
  budget: ['budget', 'presupuesto', 'budget max'],
  vehicleInterest: ['vehicle', 'vehiculo', 'vehículo', 'interest', 'interes', 'interés', 'vehicle interest'],
  assignedTo: ['assigned', 'asignado', 'vendedor', 'seller', 'assigned to', 'seller id'],
};

function normalizeHeader(header: string): string {
  return String(header || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function detectLeadImportField(header: string): LeadImportField | null {
  const norm = normalizeHeader(header);
  if (!norm) return null;
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [LeadImportField, string[]][]) {
    if (aliases.includes(norm)) return field;
  }
  return null;
}

export function buildLeadCsvTemplate(): string {
  return [
    'nombre,telefono,email,fuente,estado,ciudad,notas,presupuesto,interes',
    'Juan Perez,7875551234,juan@example.com,web,new,San Juan,Interesado en SUV,25000,Toyota RAV4',
  ].join('\n');
}

export interface LeadImportPreviewRow {
  rowNumber: number;
  mapped: Partial<Record<LeadImportField, string>>;
  errors: string[];
  ok: boolean;
}

export interface LeadImportPreview {
  headers: string[];
  mapping: Record<string, LeadImportField | null>;
  rows: LeadImportPreviewRow[];
  summary: { total: number; ok: number; errors: number };
}

function mapSource(raw: string): LeadSource {
  const s = normalizeHeader(raw);
  if (['web', 'website', 'sitio', 'pagina'].includes(s)) return 'web';
  if (['facebook', 'fb', 'meta'].includes(s)) return 'facebook';
  if (['instagram', 'ig'].includes(s)) return 'instagram';
  if (['whatsapp', 'wa'].includes(s)) return 'whatsapp';
  if (['phone', 'telefono', 'tel', 'llamada'].includes(s)) return 'phone';
  if (['email', 'correo'].includes(s)) return 'email';
  if (['sms'].includes(s)) return 'sms';
  if (['admin', 'admin_manual'].includes(s)) return 'admin_manual';
  return 'manual';
}

function mapStatus(raw: string): LeadStatus {
  const s = normalizeHeader(raw);
  if (['new', 'nuevo'].includes(s)) return 'new';
  if (['contacted', 'contactado'].includes(s)) return 'contacted';
  if (['qualified', 'calificado'].includes(s)) return 'qualified';
  if (['negotiation', 'negociacion', 'negociacion'].includes(s)) return 'negotiation';
  if (['won', 'ganado', 'vendido', 'closed', 'cerrado'].includes(s)) return 'closed';
  if (['lost', 'perdido'].includes(s)) return 'lost';
  return 'new';
}

export function parseLeadImportBuffer(buffer: Buffer): LeadImportPreview {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (json.length === 0) {
    return {
      headers: [],
      mapping: {},
      rows: [],
      summary: { total: 0, ok: 0, errors: 0 },
    };
  }

  const headers = Object.keys(json[0] || {});
  const mapping: Record<string, LeadImportField | null> = {};
  for (const h of headers) {
    mapping[h] = detectLeadImportField(h);
  }

  const rows: LeadImportPreviewRow[] = json.map((raw, idx) => {
    const mapped: Partial<Record<LeadImportField, string>> = {};
    for (const [header, field] of Object.entries(mapping)) {
      if (!field) continue;
      const val = String(raw[header] ?? '').trim();
      if (val) mapped[field] = val;
    }
    const errors: string[] = [];
    if (!mapped.name) errors.push('Falta nombre');
    if (!mapped.phone && !mapped.email) errors.push('Falta teléfono o email');
    return {
      rowNumber: idx + 2,
      mapped,
      errors,
      ok: errors.length === 0,
    };
  });

  const ok = rows.filter((r) => r.ok).length;
  return {
    headers,
    mapping,
    rows,
    summary: { total: rows.length, ok, errors: rows.length - ok },
  };
}

export async function commitLeadImport(input: {
  tenantId: string;
  createdBy: string;
  rows: LeadImportPreviewRow[];
  onlyOk?: boolean;
}): Promise<{ created: number; skipped: number; errors: string[] }> {
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of input.rows) {
    if (input.onlyOk !== false && !row.ok) {
      skipped += 1;
      continue;
    }
    try {
      await createLead(
        input.tenantId,
        mapSource(row.mapped.source || 'manual'),
        {
          name: row.mapped.name || 'Sin nombre',
          phone: row.mapped.phone || '',
          email: row.mapped.email,
          preferredChannel: row.mapped.phone ? 'whatsapp' : 'email',
          city: row.mapped.city,
        },
        row.mapped.notes || '',
        {
          assignedTo: row.mapped.assignedTo || undefined,
          createdBy: input.createdBy,
          budget: row.mapped.budget || null,
          vehicleInterest: row.mapped.vehicleInterest || null,
        }
      );
      created += 1;
    } catch (e: any) {
      errors.push(`Fila ${row.rowNumber}: ${e?.message || 'error'}`);
      skipped += 1;
    }
  }

  return { created, skipped, errors };
}
