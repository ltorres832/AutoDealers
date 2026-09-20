// Nómina partner + hiring light (RR.HH. Fase 4)

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

function getDb() {
  return getFirestore();
}

export type PayrollPartnerId = 'adp' | 'paychex' | 'gusto' | 'pr_local' | 'other';

export interface PayrollPartnerConfig {
  tenantId: string;
  partner: PayrollPartnerId;
  enabled: boolean;
  portalUrl?: string;
  companyCode?: string;
  notes?: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface JobOpening {
  id: string;
  tenantId: string;
  title: string;
  department?: string;
  description?: string;
  location?: string;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship';
  salaryRange?: string;
  requirements?: string;
  benefits?: string;
  applyEmail?: string;
  applyPhone?: string;
  applyUrl?: string;
  slots?: number;
  status: 'open' | 'paused' | 'closed';
  createdBy: string;
  lastPublishedAt?: Date | null;
  lastPublishedPlatforms?: ('facebook' | 'instagram' | 'tiktok' | 'youtube')[];
  createdAt: Date;
  updatedAt: Date;
}

export interface JobApplication {
  id: string;
  tenantId: string;
  openingId: string;
  candidateName: string;
  email?: string;
  phone?: string;
  notes?: string;
  status: 'new' | 'reviewing' | 'interview' | 'hired' | 'rejected';
  createdAt: Date;
}

function toDate(v: any): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

const EMPLOYMENT_LABELS: Record<NonNullable<JobOpening['employmentType']>, string> = {
  full_time: 'Tiempo completo',
  part_time: 'Medio tiempo',
  contract: 'Contrato',
  temporary: 'Temporal',
  internship: 'Práctica / Internado',
};

export function employmentTypeLabel(t?: JobOpening['employmentType']): string {
  if (!t) return '';
  return EMPLOYMENT_LABELS[t] || t;
}

function normalizeOpening(id: string, tenantId: string, data: any): JobOpening {
  return {
    id,
    tenantId,
    title: data.title || '',
    department: data.department,
    description: data.description,
    location: data.location,
    employmentType: data.employmentType,
    salaryRange: data.salaryRange,
    requirements: data.requirements,
    benefits: data.benefits,
    applyEmail: data.applyEmail,
    applyPhone: data.applyPhone,
    applyUrl: data.applyUrl,
    slots: data.slots != null ? Number(data.slots) : undefined,
    status: data.status || 'open',
    createdBy: data.createdBy || '',
    lastPublishedAt: toDate(data.lastPublishedAt) || null,
    lastPublishedPlatforms: Array.isArray(data.lastPublishedPlatforms)
      ? data.lastPublishedPlatforms
      : undefined,
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

/** Texto listo para publicar la vacante en redes. */
export function formatJobOpeningSocialPost(
  opening: JobOpening,
  dealerName: string
): { text: string; hashtags: string[] } {
  const lines = [
    `¡Estamos contratando! 🚗💼`,
    '',
    `${dealerName} busca: ${opening.title}`,
    opening.department ? `Departamento: ${opening.department}` : '',
    opening.location ? `Ubicación: ${opening.location}` : '',
    opening.employmentType ? `Tipo: ${employmentTypeLabel(opening.employmentType)}` : '',
    opening.salaryRange ? `Compensación: ${opening.salaryRange}` : '',
    opening.slots && opening.slots > 1 ? `Plazas: ${opening.slots}` : '',
    '',
    opening.description ? opening.description.trim() : '',
    '',
    opening.requirements ? `Requisitos:\n${opening.requirements.trim()}` : '',
    '',
    opening.benefits ? `Beneficios:\n${opening.benefits.trim()}` : '',
    '',
    '¿Te interesa? Aplica:',
    opening.applyEmail ? `📧 ${opening.applyEmail}` : '',
    opening.applyPhone ? `📞 ${opening.applyPhone}` : '',
    opening.applyUrl ? `🔗 ${opening.applyUrl}` : '',
    !opening.applyEmail && !opening.applyPhone && !opening.applyUrl
      ? 'Envíanos mensaje o visita el concesionario.'
      : '',
  ].filter((l) => l !== undefined && l !== null) as string[];

  // Compact empty double blanks
  const text = lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const hashtags = [
    'Empleo',
    'Vacante',
    'AutoDealers',
    'PuertoRico',
    ...(opening.department ? [opening.department.replace(/\s+/g, '')] : []),
  ];

  return { text, hashtags };
}

export async function getPayrollPartnerConfig(tenantId: string): Promise<PayrollPartnerConfig> {
  const doc = await getDb().collection('payroll_partner_config').doc(tenantId).get();
  if (!doc.exists) {
    return {
      tenantId,
      partner: 'other',
      enabled: false,
    };
  }
  const data = doc.data() || {};
  return {
    tenantId,
    partner: data.partner || 'other',
    enabled: data.enabled === true,
    portalUrl: data.portalUrl,
    companyCode: data.companyCode,
    notes: data.notes,
    updatedAt: toDate(data.updatedAt),
    updatedBy: data.updatedBy,
  };
}

export async function savePayrollPartnerConfig(
  tenantId: string,
  patch: Partial<PayrollPartnerConfig>,
  updatedBy?: string
): Promise<PayrollPartnerConfig> {
  const current = await getPayrollPartnerConfig(tenantId);
  const next: PayrollPartnerConfig = {
    ...current,
    ...patch,
    tenantId,
    updatedAt: new Date(),
    updatedBy,
  };
  await getDb()
    .collection('payroll_partner_config')
    .doc(tenantId)
    .set(JSON.parse(JSON.stringify(next)), { merge: true });
  return next;
}

export async function createJobOpening(input: {
  tenantId: string;
  title: string;
  department?: string;
  description?: string;
  location?: string;
  employmentType?: JobOpening['employmentType'];
  salaryRange?: string;
  requirements?: string;
  benefits?: string;
  applyEmail?: string;
  applyPhone?: string;
  applyUrl?: string;
  slots?: number;
  createdBy: string;
}): Promise<JobOpening> {
  if (!input.title?.trim()) throw new Error('Título requerido');
  const ref = getDb().collection('tenants').doc(input.tenantId).collection('hr_job_openings').doc();
  const row: JobOpening = {
    id: ref.id,
    tenantId: input.tenantId,
    title: input.title.trim(),
    department: input.department?.trim() || undefined,
    description: input.description?.trim() || undefined,
    location: input.location?.trim() || undefined,
    employmentType: input.employmentType,
    salaryRange: input.salaryRange?.trim() || undefined,
    requirements: input.requirements?.trim() || undefined,
    benefits: input.benefits?.trim() || undefined,
    applyEmail: input.applyEmail?.trim() || undefined,
    applyPhone: input.applyPhone?.trim() || undefined,
    applyUrl: input.applyUrl?.trim() || undefined,
    slots: input.slots != null && Number(input.slots) > 0 ? Number(input.slots) : undefined,
    status: 'open',
    createdBy: input.createdBy,
    lastPublishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await ref.set({
    ...row,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });
  return row;
}

export async function getJobOpening(
  tenantId: string,
  id: string
): Promise<JobOpening | null> {
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('hr_job_openings')
    .doc(id)
    .get();
  if (!snap.exists) return null;
  return normalizeOpening(snap.id, tenantId, snap.data());
}

export async function listJobOpenings(tenantId: string): Promise<JobOpening[]> {
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('hr_job_openings')
    .limit(100)
    .get();
  const rows = snap.docs.map((d) => normalizeOpening(d.id, tenantId, d.data()));
  rows.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
  return rows;
}

export async function updateJobOpening(
  tenantId: string,
  id: string,
  patch: Partial<
    Pick<
      JobOpening,
      | 'title'
      | 'department'
      | 'description'
      | 'location'
      | 'employmentType'
      | 'salaryRange'
      | 'requirements'
      | 'benefits'
      | 'applyEmail'
      | 'applyPhone'
      | 'applyUrl'
      | 'slots'
      | 'status'
    >
  >
): Promise<JobOpening> {
  const current = await getJobOpening(tenantId, id);
  if (!current) throw new Error('Vacante no encontrada');
  const next = {
    ...patch,
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  };
  if (patch.title != null && !String(patch.title).trim()) {
    throw new Error('Título requerido');
  }
  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('hr_job_openings')
    .doc(id)
    .set(next, { merge: true });
  return (await getJobOpening(tenantId, id))!;
}

export async function updateJobOpeningStatus(
  tenantId: string,
  id: string,
  status: JobOpening['status']
): Promise<void> {
  await updateJobOpening(tenantId, id, { status });
}

export async function markJobOpeningPublished(
  tenantId: string,
  id: string,
  platforms: ('facebook' | 'instagram' | 'tiktok' | 'youtube')[]
): Promise<void> {
  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('hr_job_openings')
    .doc(id)
    .set(
      {
        lastPublishedAt: getFirestoreFieldValue().serverTimestamp(),
        lastPublishedPlatforms: platforms,
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      },
      { merge: true }
    );
}

export async function createJobApplication(input: {
  tenantId: string;
  openingId: string;
  candidateName: string;
  email?: string;
  phone?: string;
  notes?: string;
}): Promise<JobApplication> {
  if (!input.candidateName?.trim()) throw new Error('Nombre del candidato requerido');
  const ref = getDb()
    .collection('tenants')
    .doc(input.tenantId)
    .collection('hr_job_applications')
    .doc();
  const row: JobApplication = {
    id: ref.id,
    tenantId: input.tenantId,
    openingId: input.openingId,
    candidateName: input.candidateName.trim(),
    email: input.email,
    phone: input.phone,
    notes: input.notes,
    status: 'new',
    createdAt: new Date(),
  };
  await ref.set({
    ...row,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
  });
  return row;
}

export async function listJobApplications(
  tenantId: string,
  openingId?: string
): Promise<JobApplication[]> {
  let q: any = getDb().collection('tenants').doc(tenantId).collection('hr_job_applications');
  if (openingId) q = q.where('openingId', '==', openingId);
  const snap = await q.limit(100).get();
  return snap.docs.map((d: any) => {
    const data = d.data();
    return {
      id: d.id,
      tenantId,
      openingId: data.openingId,
      candidateName: data.candidateName,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      status: data.status || 'new',
      createdAt: toDate(data.createdAt) || new Date(),
    } as JobApplication;
  });
}

export async function updateApplicationStatus(
  tenantId: string,
  id: string,
  status: JobApplication['status']
): Promise<void> {
  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('hr_job_applications')
    .doc(id)
    .set({ status }, { merge: true });
}
