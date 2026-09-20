// RR.HH.: expediente empleado, asistencia, onboarding (vacaciones en compensation.ts)

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

function getDb() {
  return getFirestore();
}

function empCol(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId).collection('hr_employees');
}

export interface HrEmployee {
  id: string;
  tenantId: string;
  userId: string;
  displayName: string;
  email?: string;
  phone?: string;
  departmentTemplate?: string;
  jobTitle?: string;
  hireDate?: string;
  status: 'active' | 'inactive' | 'terminated';
  emergencyContact?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn?: string; // HH:mm
  clockOut?: string;
  status: 'present' | 'absent' | 'late' | 'remote' | 'leave';
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

export interface OnboardingChecklist {
  id: string;
  tenantId: string;
  userId: string;
  items: Array<{ id: string; label: string; done: boolean; doneAt?: Date | null }>;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_ONBOARDING = [
  'Contrato firmado',
  'Documentos de identidad',
  'Acceso al portal',
  'Capacitación de producto',
  'Asignación de departamento / permisos',
];

function toDate(v: any): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function upsertEmployeeFromUser(input: {
  tenantId: string;
  userId: string;
  displayName: string;
  email?: string;
  phone?: string;
  departmentTemplate?: string;
}): Promise<HrEmployee> {
  const existing = await empCol(input.tenantId).where('userId', '==', input.userId).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.set(
      {
        displayName: input.displayName,
        email: input.email || null,
        phone: input.phone || null,
        departmentTemplate: input.departmentTemplate || null,
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      },
      { merge: true }
    );
    const data = (await doc.ref.get()).data()!;
    return {
      id: doc.id,
      tenantId: input.tenantId,
      userId: input.userId,
      displayName: data.displayName,
      email: data.email,
      phone: data.phone,
      departmentTemplate: data.departmentTemplate,
      jobTitle: data.jobTitle,
      hireDate: data.hireDate,
      status: data.status || 'active',
      emergencyContact: data.emergencyContact,
      notes: data.notes,
      createdAt: toDate(data.createdAt) || new Date(),
      updatedAt: new Date(),
    };
  }

  const ref = empCol(input.tenantId).doc();
  const row: HrEmployee = {
    id: ref.id,
    tenantId: input.tenantId,
    userId: input.userId,
    displayName: input.displayName,
    email: input.email,
    phone: input.phone,
    departmentTemplate: input.departmentTemplate,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await ref.set({
    ...row,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });
  await ensureOnboardingChecklist(input.tenantId, input.userId);
  return row;
}

export async function listEmployees(tenantId: string): Promise<HrEmployee[]> {
  const snap = await empCol(tenantId).limit(200).get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      tenantId,
      userId: data.userId,
      displayName: data.displayName || '',
      email: data.email,
      phone: data.phone,
      departmentTemplate: data.departmentTemplate,
      jobTitle: data.jobTitle,
      hireDate: data.hireDate,
      status: data.status || 'active',
      emergencyContact: data.emergencyContact,
      notes: data.notes,
      createdAt: toDate(data.createdAt) || new Date(),
      updatedAt: toDate(data.updatedAt) || new Date(),
    } as HrEmployee;
  });
}

export async function updateEmployee(
  tenantId: string,
  employeeId: string,
  patch: Partial<HrEmployee>
): Promise<void> {
  const { id: _i, tenantId: _t, createdAt: _c, ...rest } = patch as any;
  await empCol(tenantId)
    .doc(employeeId)
    .set({ ...rest, updatedAt: getFirestoreFieldValue().serverTimestamp() }, { merge: true });
}

export async function recordAttendance(input: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord> {
  const ref = getDb()
    .collection('tenants')
    .doc(input.tenantId)
    .collection('hr_attendance')
    .doc();
  const row: AttendanceRecord = { ...input, id: ref.id, createdAt: new Date() };
  await ref.set({
    ...row,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
  });
  return row;
}

export async function listAttendance(
  tenantId: string,
  opts?: { userId?: string; from?: string; to?: string; limit?: number }
): Promise<AttendanceRecord[]> {
  let q: any = getDb().collection('tenants').doc(tenantId).collection('hr_attendance');
  if (opts?.userId) q = q.where('userId', '==', opts.userId);
  const snap = await q.limit(opts?.limit || 200).get();
  let rows = snap.docs.map((d: any) => {
    const data = d.data();
    return {
      id: d.id,
      tenantId,
      userId: data.userId,
      date: data.date,
      clockIn: data.clockIn,
      clockOut: data.clockOut,
      status: data.status || 'present',
      notes: data.notes,
      createdBy: data.createdBy || '',
      createdAt: toDate(data.createdAt) || new Date(),
    } as AttendanceRecord;
  });
  if (opts?.from) rows = rows.filter((r: AttendanceRecord) => r.date >= opts.from!);
  if (opts?.to) rows = rows.filter((r: AttendanceRecord) => r.date <= opts.to!);
  rows.sort((a: AttendanceRecord, b: AttendanceRecord) => b.date.localeCompare(a.date));
  return rows;
}

export async function ensureOnboardingChecklist(
  tenantId: string,
  userId: string
): Promise<OnboardingChecklist> {
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('hr_onboarding')
    .where('userId', '==', userId)
    .limit(1)
    .get();
  if (!snap.empty) {
    const d = snap.docs[0];
    const data = d.data();
    return {
      id: d.id,
      tenantId,
      userId,
      items: data.items || [],
      createdAt: toDate(data.createdAt) || new Date(),
      updatedAt: toDate(data.updatedAt) || new Date(),
    };
  }
  const ref = getDb().collection('tenants').doc(tenantId).collection('hr_onboarding').doc();
  const items = DEFAULT_ONBOARDING.map((label, i) => ({
    id: `item_${i + 1}`,
    label,
    done: false,
    doneAt: null,
  }));
  const row: OnboardingChecklist = {
    id: ref.id,
    tenantId,
    userId,
    items,
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

export async function updateOnboardingItem(
  tenantId: string,
  userId: string,
  itemId: string,
  done: boolean
): Promise<OnboardingChecklist> {
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('hr_onboarding')
    .where('userId', '==', userId)
    .limit(1)
    .get();
  let checklist = snap.empty ? await ensureOnboardingChecklist(tenantId, userId) : null;
  const ref = snap.empty
    ? getDb().collection('tenants').doc(tenantId).collection('hr_onboarding').doc(checklist!.id)
    : snap.docs[0].ref;
  if (!checklist) {
    const data = snap.docs[0].data();
    checklist = {
      id: snap.docs[0].id,
      tenantId,
      userId,
      items: data.items || [],
      createdAt: toDate(data.createdAt) || new Date(),
      updatedAt: toDate(data.updatedAt) || new Date(),
    };
  }
  checklist.items = checklist.items.map((it) =>
    it.id === itemId
      ? { ...it, done, doneAt: done ? new Date() : null }
      : it
  );
  await ref.set(
    {
      items: checklist.items,
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    },
    { merge: true }
  );
  return checklist;
}
