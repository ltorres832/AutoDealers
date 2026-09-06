/**
 * Acceso temporal de empleados de ventas a UNA cuenta específica de cliente.
 * Colecciones: staff_access_grants, staff_access_requests
 */

import { randomBytes } from 'crypto';
import { getFirestore } from './firebase';
import { getAdminUser } from './admin-users-management';
import { hasPermission, type AdminUser } from './admin-permissions';
import { getSalesEmployee } from './sales-employees';

export type StaffAccessStatus = 'pending' | 'active' | 'expired' | 'revoked' | 'denied';

export interface StaffAccessTarget {
  targetAccountId?: string;
  targetTenantId: string;
  targetUserId?: string;
  targetAccountLabel?: string;
}

export interface StaffAccessGrant extends StaffAccessTarget {
  id: string;
  salesEmployeeId: string;
  employeeUserId: string;
  employeeEmail: string;
  employeeName: string;
  grantedByAdminId: string;
  grantedByEmail: string;
  startsAt: Date;
  expiresAt: Date;
  durationMinutes: number;
  status: StaffAccessStatus;
  reason?: string;
  requestId?: string;
  appointmentId?: string;
  createdAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
}

export interface StaffAccessRequest extends StaffAccessTarget {
  id: string;
  salesEmployeeId: string;
  employeeUserId: string;
  employeeEmail: string;
  employeeName: string;
  requestedMinutes: number;
  preferredStartAt?: Date;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  grantId?: string;
  denyReason?: string;
  appointmentId?: string;
}

function grantsRef() {
  return getFirestore().collection('staff_access_grants');
}

function requestsRef() {
  return getFirestore().collection('staff_access_requests');
}

function toDate(value: unknown): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(value as string | number);
}

function employeeKey(data: Record<string, unknown>): string {
  return String(data.salesEmployeeId || data.employeeUserId || '');
}

function mapTarget(data: Record<string, unknown>): StaffAccessTarget {
  return {
    targetAccountId: data.targetAccountId ? String(data.targetAccountId) : undefined,
    targetTenantId: String(data.targetTenantId || ''),
    targetUserId: data.targetUserId ? String(data.targetUserId) : undefined,
    targetAccountLabel: data.targetAccountLabel ? String(data.targetAccountLabel) : undefined,
  };
}

function mapGrant(id: string, data: Record<string, unknown>): StaffAccessGrant {
  const salesEmployeeId = employeeKey(data);
  return {
    id,
    salesEmployeeId,
    employeeUserId: salesEmployeeId,
    employeeEmail: String(data.employeeEmail || ''),
    employeeName: String(data.employeeName || ''),
    grantedByAdminId: String(data.grantedByAdminId || ''),
    grantedByEmail: String(data.grantedByEmail || ''),
    startsAt: toDate(data.startsAt),
    expiresAt: toDate(data.expiresAt),
    durationMinutes: Number(data.durationMinutes || 0),
    status: (data.status as StaffAccessStatus) || 'active',
    reason: data.reason ? String(data.reason) : undefined,
    requestId: data.requestId ? String(data.requestId) : undefined,
    appointmentId: data.appointmentId ? String(data.appointmentId) : undefined,
    createdAt: toDate(data.createdAt),
    revokedAt: data.revokedAt ? toDate(data.revokedAt) : undefined,
    revokedBy: data.revokedBy ? String(data.revokedBy) : undefined,
    ...mapTarget(data),
  };
}

function mapRequest(id: string, data: Record<string, unknown>): StaffAccessRequest {
  const salesEmployeeId = employeeKey(data);
  return {
    id,
    salesEmployeeId,
    employeeUserId: salesEmployeeId,
    employeeEmail: String(data.employeeEmail || ''),
    employeeName: String(data.employeeName || ''),
    requestedMinutes: Number(data.requestedMinutes || 60),
    preferredStartAt: data.preferredStartAt ? toDate(data.preferredStartAt) : undefined,
    reason: String(data.reason || ''),
    status: (data.status as StaffAccessRequest['status']) || 'pending',
    createdAt: toDate(data.createdAt),
    resolvedAt: data.resolvedAt ? toDate(data.resolvedAt) : undefined,
    resolvedBy: data.resolvedBy ? String(data.resolvedBy) : undefined,
    grantId: data.grantId ? String(data.grantId) : undefined,
    denyReason: data.denyReason ? String(data.denyReason) : undefined,
    appointmentId: data.appointmentId ? String(data.appointmentId) : undefined,
    ...mapTarget(data),
  };
}

