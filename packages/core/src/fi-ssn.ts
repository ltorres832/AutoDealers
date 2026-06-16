/** Utilidades SSN (Social Security Number) para F&I */

export function formatSsnInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function normalizeSsn(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 9) return value.trim();
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function isValidSsn(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 9;
}

export function resolveFullSsn(record: { ssn?: string; ssnLast4?: string }): string {
  if (record.ssn && isValidSsn(record.ssn)) {
    return normalizeSsn(record.ssn);
  }
  return '';
}

export function ssnForPdf(record: { ssn?: string; ssnLast4?: string }): string {
  const full = resolveFullSsn(record);
  if (full) return full;
  if (record.ssnLast4) return `***-**-${record.ssnLast4}`;
  return '—';
}
