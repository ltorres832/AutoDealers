import type { LeadSource } from './types';

const KNOWN_SOURCES = new Set<string>([
  'whatsapp',
  'facebook',
  'instagram',
  'web',
  'email',
  'sms',
  'phone',
  'admin_manual',
  'manual',
]);

/**
 * Normaliza la fuente del lead al union `LeadSource` (evita fallos TS y datos inconsistentes).
 */
export function normalizeLeadSource(input: unknown, fallback: LeadSource = 'web'): LeadSource {
  const s = typeof input === 'string' ? input.trim() : '';
  if (s && KNOWN_SOURCES.has(s)) {
    return s as LeadSource;
  }
  return fallback;
}

/** Nombre para UI a partir del documento CRM o legado plano. */
export function leadDisplayName(lead: {
  contact?: { name?: string; email?: string };
  name?: string;
  email?: string;
}): string {
  const n = lead.contact?.name?.trim() || (typeof lead.name === 'string' ? lead.name.trim() : '');
  if (n) return n;
  const e = lead.contact?.email?.trim() || (typeof lead.email === 'string' ? lead.email.trim() : '');
  if (e) return e;
  return 'Cliente';
}
