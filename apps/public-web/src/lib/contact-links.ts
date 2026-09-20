export function normalizePhoneDigits(raw?: string | null): string {
  let digits = String(raw || '').replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export function buildTelHref(raw?: string | null): string | null {
  const digits = normalizePhoneDigits(raw);
  return digits ? `tel:+${digits}` : null;
}

export function buildWhatsAppHref(raw?: string | null, message?: string): string | null {
  const digits = normalizePhoneDigits(raw);
  if (!digits) return null;
  const qs = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${qs}`;
}
