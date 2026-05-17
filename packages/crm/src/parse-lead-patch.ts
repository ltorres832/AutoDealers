import type { Lead, LeadStatus } from './types';
import { sanitizeLeadTradeIn } from './lead-trade-in';

export type ParseLeadPatchOptions = {
  allowedStatuses: Set<string>;
  allowAssignedTo: boolean;
};

export type ParseLeadPatchResult =
  | { ok: true; updates: Partial<Lead> }
  | { ok: false; statusCode: number; message: string };

/**
 * Construye un `Partial<Lead>` seguro a partir del body de PATCH (solo campos permitidos).
 */
export function parseLeadPatchBody(
  body: unknown,
  lead: Lead,
  options: ParseLeadPatchOptions
): ParseLeadPatchResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, statusCode: 400, message: 'Cuerpo inválido' };
  }

  const raw = body as Record<string, unknown>;
  const updates: Partial<Lead> = {};

  if ('status' in raw && raw.status !== undefined) {
    if (typeof raw.status !== 'string' || !options.allowedStatuses.has(raw.status)) {
      return { ok: false, statusCode: 400, message: 'Estado no válido para el pipeline' };
    }
    updates.status = raw.status as LeadStatus;
  }

  if ('notes' in raw && raw.notes !== undefined) {
    if (raw.notes !== null && typeof raw.notes !== 'string') {
      return { ok: false, statusCode: 400, message: 'Notas inválidas' };
    }
    if (typeof raw.notes === 'string') {
      updates.notes = raw.notes.slice(0, 20000);
    }
  }

  if ('tags' in raw && raw.tags !== undefined) {
    if (!Array.isArray(raw.tags) || !raw.tags.every((t) => typeof t === 'string')) {
      return { ok: false, statusCode: 400, message: 'Tags inválidos' };
    }
    updates.tags = (raw.tags as string[]).map((t) => t.slice(0, 80)).slice(0, 50);
  }

  if ('contact' in raw && raw.contact !== undefined && raw.contact !== null) {
    if (typeof raw.contact !== 'object' || Array.isArray(raw.contact)) {
      return { ok: false, statusCode: 400, message: 'Contacto inválido' };
    }
    const c = raw.contact as Record<string, unknown>;
    const next = { ...lead.contact };
    let changed = false;
    if (typeof c.name === 'string') {
      const n = c.name.trim().slice(0, 200);
      if (n && n !== next.name) {
        next.name = n;
        changed = true;
      }
    }
    if (typeof c.phone === 'string') {
      const p = c.phone.trim().slice(0, 50);
      if (p && p !== next.phone) {
        next.phone = p;
        changed = true;
      }
    }
    if (typeof c.email === 'string') {
      const e = c.email.trim().slice(0, 200);
      if (e !== (next.email ?? '')) {
        next.email = e || undefined;
        changed = true;
      }
    }
    if (typeof c.preferredChannel === 'string') {
      const ch = c.preferredChannel.trim().slice(0, 40);
      if (ch && ch !== next.preferredChannel) {
        next.preferredChannel = ch;
        changed = true;
      }
    }
    if (!next.preferredChannel) {
      next.preferredChannel = 'phone';
    }
    if (changed) {
      updates.contact = next;
    }
  }

  if (options.allowAssignedTo && 'assignedTo' in raw && raw.assignedTo !== undefined) {
    if (typeof raw.assignedTo !== 'string') {
      return { ok: false, statusCode: 400, message: 'Asignación inválida' };
    }
    const assignee = raw.assignedTo.trim();
    if (!assignee || assignee.length > 200) {
      return { ok: false, statusCode: 400, message: 'Asignación inválida' };
    }
    updates.assignedTo = assignee;
  }

  if ('tradeIn' in raw && raw.tradeIn !== undefined && raw.tradeIn !== null) {
    if (typeof raw.tradeIn !== 'object' || Array.isArray(raw.tradeIn)) {
      return { ok: false, statusCode: 400, message: 'Trade-in inválido' };
    }
    const t = sanitizeLeadTradeIn(raw.tradeIn);
    if (!t) {
      const hasAny = Object.values(raw.tradeIn as Record<string, unknown>).some(
        (v) => v !== '' && v !== null && v !== undefined
      );
      if (hasAny) {
        return { ok: false, statusCode: 400, message: 'Trade-in inválido' };
      }
    } else {
      updates.tradeIn = t;
    }
  }

  return { ok: true, updates };
}
