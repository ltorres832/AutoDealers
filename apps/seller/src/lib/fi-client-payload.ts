import type { FIClient } from '@autodealers/crm';
import { normalizeSsn, resolveFullSsn } from '@autodealers/core/fi-ssn';
import type { FIAdvancedClientFormData } from '@/components/FIAdvancedClientForm';

export function splitFullName(full: string): { firstName: string; lastName: string } {
  const t = full.trim();
  if (!t) return { firstName: '', lastName: '' };
  const i = t.indexOf(' ');
  if (i === -1) return { firstName: t, lastName: '' };
  return { firstName: t.slice(0, i).trim(), lastName: t.slice(i + 1).trim() };
}

function parseIdentification(client: FIClient): {
  identificationType: string;
  identificationNumber: string;
} {
  if (client.identificationType) {
    const raw = client.identification || '';
    const number = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : raw;
    return { identificationType: client.identificationType, identificationNumber: number };
  }
  if (client.identification?.includes(':')) {
    const [type, ...rest] = client.identification.split(':');
    return { identificationType: type.trim(), identificationNumber: rest.join(':').trim() };
  }
  return { identificationType: '', identificationNumber: client.identification || '' };
}

export function fiClientToFormData(client: FIClient): Partial<FIAdvancedClientFormData> {
  const { firstName, lastName } = splitFullName(client.name);
  const id = parseIdentification(client);
  const trade = client.tradeInDetails;

  return {
    firstName,
    lastName,
    phone: client.phone || '',
    email: client.email || '',
    dateOfBirth: client.dateOfBirth || '',
    ssn: resolveFullSsn(client),
    address: client.address || '',
    city: client.city || '',
    state: client.state || '',
    zipCode: client.zipCode || '',
    yearsAtAddress: client.yearsAtAddress ?? 0,
    vehicleId: client.vehicleId,
    vehicleMake: client.vehicleMake || '',
    vehicleModel: client.vehicleModel || '',
    vehicleYear: client.vehicleYear != null ? String(client.vehicleYear) : '',
    vehiclePrice: client.vehiclePrice ?? 0,
    downPayment: client.downPayment ?? 0,
    hasTradeIn: !!client.hasTradeIn,
    tradeInMake: trade?.make || '',
    tradeInModel: trade?.model || '',
    tradeInYear: trade?.year != null ? String(trade.year) : '',
    tradeInValue: trade?.estimatedValue ?? 0,
    tradeInVin: trade?.vin || '',
    tradeInMileage: trade?.mileage != null ? String(trade.mileage) : '',
    tradeInColor: trade?.color || '',
    tradeInPayoff: trade?.payoffBalance != null ? String(trade.payoffBalance) : '',
    tradeInLienholder: trade?.lienholder || '',
    tradeInTitleStatus: (trade?.titleStatus as FIAdvancedClientFormData['tradeInTitleStatus']) || '',
    tradeInAccidentHistory: trade?.accidentHistory || '',
    tradeInNotes: trade?.notes || '',
    identificationType: id.identificationType,
    identificationNumber: id.identificationNumber,
  };
}

function parseOptionalInt(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalFloat(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : undefined;
}

function buildAddressLine(fd: FIAdvancedClientFormData): string | undefined {
  const parts = [fd.address, fd.city, fd.state, fd.zipCode].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

function buildTradeInDetails(fd: FIAdvancedClientFormData) {
  if (!fd.hasTradeIn) return undefined;
  return {
    make: fd.tradeInMake || undefined,
    model: fd.tradeInModel || undefined,
    year: fd.tradeInYear.trim() ? parseOptionalInt(fd.tradeInYear) : undefined,
    estimatedValue: fd.tradeInValue > 0 ? fd.tradeInValue : undefined,
    vin: fd.tradeInVin || undefined,
    mileage: fd.tradeInMileage.trim() ? parseOptionalInt(fd.tradeInMileage) : undefined,
    color: fd.tradeInColor || undefined,
    payoffBalance: fd.tradeInPayoff.trim() ? parseOptionalFloat(fd.tradeInPayoff) : undefined,
    lienholder: fd.tradeInLienholder || undefined,
    titleStatus: fd.tradeInTitleStatus || undefined,
    accidentHistory: fd.tradeInAccidentHistory || undefined,
    notes: fd.tradeInNotes || undefined,
  };
}

export function formDataToClientUpdates(formData: FIAdvancedClientFormData): Partial<FIClient> {
  const name = `${formData.firstName} ${formData.lastName}`.trim();
  const vehicleYear = formData.vehicleYear.trim()
    ? parseInt(formData.vehicleYear, 10)
    : undefined;

  const identification =
    formData.identificationType && formData.identificationNumber
      ? `${formData.identificationType}: ${formData.identificationNumber}`
      : formData.identificationNumber || undefined;

  return {
    name,
    phone: formData.phone,
    email: formData.email || undefined,
    address: buildAddressLine(formData),
    identification,
    identificationType: formData.identificationType || undefined,
    dateOfBirth: formData.dateOfBirth || undefined,
    city: formData.city || undefined,
    state: formData.state || undefined,
    zipCode: formData.zipCode || undefined,
    ssn: formData.ssn ? normalizeSsn(formData.ssn) : undefined,
    yearsAtAddress: formData.yearsAtAddress || undefined,
    timeAtAddressMonths: formData.yearsAtAddress ? formData.yearsAtAddress * 12 : undefined,
    vehicleId: formData.vehicleId || undefined,
    vehicleMake: formData.vehicleMake || undefined,
    vehicleModel: formData.vehicleModel || undefined,
    vehicleYear:
      vehicleYear !== undefined && Number.isFinite(vehicleYear) ? vehicleYear : undefined,
    vehiclePrice: formData.vehiclePrice > 0 ? formData.vehiclePrice : undefined,
    downPayment: formData.downPayment >= 0 ? formData.downPayment : undefined,
    hasTradeIn: formData.hasTradeIn,
    tradeInDetails: buildTradeInDetails(formData),
  };
}
