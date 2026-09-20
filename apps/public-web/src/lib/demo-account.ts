/**
 * Detección de cuentas/tenants demo. Seguro para cliente y servidor
 * (sin imports de Node / @autodealers/core).
 *
 * Incluye allowlist de IDs y heurística (email/nombre) para e2e/smoke
 * que se crean en cada corrida y no estaban en la lista.
 */

export const KNOWN_DEMO_TENANT_IDS = new Set<string>([
  '5aqHmomoUxKwsVxGJjnV', // Caribe Motors PR
  'NPtFzTw3FyQkb6NPQkdj', // Autos de Pedro
  'auto-premium-test', // fixture Unsplash / Auto Premium Motors
  'wUJvXEk8dYjkOAXwNLdc', // E2E Dealer ms0qghzg
  'rD0HckGDG0vXp3nfZ5Dn', // E2E All mss7hq8q
  'zjI6CIuTSuxe5EJs4caW', // e2e seller tenant legacy (doc ya no existe)
]);

export const KNOWN_DEMO_USER_IDS = new Set<string>([
  'UA0vfLzy8vUTwBXJCn3lnmsOY712', // Ricardo Colón / Caribe Motors
  'hUX9H3j2toXfvIz8tEtFNzSgiUW2', // Pedro Martínez
  '2JQgnqk6gyXzRRISbg0X5wkUnjB2', // Ana Rivera (equipo dealer demo)
  'l3q7w0axKPQ7WpKVsWfUA0GZ6mw2', // Miguel Santos (equipo dealer demo)
  '7njKg6h3HvOHRdvlpCZraxnGrBN2', // E2E Dealer ms0qghzg
  'xCwBlXKMQCbLP8GiO4SeD0gxjSc2', // E2E Dealer mss7hq8q
  'Redh19vKEaenF7EjTOo81ui1rGN2', // E2E Seller mss7hq8q
  '0uR7VisYN3ZWA5nOhFPzSRzkXEP2', // E2E Seller Test
]);

const TEST_EMAIL_DOMAINS = new Set(['autodealers.test', 'autodealers-test.com']);

const TEST_EMAIL_PREFIX_RE =
  /^(e2e[-.]|smoke[-.]|pw-seller-|demo\.dealer|demo\.vendedor)/i;

const DEMO_NAME_RE =
  /caribe motors|\bautos de pedro\b|^pedro mart[ií]nez$|^auto premium motors$|^e2e\b/i;

export function isKnownDemoId(id?: string | null): boolean {
  const v = String(id || '').trim();
  if (!v) return false;
  return KNOWN_DEMO_TENANT_IDS.has(v) || KNOWN_DEMO_USER_IDS.has(v);
}

function stringField(data: Record<string, unknown> | null | undefined, key: string): string {
  const raw = data?.[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

function emailLooksLikeTest(email: string): boolean {
  const v = email.toLowerCase().trim();
  if (!v || !v.includes('@')) return false;
  const [local, domain] = v.split('@');
  if (TEST_EMAIL_DOMAINS.has(domain)) return true;
  if (TEST_EMAIL_PREFIX_RE.test(local)) return true;
  return false;
}

function nameLooksLikeDemo(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return DEMO_NAME_RE.test(v);
}

/** Cuentas/tenants/entidades de demostración o e2e: no listar en catálogo público. */
export function isDemoPromoAccount(
  data: Record<string, unknown> | null | undefined,
  id?: string | null
): boolean {
  if (isKnownDemoId(id)) return true;
  if (!data) return false;
  if (data.isDemo === true || data.isDemoAccount === true || data.demoAccount === true || data.isPromoDemo === true) {
    return true;
  }
  if (String(data.visibility ?? '').toLowerCase().trim() === 'demo') return true;
  if (isKnownDemoId(stringField(data, 'tenantId'))) return true;
  if (isKnownDemoId(stringField(data, 'ownerId'))) return true;
  if (isKnownDemoId(stringField(data, 'sellerId'))) return true;
  if (isKnownDemoId(stringField(data, 'dealerId'))) return true;
  if (isKnownDemoId(stringField(data, 'userId'))) return true;
  if (isKnownDemoId(stringField(data, 'advertiserId'))) return true;
  if (isKnownDemoId(stringField(data, 'targetId'))) return true;

  const email = stringField(data, 'email');
  if (emailLooksLikeTest(email)) return true;

  const nameFields = [
    stringField(data, 'name'),
    stringField(data, 'displayName'),
    stringField(data, 'companyName'),
    stringField(data, 'businessName'),
    stringField(data, 'tenantName'),
  ];
  if (nameFields.some(nameLooksLikeDemo)) return true;

  return false;
}

/** Extrae tenantId de paths tipo tenants/{tid}/promotions/{id}. */
export function tenantIdFromResourcePath(path?: string | null): string {
  const parts = String(path || '').split('/').filter(Boolean);
  const i = parts.indexOf('tenants');
  if (i >= 0 && parts[i + 1]) return parts[i + 1];
  return '';
}

export function isDemoResourcePath(path?: string | null): boolean {
  return isKnownDemoId(tenantIdFromResourcePath(path));
}