/** ¿El grant cubre esta cuenta? */
export function grantMatchesAccount(
  grant: StaffAccessGrant,
  target: { tenantId?: string; userId?: string; accountId?: string }
): boolean {
  if (!grant.targetTenantId && !grant.targetUserId && !grant.targetAccountId) {
    // Grants viejos sin cuenta: no válidos para entrar
    return false;
  }
  if (target.accountId && grant.targetAccountId && grant.targetAccountId === target.accountId) {
    return true;
  }
  if (target.tenantId && grant.targetTenantId && grant.targetTenantId === target.tenantId) {
    return true;
  }
  if (target.userId && grant.targetUserId && grant.targetUserId === target.userId) {
    return true;
  }
  return false;
}

export function hasPermanentStaffConfigAccess(admin: AdminUser | null | undefined): boolean {
  if (!admin || !admin.isActive) return false;
  if (admin.role === 'super_admin' || admin.role === 'admin') return true;
  if (hasPermission(admin, 'super_admin')) return true;
  return false;
}

export async function expireStaleStaffGrants(salesEmployeeId?: string): Promise<void> {
  const now = new Date();
  const snap = await grantsRef().where('status', '==', 'active').limit(150).get();
  const batch = getFirestore().batch();
  let ops = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (salesEmployeeId && employeeKey(data) !== salesEmployeeId) continue;
    const expiresAt = toDate(data.expiresAt);
    if (expiresAt.getTime() <= now.getTime()) {
      batch.update(doc.ref, { status: 'expired' });
      ops += 1;
    }
  }
  if (ops > 0) await batch.commit();
}

export async function listActiveStaffAccessGrants(
  salesEmployeeId: string
): Promise<StaffAccessGrant[]> {
  await expireStaleStaffGrants(salesEmployeeId);
  const now = new Date();
  const snap = await grantsRef().where('status', '==', 'active').limit(100).get();
  return snap.docs
    .map((d) => mapGrant(d.id, d.data() as Record<string, unknown>))
    .filter(
      (g) =>
        g.salesEmployeeId === salesEmployeeId &&
        g.startsAt.getTime() <= now.getTime() &&
        g.expiresAt.getTime() > now.getTime() &&
        !!g.targetTenantId
    );
}

export async function getActiveStaffAccessGrant(
  salesEmployeeId: string,
  target?: { tenantId?: string; userId?: string; accountId?: string }
): Promise<StaffAccessGrant | null> {
  const active = await listActiveStaffAccessGrants(salesEmployeeId);
  if (!target) return active[0] || null;
  return active.find((g) => grantMatchesAccount(g, target)) || null;
}

export async function assertAdminCanConfigureAccounts(adminUserId: string): Promise<{
  mode: 'permanent';
  admin: AdminUser;
}> {
  const admin = await getAdminUser(adminUserId);
  if (!admin || !admin.isActive) {
    throw new Error('Usuario admin no encontrado o inactivo');
  }
  if (!hasPermanentStaffConfigAccess(admin)) {
    throw new Error('Solo admin/super_admin pueden usar soporte permanente');
  }
  return { mode: 'permanent', admin };
}

/**
 * Empleado solo entra si tiene grant activo para ESA cuenta.
 */
export async function assertSalesEmployeeCanConfigureAccounts(
  salesEmployeeId: string,
  target: { tenantId?: string; userId?: string; accountId?: string }
): Promise<{ mode: 'temporary'; grant: StaffAccessGrant }> {
  const employee = await getSalesEmployee(salesEmployeeId);
  if (!employee || employee.status !== 'active') {
    throw new Error('Empleado de ventas no encontrado o inactivo');
  }
  if (!target.tenantId && !target.userId && !target.accountId) {
    throw new Error('Indica la cuenta (tenantId / userId) a la que quieres entrar');
  }
  const grant = await getActiveStaffAccessGrant(salesEmployeeId, target);
  if (!grant) {
    throw new Error(
      'No tienes acceso activo a esta cuenta. El admin debe otorgarlo para esta cuenta específica.'
    );
  }
  return { mode: 'temporary', grant };
}

/** @deprecated */
export async function assertStaffCanConfigureAccounts(adminUserId: string) {
  return assertAdminCanConfigureAccounts(adminUserId);
}

