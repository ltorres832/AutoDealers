/** Convierte dirección string u objeto Firestore a texto para la UI pública. */
export function formatPublicLocation(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const a = value as Record<string, unknown>;
    return [a.street, a.city, a.state, a.zipCode, a.country]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .map((part) => part.trim())
      .join(', ');
  }
  return String(value);
}
