/**
 * Utilidades de VIN (Vehicle Identification Number).
 * Normalización e índice amigable para sync cross-tenant de inventario.
 */

const VIN_FORMAT_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

const VIN_TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};

const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** Uppercase + quita espacios y guiones. */
export function normalizeVin(vin: string | null | undefined): string {
  return String(vin || '')
    .toUpperCase()
    .replace(/[\s\-]/g, '')
    .trim();
}

/** 17 caracteres, sin I/O/Q. */
export function isValidVinFormat(vin: string | null | undefined): boolean {
  return VIN_FORMAT_REGEX.test(normalizeVin(vin));
}

/** Check digit (posición 9 / índice 8). */
export function isValidVinCheckDigit(vin: string | null | undefined): boolean {
  const v = normalizeVin(vin);
  if (!VIN_FORMAT_REGEX.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = v[i];
    const value = /[0-9]/.test(ch) ? Number(ch) : VIN_TRANSLITERATION[ch];
    if (value === undefined) return false;
    sum += value * VIN_WEIGHTS[i];
  }
  const remainder = sum % 11;
  const check = remainder === 10 ? 'X' : String(remainder);
  return v[8] === check;
}

/**
 * Formato válido + check digit.
 * Para sync cross-tenant basta formato (`isValidVinFormat`); el check digit es opcional.
 */
export function isValidVin(vin: string | null | undefined): boolean {
  return isValidVinFormat(vin) && isValidVinCheckDigit(vin);
}

/** Campo índice: solo si el VIN tiene formato válido; si no, string vacío. */
export function toVinNormalized(vin: string | null | undefined): string {
  const n = normalizeVin(vin);
  return isValidVinFormat(n) ? n : '';
}

/**
 * Extrae un VIN de 17 caracteres desde el texto de un código de barras/QR.
 * Los stickers a menudo incluyen prefijos o payload PDF417 más largo.
 */
export function extractVinFromBarcodeText(raw: string | null | undefined): string | null {
  const text = String(raw || '').toUpperCase();
  // Preserve boundaries: stripping every non-VIN character can fabricate a VIN
  // from a label/payload or silently remove an OCR mistake such as I, O or Q.
  const candidates: string[] = text.match(/(?<![A-Z0-9])[A-HJ-NPR-Z0-9]{17}(?![A-Z0-9])/g) || [];
  for (const line of text.split(/[\r\n]+/)) {
    const candidate = normalizeVin(line.replace(/^\s*VIN\s*[:#=]?\s*/i, ''));
    if (isValidVinFormat(candidate)) candidates.push(candidate);
  }
  const unique = [...new Set(candidates)];
  return unique.length === 1 ? unique[0] : null;
}