export async function createStaffAccessGrant(input: {
  salesEmployeeId: string;
  grantedByAdminId: string;
  grantedByEmail: string;
  startsAt: Date;
  durationMinutes: number;
  targetTenantId: string;
  targetUserId?: string;
  targetAccountId?: string;
  targetAccountLabel?: string;
  reason?: string;
  requestId?: string;
  appointmentId?: string;
}): Promise<StaffAccessGrant> {
  const employee = await getSalesEmployee(input.salesEmployeeId);
  if (!employee) throw new Error('Empleado de ventas no encontrado');
  if (employee.status !== 'active') throw new Error('El empleado está inactivo');

  const targetTenantId = String(input.targetTenantId || '').trim();
  if (!targetTenantId) {
    throw new Error('Debes indicar la cuenta (tenantId) a la que se otorga el acceso');
  }

  const durationMinutes = Math.max(15, Math.min(24 * 60, Math.floor(input.durationMinutes)));
  const startsAt = input.startsAt;
  const expiresAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
  const id = randomBytes(12).toString('hex');
  const now = new Date();

  const existing = await grantsRef().where('status', '==', 'active').get();
  const batch = getFirestore().batch();
  for (const doc of existing.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (employeeKey(data) !== employee.id) continue;
    const sameAccount =
      String(data.targetTenantId || '') === targetTenantId ||
      (input.targetAccountId && String(data.targetAccountId || '') === input.targetAccountId);
    if (sameAccount) {
      batch.update(doc.ref, {
        status: 'revoked',
        revokedAt: now,
        revokedBy: input.grantedByAdminId,
      });
    }
  }

  const grant: StaffAccessGrant = {
    id,
    salesEmployeeId: employee.id,
    employeeUserId: employee.id,
    employeeEmail: employee.email,
    employeeName: employee.name,
    grantedByAdminId: input.grantedByAdminId,
    grantedByEmail: input.grantedByEmail,
    startsAt,
    expiresAt,
    durationMinutes,
    status: 'active',
    reason: input.reason?.trim() || undefined,
    requestId: input.requestId,
    appointmentId: input.appointmentId,
    createdAt: now,
    targetTenantId,
    targetUserId: input.targetUserId?.trim() || undefined,
    targetAccountId: input.targetAccountId?.trim() || undefined,
    targetAccountLabel: input.targetAccountLabel?.trim() || undefined,
  };

  batch.set(grantsRef().doc(id), JSON.parse(JSON.stringify(grant)));
  await batch.commit();

  try {
    await getFirestore().collection('audit_logs').add({
      type: 'staff_access_granted',
      grantId: id,
      salesEmployeeId: employee.id,
      targetTenantId,
      targetAccountId: grant.targetAccountId || null,
      grantedByAdminId: input.grantedByAdminId,
      startsAt,
      expiresAt,
      durationMinutes,
      createdAt: now,
    });
  } catch {
    /* no bloquear */
  }

  return grant;
}

export async function revokeStaffAccessGrant(grantId: string, revokedBy: string): Promise<void> {
  await grantsRef()
    .doc(grantId)
    .set({ status: 'revoked', revokedAt: new Date(), revokedBy }, { merge: true });
}

export async function listStaffAccessGrants(limit = 80): Promise<StaffAccessGrant[]> {
  await expireStaleStaffGrants();
  const snap = await grantsRef().limit(Math.min(200, limit * 2)).get();
  const items = snap.docs.map((d) => mapGrant(d.id, d.data() as Record<string, unknown>));
  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return items.slice(0, limit);
}

export async function createStaffAccessRequest(input: {
  salesEmployeeId: string;
  requestedMinutes: number;
  preferredStartAt?: Date;
  reason: string;
  targetTenantId: string;
  targetUserId?: string;
  targetAccountId?: string;
  targetAccountLabel?: string;
  appointmentId?: string;
}): Promise<StaffAccessRequest> {
  const employee = await getSalesEmployee(input.salesEmployeeId);
  if (!employee) throw new Error('Empleado no encontrado');
  if (employee.status !== 'active') throw new Error('Empleado inactivo');

  const targetTenantId = String(input.targetTenantId || '').trim();
  if (!targetTenantId) {
    throw new Error('La solicitud debe indicar la cuenta (tenantId)');
  }

  const pendingSnap = await requestsRef().where('status', '==', 'pending').limit(80).get();
  const hasPendingSame = pendingSnap.docs.some((d) => {
    const data = d.data() as Record<string, unknown>;
    return (
      employeeKey(data) === employee.id && String(data.targetTenantId || '') === targetTenantId
    );
  });
  if (hasPendingSame) {
    throw new Error('Ya tienes una solicitud pendiente para esta cuenta.');
  }

  const id = randomBytes(12).toString('hex');
  const now = new Date();
  const req: StaffAccessRequest = {
    id,
    salesEmployeeId: employee.id,
    employeeUserId: employee.id,
    employeeEmail: employee.email,
    employeeName: employee.name,
    requestedMinutes: Math.max(15, Math.min(24 * 60, Math.floor(input.requestedMinutes || 60))),
    preferredStartAt: input.preferredStartAt,
    reason: String(input.reason || '').trim() || 'Configuración de cuenta',
    status: 'pending',
    createdAt: now,
    appointmentId: input.appointmentId,
    targetTenantId,
    targetUserId: input.targetUserId?.trim() || undefined,
    targetAccountId: input.targetAccountId?.trim() || undefined,
    targetAccountLabel: input.targetAccountLabel?.trim() || undefined,
  };

  await requestsRef().doc(id).set(JSON.parse(JSON.stringify(req)));
  return req;
}

