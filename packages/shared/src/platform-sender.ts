/** Marca visible en emails, SMS y WhatsApp transaccionales. */

export const PLATFORM_NAME = 'AutoDealersOnline';

export const DEFAULT_PLATFORM_EMAIL = 'noreply@autodealers-online.com';

export function parseEmailAddress(raw: string): { email: string; name?: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (!match) return { email: trimmed };
  const name = match[1]?.trim().replace(/^"|"$/g, '');
  return { email: match[2]!.trim(), ...(name ? { name } : {}) };
}

/** Formato remitente: AutoDealersOnline <email@dominio> */
export function formatPlatformEmailFrom(raw?: string | null): string {
  const fallback = DEFAULT_PLATFORM_EMAIL;
  const trimmed = String(raw || fallback).trim() || fallback;
  const parsed = parseEmailAddress(trimmed);
  return `${PLATFORM_NAME} <${parsed.email}>`;
}

export function defaultPlatformEmailSubject(topic = 'Mensaje'): string {
  return `${topic} de ${PLATFORM_NAME}`;
}

export function platformMessageSignature(): string {
  return PLATFORM_NAME;
}

/** Corrige textos legacy "AutoDealers" / "autodealers" dentro del cuerpo del mensaje. */
export function normalizePlatformMessageText(text: string): string {
  if (!text) return text;

  const preserved: string[] = [];
  const masked = text.replace(
    /(?:https?:\/\/)?\S*autodealers[\w.-]*\S*/gi,
    (match) => {
      preserved.push(match);
      return `__AD_DOMAIN_${preserved.length - 1}__`;
    }
  );

  let normalized = masked
    .replace(/Equipo AutoDealers\b(?!Online)/gi, `Equipo ${PLATFORM_NAME}`)
    .replace(/Bienvenido a AutoDealers\b(?!Online)/gi, `Bienvenido a ${PLATFORM_NAME}`)
    .replace(/parte de AutoDealers\b(?!Online)/gi, `parte de ${PLATFORM_NAME}`)
    .replace(/ en AutoDealers\b(?!Online)/gi, ` en ${PLATFORM_NAME}`)
    .replace(/ - AutoDealers\b(?!Online)/gi, ` - ${PLATFORM_NAME}`)
    .replace(/\[AutoDealers\]/g, `[${PLATFORM_NAME}]`)
    .replace(/\bAutoDealers\b(?!Online)/g, PLATFORM_NAME)
    .replace(/\bautodealers\b(?!online)/gi, PLATFORM_NAME);

  preserved.forEach((value, index) => {
    normalized = normalized.replace(`__AD_DOMAIN_${index}__`, value);
  });

  return normalized;
}
