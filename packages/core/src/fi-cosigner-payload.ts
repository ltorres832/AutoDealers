/**
 * Construye payload de codeudor (co-signer) para Firestore / PDFs.
 */

import type {
  Cosigner,
  CreditRange,
  FIEmploymentRecord,
  FIOtherIncomeSource,
  FIReference,
} from '@autodealers/crm';
import { formatSsnInput, isValidSsn, normalizeSsn, resolveFullSsn } from './fi-ssn';

export interface CosignerEmploymentInput {
  employer: string;
  position: string;
  employerPhone: string;
  employerAddress: string;
  supervisorName: string;
  monthlyIncome: string;
  timeAtJob: string;
  incomeType: FIEmploymentRecord['incomeType'];
  notes: string;
}

export interface CosignerFormInput {
  name: string;
  phone: string;
  email: string;
  phoneAlternate: string;
  relationship: Cosigner['relationship'];
  dateOfBirth: string;
  ssn: string;
  driversLicense: string;
  identificationType: string;
  identificationNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  primary: CosignerEmploymentInput;
  additionalJobs: CosignerEmploymentInput[];
  previousJob: CosignerEmploymentInput;
  hasPreviousJob: boolean;
  otherIncome: Array<{ source: string; monthlyAmount: string; notes: string }>;
  references: Array<{ name: string; relationship: string; phone: string; yearsKnown: string }>;
  creditRange: CreditRange;
  creditNotes: string;
  monthlyDebtPayments: string;
  bankruptcyHistory: boolean;
  bankruptcyNotes: string;
  maritalStatus: Cosigner['personalInfo']['maritalStatus'];
  dependents: string;
  housing: NonNullable<Cosigner['personalInfo']['housing']>;
  monthlyHousingPayment: string;
  yearsAtAddress: string;
}

function rowToEmployment(row: CosignerEmploymentInput): FIEmploymentRecord {
  return {
    employer: row.employer || undefined,
    position: row.position || undefined,
    employerPhone: row.employerPhone || undefined,
    employerAddress: row.employerAddress || undefined,
    supervisorName: row.supervisorName || undefined,
    monthlyIncome: parseFloat(row.monthlyIncome) || 0,
    timeAtJob: parseInt(row.timeAtJob, 10) || 0,
    incomeType: row.incomeType,
    notes: row.notes || undefined,
  };
}

function employmentToRow(job?: FIEmploymentRecord): CosignerEmploymentInput {
  return {
    employer: job?.employer || '',
    position: job?.position || '',
    employerPhone: job?.employerPhone || '',
    employerAddress: job?.employerAddress || '',
    supervisorName: job?.supervisorName || '',
    monthlyIncome: job?.monthlyIncome != null ? String(job.monthlyIncome) : '',
    timeAtJob: job?.timeAtJob != null ? String(job.timeAtJob) : '',
    incomeType: job?.incomeType || 'salary',
    notes: job?.notes || '',
  };
}

export function emptyCosignerEmploymentRow(): CosignerEmploymentInput {
  return {
    employer: '',
    position: '',
    employerPhone: '',
    employerAddress: '',
    supervisorName: '',
    monthlyIncome: '',
    timeAtJob: '',
    incomeType: 'salary',
    notes: '',
  };
}

export function emptyCosignerFormInput(): CosignerFormInput {
  return {
    name: '',
    phone: '',
    email: '',
    phoneAlternate: '',
    relationship: 'parent',
    dateOfBirth: '',
    ssn: '',
    driversLicense: '',
    identificationType: '',
    identificationNumber: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    primary: emptyCosignerEmploymentRow(),
    additionalJobs: [],
    previousJob: emptyCosignerEmploymentRow(),
    hasPreviousJob: false,
    otherIncome: [],
    references: [],
    creditRange: 'good',
    creditNotes: '',
    monthlyDebtPayments: '',
    bankruptcyHistory: false,
    bankruptcyNotes: '',
    maritalStatus: 'single',
    dependents: '0',
    housing: 'rent',
    monthlyHousingPayment: '',
    yearsAtAddress: '',
  };
}