export async function listStaffAccessRequests(
  status?: StaffAccessRequest['status'],
  limit = 80
): Promise<StaffAccessRequest[]> {
  const snap = status
    ? await requestsRef().where('status', '==', status).limit(Math.min(200, limit * 2)).get()
    : await requestsRef().limit(Math.min(200, limit * 2)).get();
  const items = snap.docs.map((d) => mapRequest(d.id, d.data() as Record<string, unknown>));
  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return items.slice(0, limit);
}

export async function listStaffAccessRequestsForEmployee(
  salesEmployeeId: string,
  limit = 30
): Promise<StaffAccessRequest[]> {
  const all = await listStaffAccessRequests(undefined, 150);
  return all.filter((r) => r.salesEmployeeId === salesEmployeeId).slice(0, limit);
}

export async function approveStaffAccessRequest(input: {
  requestId: string;
  approvedByAdminId: string;
  approvedByEmail: string;
  startsAt: Date;
  durationMinutes: number;
  targetTenantId?: string;
  targetUserId?: string;
  targetAccountId?: string;
  targetAccountLabel?: string;
}): Promise<{ request: StaffAccessRequest; grant: StaffAccessGrant }> {
  const doc = await requestsRef().doc(input.requestId).get();
  if (!doc.exists) throw new Error('Solicitud no encontrada');
  const request = mapRequest(doc.id, doc.data() as Record<string, unknown>);
  if (request.status !== 'pending') throw new Error('La solicitud ya fue resuelta');

  const targetTenantId = String(input.targetTenantId || request.targetTenantId || '').trim();
  if (!targetTenantId) {
    throw new Error('Debes indicar la cuenta específica al aprobar');
  }

  const grant = await createStaffAccessGrant({
    salesEmployeeId: request.salesEmployeeId,
    grantedByAdminId: input.approvedByAdminId,
    grantedByEmail: input.approvedByEmail,
    startsAt: input.startsAt,
    durationMinutes: input.durationMinutes || request.requestedMinutes,
    reason: request.reason,
    requestId: request.id,
    appointmentId: request.appointmentId,
    targetTenantId,
    targetUserId: input.targetUserId || request.targetUserId,
    targetAccountId: input.targetAccountId || request.targetAccountId,
    targetAccountLabel: input.targetAccountLabel || request.targetAccountLabel,
  });

  const now = new Date();
  await requestsRef().doc(request.id).set(
    {
      status: 'approved',
      resolvedAt: now,
      resolvedBy: input.approvedByAdminId,
      grantId: grant.id,
      targetTenantId,
      targetUserId: grant.targetUserId || null,
      targetAccountId: grant.targetAccountId || null,
      targetAccountLabel: grant.targetAccountLabel || null,
    },
    { merge: true }
  );

  return {
    request: {
      ...request,
      status: 'approved',
      resolvedAt: now,
      grantId: grant.id,
      targetTenantId,
      targetUserId: grant.targetUserId,
      targetAccountId: grant.targetAccountId,
      targetAccountLabel: grant.targetAccountLabel,
    },
    grant,
  };
}

export async function denyStaffAccessRequest(input: {
  requestId: string;
  deniedByAdminId: string;
  denyReason?: string;
}): Promise<void> {
  const doc = await requestsRef().doc(input.requestId).get();
  if (!doc.exists) throw new Error('Solicitud no encontrada');
  const request = mapRequest(doc.id, doc.data() as Record<string, unknown>);
  if (request.status !== 'pending') throw new Error('La solicitud ya fue resuelta');

  await requestsRef().doc(input.requestId).set(
    {
      status: 'denied',
      resolvedAt: new Date(),
      resolvedBy: input.deniedByAdminId,
      denyReason: input.denyReason?.trim() || undefined,
    },
    { merge: true }
  );
}