export function cosignerToFormInput(cosigner: Cosigner): CosignerFormInput {
  const p = cosigner.personalInfo;
  return {
    name: cosigner.name || '',
    phone: cosigner.phone || '',
    email: cosigner.email || '',
    phoneAlternate: cosigner.phoneAlternate || '',
    relationship: cosigner.relationship || 'parent',
    dateOfBirth: cosigner.dateOfBirth || '',
    ssn: resolveFullSsn(cosigner),
    driversLicense: cosigner.driversLicense || '',
    identificationType: cosigner.identificationType || '',
    identificationNumber: p?.identification || '',
    address: p?.address || '',
    city: p?.city || '',
    state: p?.state || '',
    zipCode: p?.zipCode || '',
    primary: employmentToRow(cosigner.employment),
    additionalJobs: (cosigner.additionalEmployments || []).map(employmentToRow),
    previousJob: employmentToRow(cosigner.previousEmployment),
    hasPreviousJob: !!cosigner.previousEmployment,
    otherIncome: (cosigner.otherIncomeSources || []).map((o) => ({
      source: o.source,
      monthlyAmount: String(o.monthlyAmount ?? ''),
      notes: o.notes || '',
    })),
    references: (cosigner.references || []).map((r) => ({
      name: r.name,
      relationship: r.relationship,
      phone: r.phone,
      yearsKnown: r.yearsKnown != null ? String(r.yearsKnown) : '',
    })),
    creditRange: cosigner.creditInfo?.creditRange || 'good',
    creditNotes: cosigner.creditInfo?.notes || '',
    monthlyDebtPayments:
      cosigner.monthlyDebtPayments != null ? String(cosigner.monthlyDebtPayments) : '',
    bankruptcyHistory: !!cosigner.bankruptcyHistory,
    bankruptcyNotes: cosigner.bankruptcyNotes || '',
    maritalStatus: p?.maritalStatus || 'single',
    dependents: String(p?.dependents ?? '0'),
    housing: p?.housing || 'rent',
    monthlyHousingPayment:
      p?.monthlyHousingPayment != null ? String(p.monthlyHousingPayment) : '',
    yearsAtAddress: p?.yearsAtAddress != null ? String(p.yearsAtAddress) : '',
  };
}

export function buildCosignerPayload(
  input: CosignerFormInput
): Omit<Cosigner, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'documents'> {
  if (input.ssn && !isValidSsn(input.ssn)) {
    throw new Error('SSN inválido. Use el formato XXX-XX-XXXX (9 dígitos).');
  }

  const additionalEmployments = input.additionalJobs
    .filter((j) => j.employer || j.monthlyIncome)
    .map(rowToEmployment);

  const otherIncomeSources: FIOtherIncomeSource[] = input.otherIncome
    .filter((o) => o.source && o.monthlyAmount)
    .map((o) => ({
      source: o.source,
      monthlyAmount: parseFloat(o.monthlyAmount) || 0,
      notes: o.notes || undefined,
    }));

  const references: FIReference[] = input.references
    .filter((r) => r.name && r.phone)
    .map((r) => ({
      name: r.name,
      relationship: r.relationship,
      phone: r.phone,
      yearsKnown: r.yearsKnown ? parseInt(r.yearsKnown, 10) : undefined,
    }));

  const fullAddress = [input.address, input.city, input.state, input.zipCode]
    .filter(Boolean)
    .join(', ');

  const normalizedSsn = input.ssn ? normalizeSsn(input.ssn) : undefined;

  return {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    phoneAlternate: input.phoneAlternate || undefined,
    relationship: input.relationship,
    dateOfBirth: input.dateOfBirth || undefined,
    ssn: normalizedSsn,
    driversLicense: input.driversLicense || undefined,
    identificationType: input.identificationType || undefined,
    employment: rowToEmployment(input.primary),
    additionalEmployments: additionalEmployments.length ? additionalEmployments : undefined,
    previousEmployment:
      input.hasPreviousJob && input.previousJob.employer
        ? rowToEmployment(input.previousJob)
        : undefined,
    otherIncomeSources: otherIncomeSources.length ? otherIncomeSources : undefined,
    creditInfo: {
      creditRange: input.creditRange,
      notes: input.creditNotes || undefined,
    },
    personalInfo: {
      maritalStatus: input.maritalStatus,
      address: fullAddress || input.address || undefined,
      city: input.city || undefined,
      state: input.state || undefined,
      zipCode: input.zipCode || undefined,
      identification: input.identificationNumber || undefined,
      dependents: parseInt(input.dependents, 10) || 0,
      housing: input.housing,
      monthlyHousingPayment: input.monthlyHousingPayment
        ? parseFloat(input.monthlyHousingPayment)
        : undefined,
      yearsAtAddress: input.yearsAtAddress ? parseInt(input.yearsAtAddress, 10) : undefined,
    },
    references: references.length ? references : undefined,
    monthlyDebtPayments: input.monthlyDebtPayments
      ? parseFloat(input.monthlyDebtPayments)
      : undefined,
    bankruptcyHistory: input.bankruptcyHistory || undefined,
    bankruptcyNotes: input.bankruptcyNotes || undefined,
  };
}

export { formatSsnInput, isValidSsn, normalizeSsn };
